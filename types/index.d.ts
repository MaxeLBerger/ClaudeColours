export type ProjektfarbenView = {
  /** The project this session belongs to, from its folder; null in a scratch folder. */
  project: string | null
  /** The project's color mark, an emoji such as a blue square or a plain shape in sleep mode; null without a project. */
  mark: string | null
  /** The color the band paints the project name in. */
  hex: string | null
  /** How full the context window was after the last answer, 0 to 100; null before the first one. */
  contextPercent: number | null
  /** The open pull requests of the project's repository, counted by `gh`; null while unknown. */
  openPrs: number | null
  /** Why `openPrs` could not be read, for `/projektfarbe`; null when it could. */
  prsNote: string | null
  /** The numbers of the open pull requests last read (at most 101), to tell the new ones. */
  prNumbers: number[]
  /** How many open pull requests are newer than the highest one the person has seen. */
  newPrs: number
  /** The open issues of the project's repository, counted by `gh`; null while unknown. */
  openIssues: number | null
  /** Why `openIssues` could not be read, for `/projektfarbe`; null when it could. */
  issuesNote: string | null
  /** The numbers of the open issues last read (at most 101), to tell the new ones. */
  issueNumbers: number[]
  /** How many open issues are newer than the highest one the person has seen. */
  newIssues: number
  /**
   * The repository's web address, read by `gh repo view` once per folder; the project's color and
   * name link to it. A Link, not a Button: the desktop draws a Button natively, without the colors.
   */
  repoUrl: string | null
  /** Id of the color set in use: `bunt`, or a calm sleep set such as `daemmerung`. */
  satz: string
  /** True while the band shows the color buttons. */
  isPicking: boolean
  /** True when the person hid the band (kept across sessions in the store). */
  isHidden: boolean
}

// The contract must be self-contained, so these mirror `Uebersicht` in hooks/colors.ts: change them together.
export type PanelStatus = {
  art: 'laeuft' | 'abgebrochen' | 'fehler' | 'pr-offen' | 'pr-gemerged' | 'pr-geschlossen' | 'in-arbeit' | 'ruht'
  mark: string
  label: string
  rang: number
  pr: number | null
}

export type PanelZeile = {
  sessionId: string
  title: string
  status: PanelStatus
  alter: string
  lastActive: number | null
  isSelf: boolean
  link: string | null
}

export type PanelUebersicht = {
  gruppen: { project: string | null; mark: string | null; zeilen: PanelZeile[] }[]
  hinweise: string[]
}

/** What the side panel draws: the overview of all sessions and how fresh it is. */
export type ProjektfarbenPanel = {
  /** The last overview read; null before the first one. */
  daten: PanelUebersicht | null
  /** True while the overview is being read. */
  isLoading: boolean
  /** Why the overview could not be read; null when it could. */
  fehler: string | null
  /** When the overview was read (`$.clock.now()`); null before the first reading. */
  um: number | null
  /** True while the panel is open: only then a finished turn refreshes it. */
  isOpen: boolean
  /** `status`: sections by what to do (default); `projekt`: grouped by project. */
  ansicht: 'status' | 'projekt'
}

declare module 'claude-code' {
  interface PluginState {
    projektfarben: { view: ProjektfarbenView; uebersicht: ProjektfarbenPanel }
  }
}
