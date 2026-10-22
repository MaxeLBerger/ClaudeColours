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
