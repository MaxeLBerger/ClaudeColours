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
  /**
   * The newest release build of Bramble (`bramble.exe`), the person's own browser, found with the
   * counts; null without one. With it the name, `PRs:` and `Issues:` open their pages there.
   */
  bramble: string | null
  /** Id of the color set in use: `bunt`, or a calm sleep set such as `daemmerung`. */
  satz: string
  /** True while the band shows the color buttons. */
  isPicking: boolean
  /** True when the person hid the band (kept across sessions in the store). */
  isHidden: boolean
  /** True where the folder holds a compose file: the band then shows the stack rebuild. */
  hasStack: boolean
  /**
   * The CI of the pushed head, the band's bottom row; null where it has no workflow run. A state kept
   * from before this field existed (a reload keeps the session's state) lacks it: read it as null.
   */
  ci: ProjektfarbenCi | null
}

// The contract must be self-contained, so this mirrors `CiAnzeige` in hooks/colors.ts: change them together.
export type ProjektfarbenCi = {
  gruen: number
  rot: number
  laeuft: number
  wartet: number
  abgebrochen: number
  /** The red jobs' full names. */
  rotNamen: string[]
  /** The running job that needs longest, its percent and what the percent was read from. */
  haupt: { name: string; prozent: number | null; quelle: 'log' | 'zeit' | null } | null
  /** How long the slowest running job still needs, in seconds; null where no baseline says. */
  restSek: number | null
  isFertig: boolean
  /** Where the row leads: the pull request's checks, else the run. */
  url: string | null
}

// The contract must be self-contained, so these mirror `Uebersicht` in hooks/colors.ts: change them together.
export type PanelStatus = {
  art: 'laeuft' | 'abgebrochen' | 'fehler' | 'pr-offen' | 'pr-gemerged' | 'pr-geschlossen' | 'in-arbeit' | 'ruht'
  mark: string
  label: string
  rang: number
  pr: number | null
  tage: number | null
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
  /** Sections and projects the person folded: `laeuft` (default), a section id, or `projekt-<name>`. */
  zu: string[]
}

declare module 'claude-code' {
  interface PluginState {
    projektfarben: { view: ProjektfarbenView; uebersicht: ProjektfarbenPanel }
  }
}
