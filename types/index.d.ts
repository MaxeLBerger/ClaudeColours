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
  /** Id of the color set in use: `bunt`, or a calm sleep set such as `daemmerung`. */
  satz: string
  /** True while the band shows the color buttons. */
  isPicking: boolean
  /** True when the person hid the band (kept across sessions in the store). */
  isHidden: boolean
}

declare module 'claude-code' {
  interface PluginState {
    projektfarben: { view: ProjektfarbenView }
  }
}
