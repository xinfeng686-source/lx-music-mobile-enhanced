export const getSkipMusicKey = (music: LX.Music.MusicInfo | LX.Download.ListItem | null) => {
  if (!music) return ''
  const info = 'progress' in music ? music.metadata.musicInfo : music
  return JSON.stringify([info.source, info.id])
}
