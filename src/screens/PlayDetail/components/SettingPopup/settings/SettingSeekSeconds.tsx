import { useState } from 'react'
import { View } from 'react-native'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import styles from './style'

const MAX_SEEK_SECONDS = 30

const SettingSeekSeconds = ({ direction }: { direction: 'backward' | 'forward' }) => {
  const settingKey = direction == 'backward' ? 'player.seekBackwardSeconds' : 'player.seekForwardSeconds'
  const settingValue = useSettingValue(settingKey)
  const [value, setValue] = useState(String(settingValue))
  const t = useI18n()

  const saveValue = (text: string) => {
    const parsed = Math.min(MAX_SEEK_SECONDS, Math.max(1, Number(text) || 1))
    setValue(text === '' ? '' : String(parsed))
    updateSetting({ [settingKey]: parsed })
  }

  return (
    <View style={styles.container}>
      <Text>{t(direction == 'backward' ? 'play_detail_setting_seek_backward' : 'play_detail_setting_seek_forward')}</Text>
      <View style={styles.content}>
        <Input value={value} onChangeText={saveValue} onBlur={() => { setValue(String(settingValue)) }} keyboardType='number-pad' maxLength={2} style={{ width: 55, flexGrow: 0 }} />
        <Text>s（1-30）</Text>
      </View>
    </View>
  )
}

export default SettingSeekSeconds
