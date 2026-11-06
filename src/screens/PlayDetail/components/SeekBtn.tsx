import { TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useProgress } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import playerState from '@/store/player/state'
import { createStyle } from '@/utils/tools'

const MAX_SEEK_SECONDS = 30

export default ({ direction }: { direction: 'backward' | 'forward' }) => {
  const theme = useTheme()
  const { maxPlayTime } = useProgress()
  const settingKey = direction == 'backward' ? 'player.seekBackwardSeconds' : 'player.seekForwardSeconds'
  const seconds = Math.min(MAX_SEEK_SECONDS, Math.max(1, useSettingValue(settingKey)))
  const seek = () => {
    const { nowPlayTime, maxPlayTime } = playerState.progress
    if (!Number.isFinite(maxPlayTime) || maxPlayTime <= 0) return
    global.app_event.setProgress(Math.min(maxPlayTime, Math.max(0, nowPlayTime + (direction == 'backward' ? -seconds : seconds))))
  }

  return (
    <TouchableOpacity style={styles.button} activeOpacity={0.5} disabled={maxPlayTime <= 0} onPress={seek}>
      <Text style={styles.label} color={theme['c-button-font']}>{direction == 'backward' ? `-${seconds}` : `+${seconds}`}s</Text>
    </TouchableOpacity>
  )
}

const styles = createStyle({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 42,
    height: 42,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
})
