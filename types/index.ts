export interface EpisodeItem {
  num: number
  href: string
  id?: string
  unifiedData?: any
}

export const initialEpisode: EpisodeItem = {
  num: 1,
  href: "",
}

export interface SourceItem {
  name: string
  url: string
  id: string
  animeSession?: string
}

export const initialSources: SourceItem[] = []
