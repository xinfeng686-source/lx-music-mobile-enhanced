const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
function load(file, modules) {
  const exports = {}
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: id => modules[id] || {}, Date })
  return exports
}
test('actual setting merger saves skip rules and restores them after restart', () => {
  const defaults = load('src/config/defaultSetting.ts', {}).default
  const state = { setting: defaults }
  const { updateSetting } = load('src/config/setting.ts', {
    '@/config/defaultSetting': { default: defaults }, '@/store/setting/state': { default: state },
  })
  const rules = { 'player.listSkip': { listA: { intro: 12, outro: 25 } }, 'player.songSkip': { songA: { intro: 4, outro: 8, enabled: true } } }
  const changed = updateSetting(rules)
  assert.equal(changed.setting['player.listSkip'].listA.intro, 12)
  assert.equal(changed.setting['player.songSkip'].songA.enabled, true)
  assert.ok(changed.updatedSettingKeys.includes('player.songSkip'))
  const restored = updateSetting(JSON.parse(JSON.stringify(changed.setting)), true)
  assert.equal(restored.setting['player.listSkip'].listA.outro, 25)
  assert.equal(restored.setting['player.songSkip'].songA.intro, 4)
  state.setting = restored.setting
  const toggled = updateSetting({ 'player.songSkip': { songA: { intro: 4, outro: 8, enabled: false } } })
  assert.equal(toggled.setting['player.songSkip'].songA.enabled, false)
  assert.equal(toggled.setting['player.listSkip'].listA.intro, 12)
  for (const bad of [null, [], { a: { intro: -1, outro: 0 } }, { a: { intro: 121, outro: 0 } }]) {
    assert.equal(updateSetting({ 'player.listSkip': bad }).updatedSettingKeys.length, 0)
  }
  assert.equal(updateSetting({ 'player.volume': {} }).updatedSettingKeys.length, 0)
})
