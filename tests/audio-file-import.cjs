const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
function load(options = {}) {
  const events = { added: [], read: [], status: [], tips: [] }
  const modules = {
    '@/core/list': {
      getListMusics: async() => (options.existing || []).map(id => ({ id })),
      addListMusics: async(id, infos) => {
        if (options.writeError) throw new Error('Storage unavailable')
        events.added.push({ id, infos })
      },
      setFetchingListStatus: (id, value) => events.status.push(value),
    },
    '@/utils/tools': {
      confirmDialog: async() => options.confirm !== false,
      toast: (key) => events.tips.push(key),
    },
    '@/utils/log': { log: { error() {}, warn() {} } },
    '@/utils': { formatPlayTime2: seconds => String(seconds) },
    '@/store/setting/state': { default: { setting: { 'list.addMusicLocationType': 'bottom' } } },
    '@/utils/localMediaMetadata': { readMetadata: async(file) => {
      events.read.push(file)
      if (file === 'broken.mp3') throw new Error('Unreadable')
      if (file === 'unsupported.dsf') return null
      return { name: file, singer: '', albumName: '', interval: 1, ext: file.split('.').pop() }
    } },
  }
  const source = fs.readFileSync(path.join(root, 'src/screens/Home/Views/Mylist/MyList/listAction.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: name => modules[name] || {}, global: { i18n: { t: (key, values) => ({ key, values }) } } })
  return { run: files => exports.handleImportSelectedMediaFiles({ id: 'target', name: 'Test' }, files), events }
}

test('cancel and empty selection do not read or change playlists', async() => {
  for (const files of [[], ['one.mp3']]) {
    const { run, events } = load({ confirm: false })
    await run(files)
    assert.equal(events.read.length + events.added.length + events.status.length, 0)
  }
})

test('cross-folder paths import once; existing and unreadable files do not block others', async() => {
  const { run, events } = load({ existing: ['exists.mp3'] })
  await run(['a/song.MP3', 'b/song.flac', 'a/song.MP3', 'exists.mp3', 'broken.mp3', 'unsupported.dsf'])
  assert.equal(events.added.length, 1)
  assert.equal(events.added[0].id, 'target')
  assert.equal(events.added[0].infos.map(info => info.id).join(','), 'a/song.MP3,b/song.flac')
  assert.equal(events.read.includes('exists.mp3'), false)
  const result = events.tips.at(-1)
  assert.equal(result.values.success, 2)
  assert.equal(result.values.skipped, 1)
  assert.equal(result.values.failed, 2)
  assert.deepEqual(events.status, [true, false])
})

test('storage failure reports failure and clears loading state', async() => {
  const { run, events } = load({ writeError: true })
  await run(['a.mp3'])
  assert.equal(events.tips.at(-1).key, 'audio_files_error')
  assert.deepEqual(events.status, [true, false])
})

test('all unreadable files leave playlist untouched', async() => {
  const { run, events } = load()
  await run(['broken.mp3', 'unsupported.dsf'])
  assert.equal(events.added.length, 0)
  assert.equal(events.tips.at(-1).values.failed, 2)
  assert.deepEqual(events.status, [true, false])
})

test('translations use the application single-brace interpolation', () => {
  for (const lang of ['zh-cn', 'zh-tw', 'en-us']) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, `src/lang/${lang}.json`), 'utf8'))
    assert.ok(messages.audio_files_import_count.includes('{count}'))
    assert.ok(!messages.audio_files_import_count.includes('{{'))
    assert.ok(messages.audio_files_confirm.includes('{name}'))
  }
})
