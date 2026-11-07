import { View } from 'react-native'
import { useEffect, useRef, useState } from 'react'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { usePlayMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import settingState from '@/store/setting/state'
import listState from '@/store/list/state'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import styles from './style'
import Button from '@/components/common/Button'
import { getSkipMusicKey } from '@/utils/skipMusicKey'

const SecondsInput = ({ value, onChange }: { value: number, onChange: (text: string) => void }) => {
  const [text, setText] = useState(String(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(String(value))
  }, [value])
  return <Input value={text} onFocus={() => { focused.current = true }} onChangeText={next => {
    const digits = next.replace(/\D/g, '')
    const normalized = digits ? String(Math.min(120, Number(digits))) : ''
    setText(normalized)
    onChange(normalized)
  }} onBlur={() => {
    focused.current = false
    setText(String(value))
  }} keyboardType='number-pad' maxLength={3} style={{ width: 55, flexGrow: 0, flexShrink: 1 }} />
}

export default () => {
  const { listId, isTempPlay, musicInfo } = usePlayMusicInfo()
  const rules = useSettingValue('player.listSkip')
  const songs = useSettingValue('player.songSkip')
  const list = isTempPlay ? undefined : listState.allList.find(item => item.id === listId)
  const key = getSkipMusicKey(musicInfo)
  const songOnly = !list || !!songs[key]?.enabled
  const rule = songOnly ? (songs[key]?.enabled ? songs[key] : undefined) : rules[list.id]
  const t = useI18n()
  if (!key) return null
  const toggleScope = () => {
    if (!list) return
    const current = settingState.setting['player.songSkip']
    updateSetting({ 'player.songSkip': { ...current, [key]: { ...(current[key] ?? rules[list.id] ?? { intro: 0, outro: 0 }), enabled: !songOnly } } })
  }
  const save = (field: 'intro' | 'outro', text: string) => {
    const value = Math.min(120, Math.max(0, Math.trunc(Number(text) || 0)))
    if (songOnly) {
      const current = settingState.setting['player.songSkip']
      updateSetting({ 'player.songSkip': { ...current, [key]: { ...(current[key] ?? { intro: 0, outro: 0 }), enabled: true, [field]: value } } })
    } else {
      const current = settingState.setting['player.listSkip']
      updateSetting({ 'player.listSkip': { ...current, [list.id]: { ...(current[list.id] ?? { intro: 0, outro: 0 }), [field]: value } } })
    }
  }
  return <>
    <View style={styles.container}>
      <Button onPress={toggleScope} disabled={!list} style={{ paddingVertical: 5 }}>
        <Text>{songOnly ? t('list_skip_song_scope') : t('list_skip_scope', { name: list.name })}{list ? ` · ${t('list_skip_switch')}` : ''}</Text>
      </Button>
    </View>
    <View style={{ flexDirection: 'row' }}>
    {(['intro', 'outro'] as const).map(field => <View key={`${key}-${field}`} style={[styles.container, { flex: 1, minWidth: 0 }]}>
      <Text>{t(field === 'intro' ? 'list_skip_intro' : 'list_skip_outro')}</Text>
      <View style={[styles.content, { width: '100%' }]}>
        <SecondsInput key={`${key}-${songOnly}-${field}`} value={rule?.[field] ?? 0} onChange={text => { save(field, text) }} />
        <Text>s</Text>
      </View>
    </View>)}
    </View>
  </>
}
