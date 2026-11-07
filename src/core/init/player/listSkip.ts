import BackgroundTimer from 'react-native-background-timer'
import { getDuration, getPosition, setCurrentTime } from '@/plugins/player'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { log } from '@/utils/log'
import { getSkipMusicKey } from '@/utils/skipMusicKey'

// Separate from UI progress polling so screen-off playback still skips.
export default () => {
  let timer: number | null = null
  let generation = 0
  let busy = false
  let introHandled = false
  let outroHandled = false
  let previousPosition = 0
  const reset = () => {
    generation++
    introHandled = false
    outroHandled = false
    previousPosition = 0
  }
  const stop = () => {
    if (timer != null) BackgroundTimer.clearInterval(timer)
    timer = null
    generation++
  }
  const tick = async() => {
    if (busy || !playerState.isPlay) return
    const info = playerState.playMusicInfo
    const songRule = settingState.setting['player.songSkip'][getSkipMusicKey(info.musicInfo)]
    const rule = songRule?.enabled ? songRule : info.listId && !info.isTempPlay ? settingState.setting['player.listSkip'][info.listId] : undefined
    if (!rule || (!rule.intro && !rule.outro)) return
    const token = generation
    busy = true
    try {
      const [position, duration] = await Promise.all([getPosition(), getDuration()])
      if (token !== generation || info !== playerState.playMusicInfo || !playerState.isPlay) return
      if (!Number.isFinite(duration) || !Number.isFinite(position) || duration <= rule.intro + rule.outro + 1) return
      // A new pass through a single-track loop can reuse the same song identity.
      if (outroHandled && position < previousPosition - 1) {
        introHandled = false
        outroHandled = false
      }
      previousPosition = position
      if (!introHandled) {
        introHandled = true
        if (rule.intro > 0 && position < rule.intro) {
          await setCurrentTime(rule.intro)
          return
        }
      }
      if (!outroHandled && rule.outro > 0 && position >= duration - rule.outro) {
        outroHandled = true
        // Let the native end event retain repeat mode and sleep-timer behavior.
        await setCurrentTime(duration)
      }
    } catch (error) {
      log.warn(`List skip failed: ${String(error)}`)
    } finally {
      // Only this invocation owns the lock; other ticks return while busy.
      // eslint-disable-next-line require-atomic-updates
      busy = false
    }
  }
  const start = () => {
    stop()
    timer = BackgroundTimer.setInterval(() => { void tick() }, 250)
    void tick()
  }
  global.app_event.on('play', start)
  global.app_event.on('pause', stop)
  global.app_event.on('stop', () => { stop(); reset() })
  global.app_event.on('error', stop)
  global.app_event.on('musicToggled', reset)
  global.state_event.on('configUpdated', keys => {
    if (keys.includes('player.listSkip') || keys.includes('player.songSkip')) reset()
  })
}
