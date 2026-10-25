// Pure helpers: which project a folder belongs to, which color it has,
// and what a session title looks like with the color mark in front.
// No project is named here: colors live in the mod's own store, per person.

export type Farbe = { name: string; mark: string; hex: string }

/**
 * A set of colors a project can have. The bright default and the calm sleep
 * set are both data: nothing below names one, so a further set is one more entry.
 */
export type Satz = {
  id: string
  label: string
  /** Stands for the set in the color picker's mode switch; none is shared by two sets. */
  emoji: string
  /** Where the person's picks for this set live in the store. */
  storeKey: string
  farben: readonly Farbe[]
  /** The order a new project is handed a color in (names from `farben`). */
  reihenfolge: readonly string[]
  /** Marks are plain text, not emoji: one only counts when a space or the end follows it. */
  strikt: boolean
}

export const FARBEN: readonly Farbe[] = [
  { name: 'blau', mark: '🟦', hex: '#3b82f6' },
  { name: 'gruen', mark: '🟩', hex: '#22c55e' },
  { name: 'orange', mark: '🟧', hex: '#f97316' },
  { name: 'lila', mark: '🟪', hex: '#a855f7' },
  { name: 'rot', mark: '🟥', hex: '#ef4444' },
  { name: 'gelb', mark: '🟨', hex: '#eab308' },
  { name: 'braun', mark: '🟫', hex: '#b45309' },
  { name: 'schwarz', mark: '⬛', hex: '#6b7280' },
  { name: 'weiss', mark: '⬜', hex: '#94a3b8' },
  { name: 'kreis-blau', mark: '🔵', hex: '#3b82f6' },
  { name: 'kreis-gruen', mark: '🟢', hex: '#22c55e' },
  { name: 'kreis-orange', mark: '🟠', hex: '#f97316' },
  { name: 'kreis-lila', mark: '🟣', hex: '#a855f7' },
  { name: 'kreis-rot', mark: '🔴', hex: '#ef4444' },
  { name: 'kreis-gelb', mark: '🟡', hex: '#eab308' },
  { name: 'kreis-braun', mark: '🟤', hex: '#b45309' },
  { name: 'kreis-schwarz', mark: '⚫', hex: '#6b7280' },
  { name: 'kreis-weiss', mark: '⚪', hex: '#94a3b8' },
]

/** The order a new project is handed a color in: bright squares, bright circles, then the dull ones. */
const REIHENFOLGE = [
  'blau', 'gruen', 'orange', 'lila', 'rot', 'gelb',
  'kreis-blau', 'kreis-gruen', 'kreis-orange', 'kreis-lila', 'kreis-rot', 'kreis-gelb',
  'braun', 'kreis-braun', 'schwarz', 'kreis-schwarz', 'weiss', 'kreis-weiss',
]

/**
 * Calm colors for the evening. A session title is plain text and cannot be tinted,
 * and emoji colors are the system's own (the moon phases and several nature emoji
 * come out vivid on Windows), so the sidebar gets a monochrome shape and only
 * the band gets the color: every hex is below 0.06 chroma (OKLCH), at least 5 apart (OKLab x100).
 */
const DAEMMERUNG_FARBEN: readonly Farbe[] = [
  { name: 'nebel', mark: '⬤', hex: '#93aeca' },
  { name: 'sand', mark: '■', hex: '#d7caa6' },
  { name: 'altrosa', mark: '▲', hex: '#c59b9e' },
  { name: 'moos', mark: '◆', hex: '#8a9974' },
  { name: 'flieder', mark: '▼', hex: '#a597b8' },
  { name: 'petrol', mark: '◐', hex: '#6e9ba1' },
  { name: 'ton', mark: '◑', hex: '#b49078' },
  { name: 'salbei', mark: '⬢', hex: '#a8c7ad' },
  { name: 'schiefer', mark: '▣', hex: '#797f99' },
  { name: 'mauve', mark: '✚', hex: '#9d7a8d' },
]

export const BUNT: Satz = {
  id: 'bunt',
  label: 'bunt',
  emoji: '🎨',
  storeKey: 'farben',
  farben: FARBEN,
  reihenfolge: REIHENFOLGE,
  strikt: false,
}

export const DAEMMERUNG: Satz = {
  id: 'daemmerung',
  label: 'Dämmerung',
  emoji: '🌙',
  storeKey: 'farben-daemmerung',
  farben: DAEMMERUNG_FARBEN,
  reihenfolge: DAEMMERUNG_FARBEN.map(f => f.name),
  strikt: true,
}

export const SAETZE: readonly Satz[] = [BUNT, DAEMMERUNG]
/** The sets sleep mode can use; the first is what `/projektfarbe schlaf` picks. */
export const SCHLAFSAETZE: readonly Satz[] = [DAEMMERUNG]

/** What the color picker's mode switch shows for a set: its emoji and its name, capitalized. */
export const modusLabel = (satz: Satz): string =>
  `${satz.emoji} ${satz.label.charAt(0).toUpperCase()}${satz.label.slice(1)}`

const PLATZHALTER = new Set(['', 'new session', 'neue session', 'untitled', 'unbenannt'])

const byName = (satz: Satz, name: string): Farbe | undefined => satz.farben.find(f => f.name === name)
const byMark = (satz: Satz, mark: string): Farbe | undefined => satz.farben.find(f => f.mark === mark)

/** A name as the person types it: lowercase, umlauts spelled out, spaces as dashes. */
const asciiName = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')

/** The color set stored under `modus`; the bright one when none is stored. */
export function satzOf(id: unknown): Satz {
  return SAETZE.find(s => s.id === id) ?? BUNT
}

/** A sleep set from what the person typed (dämmerung, Daemmerung, …). */
export function findSatz(input: string): Satz | undefined {
  const name = asciiName(input)

  return SCHLAFSAETZE.find(s => asciiName(s.label) === name || s.id === name)
}

/** The project folder of a session directory; a worktree counts as its repository. */
export function projectOf(cwd: string): string | null {
  const path = cwd.replace(/\\/g, '/').replace(/\/+$/, '')
  if (/\/scratch-workspaces\//i.test(path)) {
    return null
  }
  const cut = path.search(/\/\.claude\/worktrees\//i)
  const root = cut >= 0 ? path.slice(0, cut) : path
  const name = root.split('/').pop() ?? ''

  return name === '' || /^[a-z]:$/i.test(name) ? null : name
}

/**
 * What the opinion button sends the session, as the person's own words (they would type the same). It
 * states goals, not a form: the session decides from the conversation what the opinion is about (the last
 * question, a plan to rework, the state of the project) and builds the subagent's task itself, handing
 * over the matter and only what it needs, never its own conclusion, so the view stays independent and
 * the subagent's context small. The subagent reads the rest of the repository itself.
 */
export function meinungPrompt(projekt: string): string {
  return [
    `Hol eine unabhängige zweite Meinung von Opus ein zu dem, worum es in diesem Gespräch gerade geht: meine letzte Frage, der Plan, den wir haben, oder der Stand von „${projekt}“. Du entscheidest, was gemeint ist.`,
    [
      'Starte dafür mit dem Agent-Tool einen Subagenten (subagent_type general-purpose, model opus) und baue seinen Auftrag selbst zusammen:',
      '- Gib ihm die Sache selbst mit, über die er urteilen soll: die Frage, den Plan im Wortlaut oder die Dateien und Stellen, um die es geht. Wenn ich den Plan überarbeitet haben will, gehört der Plan hinein, mit der Bitte, ihn zu verbessern.',
      '- Gib ihm nicht deine eigene Schlussfolgerung oder Empfehlung mit, sonst urteilt er nur nach; es sei denn, genau die soll er prüfen.',
      '- Nimm nur auf, was er wirklich braucht: keinen Gesprächsverlauf, keine Nebenpfade. Alles Weitere soll er selbst im Repository nachsehen (CLAUDE.md, README.md, git log, gh pr list, gh issue list). Er ändert nichts.',
      '- Er soll direkt sein, jede Aussage mit einer Stelle belegen (Datei, Commit oder Nummer) und sagen, wo er anderer Meinung ist und warum. So lang wie nötig, ohne Füllstoff.',
    ].join('\n'),
    'Gib seine Antwort danach unverändert wieder und sage darunter kurz, wo du anderer Meinung bist und was du übernimmst.',
  ].join('\n\n')
}

/**
 * What the review button sends the session, as the person's own words: check the work, commit it, open
 * the pull request. Pressing the button is the go-ahead for those three steps, and for nothing beyond
 * them (no merge, no push to the main branch, no force). Like `meinungPrompt` it states goals and leaves
 * the how to the session, which knows the repository; where a step cannot be done it stops and says why.
 */
export function reviewPrompt(projekt: string): string {
  return [
    `Bring die Änderungen in „${projekt}“ bis zum Pull Request: erst prüfen, dann committen, dann den PR öffnen.`,
    [
      '1. Review: Sieh dir an, was seit dem Abzweig vom Basis-Branch geändert ist (git status, git diff, bei Bedarf der code-review-Skill). Behebe echte Befunde, bevor es weitergeht, und lass die Tests und Prüfungen des Projekts laufen (siehe CLAUDE.md oder README). Sag mir kurz, was du gefunden und geändert hast.',
      '2. Commit: Fasse zusammen, was zusammengehört, mit Nachrichten in der Art der letzten Commits. Nimm nur Dateien dieser Arbeit mit, keine Nebenprodukte und keine Geheimnisse.',
      '3. PR: Pushe den Branch (nie auf den Basis-Branch, nie mit force) und öffne einen Pull Request dagegen, mit einer Beschreibung, die sagt, was sich ändert, warum und was geprüft ist. Mergen tust du nicht.',
    ].join('\n'),
    'Wenn einer der Schritte nicht geht (Tests rot, nichts zu committen, kein Remote, ein Befund, der meine Entscheidung braucht), halte an und sag mir, woran es liegt, statt es zu umgehen. Am Ende nennst du mir den Link zum PR.',
  ].join('\n\n')
}

/** A color from a project's name, the same every time: used once every color of the set is taken. */
function hashFarbe(project: string, satz: Satz): Farbe {
  let hash = 0
  for (const ch of project.toLowerCase()) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  }

  return satz.farben[hash % satz.farben.length] ?? satz.farben[0]!
}

/** The color a project with none gets: the first no other project has, else one from its name. */
export function nextFarbe(
  project: string,
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): Farbe {
  const taken = new Set(Object.values(picks))
  const free = satz.reihenfolge
    .map(name => byName(satz, name))
    .find(f => f !== undefined && !taken.has(f.mark))

  return free ?? hashFarbe(project, satz)
}

/** The project's color: the stored one, else the one it would be handed now. */
export function farbeFor(
  project: string,
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): Farbe {
  const picked = picks[project.toLowerCase()]

  return (picked === undefined ? undefined : byMark(satz, picked)) ?? nextFarbe(project, picks, satz)
}

/** The picks with a color recorded for each project that has none yet, in the order given. */
export function assignFarben(
  projects: readonly string[],
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): Record<string, string> {
  const next: Record<string, string> = { ...picks }
  for (const project of projects) {
    const key = project.toLowerCase()
    if (next[key] === undefined || byMark(satz, next[key]) === undefined) {
      next[key] = nextFarbe(project, next, satz).mark
    }
  }

  return next
}

/** A color of the set from what the person typed: its name (grün, weiß and kreis-… work) or its mark. */
export function findFarbe(input: string, satz: Satz = BUNT): Farbe | undefined {
  const text = input.trim()

  return byName(satz, asciiName(text)) ?? satz.farben.find(f => text.startsWith(f.mark))
}

/** True when the title starts with this mark (a plain-text mark needs a space or the end after it). */
function carries(text: string, farbe: Farbe, satz: Satz): boolean {
  if (!text.startsWith(farbe.mark)) {
    return false
  }
  const after = text.charAt(farbe.mark.length)

  return !satz.strikt || after === '' || /\s/.test(after)
}

/** The color mark a title starts with, if any: of one set, or of any set when none is given. */
export function markOf(title: string, only?: Satz): Farbe | undefined {
  const text = title.trim()
  for (const satz of only === undefined ? SAETZE : [only]) {
    const found = satz.farben.find(f => carries(text, f, satz))
    if (found !== undefined) {
      return found
    }
  }

  return undefined
}

/** The title without color marks in front, whichever set they come from. */
export function stripMark(title: string): string {
  let text = title.trim()
  for (let farbe = markOf(text); farbe !== undefined; farbe = markOf(text)) {
    text = text.slice(farbe.mark.length).replace(/^️/, '').trim()
  }

  return text
}

/** The title with `mark` in front, or null while the app has not named the session yet. */
export function desiredTitle(title: string, mark: string): string | null {
  const bare = stripMark(title)
  if (PLATZHALTER.has(bare.toLowerCase())) {
    return null
  }

  return `${mark} ${bare}`
}

/** The person's picks for one set from the store, keeping only well-formed entries. */
export function readPicks(raw: unknown, satz: Satz = BUNT): Record<string, string> {
  const picks: Record<string, string> = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return picks
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && byMark(satz, value) !== undefined) {
      picks[key.toLowerCase()] = value
    }
  }

  return picks
}

export type SessionRow = { sessionId: string; title: string; cwd: string }

/** One session from a get_session or list_sessions entry, or null when a field is missing. */
export function toRow(raw: unknown, fallbackId?: string): SessionRow | null {
  if (raw === null || typeof raw !== 'object') {
    return null
  }
  const entry = raw as Record<string, unknown>
  const sessionId = typeof entry.sessionId === 'string' ? entry.sessionId : fallbackId
  if (sessionId === undefined || typeof entry.title !== 'string' || typeof entry.cwd !== 'string') {
    return null
  }

  return { sessionId, title: entry.title, cwd: entry.cwd }
}

/**
 * The colors the sidebar already shows: per project, the mark of this set most of
 * its sessions carry (the first seen on a tie). Sessions without one count for nothing.
 */
export function learnPicks(rows: readonly SessionRow[], satz: Satz = BUNT): Record<string, string> {
  const tally = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const project = projectOf(row.cwd)
    const farbe = markOf(row.title, satz)
    if (project === null || farbe === undefined) {
      continue
    }
    const counts = tally.get(project.toLowerCase()) ?? new Map<string, number>()
    counts.set(farbe.mark, (counts.get(farbe.mark) ?? 0) + 1)
    tally.set(project.toLowerCase(), counts)
  }
  const learned: Record<string, string> = {}
  for (const [key, counts] of tally) {
    let best: [string, number] | undefined
    for (const entry of counts) {
      if (best === undefined || entry[1] > best[1]) {
        best = entry
      }
    }
    if (best !== undefined) {
      learned[key] = best[0]
    }
  }

  return learned
}

/** What a session's title needs: a rename, or why none. */
export type TitlePlan =
  | { kind: 'rename'; title: string }
  | { kind: 'same' | 'unnamed' | 'no-project' }

export function planTitle(
  row: SessionRow,
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): TitlePlan {
  const project = projectOf(row.cwd)
  if (project === null) {
    return { kind: 'no-project' }
  }
  const wanted = desiredTitle(row.title, farbeFor(project, picks, satz).mark)
  if (wanted === null) {
    return { kind: 'unnamed' }
  }

  return wanted === row.title ? { kind: 'same' } : { kind: 'rename', title: wanted }
}

export type ContextLevel = 'ok' | 'warn' | 'full'

const CONTEXT_WARN = 70
const CONTEXT_FULL = 85

/** The width of the gauge, in cells. */
export const CONTEXT_CELLS = 8

/** How full the context window is, 0 to 100, from `$.session.usage()`; null before the first answer. */
export function contextPercent(usage: unknown): number | null {
  const context = (usage as { context?: unknown } | null)?.context
  if (context === null || typeof context !== 'object') {
    return null
  }
  const { percent, tokens, window } = context as Record<string, unknown>
  const value =
    typeof percent === 'number'
      ? percent
      : typeof tokens === 'number' && typeof window === 'number' && window > 0
        ? (tokens / window) * 100
        : null

  return value === null || !Number.isFinite(value) ? null : Math.min(100, Math.max(0, Math.round(value)))
}

/** From where the window is getting full (70 %) and where `/compact` is due (85 %). */
export function contextLevel(percent: number): ContextLevel {
  return percent >= CONTEXT_FULL ? 'full' : percent >= CONTEXT_WARN ? 'warn' : 'ok'
}

/** How many of the gauge's `width` cells are filled: in proportion to the percentage, at least one once there is any use. */
export function contextFill(percent: number, width: number = CONTEXT_CELLS): number {
  const cells = Math.round((percent / 100) * width)

  return Math.min(width, Math.max(percent > 0 ? 1 : 0, cells))
}

/**
 * The band's layouts, from the roomiest down. The one-row layouts: `voll` writes the three actions out,
 * `icons` turns them into icons, `kompakt` also drops the gauge's word and shortens its bar, `dicht`
 * moves the items closer together, `minimal` keeps only the percentage of the gauge. `zwei` is the
 * last resort: two rows, name and gauge above, counts and icons below.
 */
export type BandStufe = 'voll' | 'icons' | 'kompakt' | 'dicht' | 'minimal' | 'zwei'

/** The gauge's bar in the compact layouts; the roomier ones keep the full `CONTEXT_CELLS`. */
export const COMPACT_CELLS = 4

/** What a one-row layout draws. */
export type BandForm = {
  /** The `columnGap` of its rows, in cells. */
  gap: number
  /** The actions are written out; else they are icons. */
  isWritten: boolean
  /** The gauge's bar in cells; null: the percentage alone. */
  bar: number | null
  /** The word "Kontext" before the bar. */
  hasWord: boolean
  /** A blank node before the gauge, which sets the gauge apart by a wider gap. */
  hasSpacer: boolean
}

export const BAND_FORMEN: Record<Exclude<BandStufe, 'zwei'>, BandForm> = {
  voll: { gap: 2, isWritten: true, bar: CONTEXT_CELLS, hasWord: true, hasSpacer: true },
  icons: { gap: 2, isWritten: false, bar: CONTEXT_CELLS, hasWord: true, hasSpacer: true },
  kompakt: { gap: 2, isWritten: false, bar: COMPACT_CELLS, hasWord: false, hasSpacer: true },
  dicht: { gap: 1, isWritten: false, bar: COMPACT_CELLS, hasWord: false, hasSpacer: false },
  minimal: { gap: 1, isWritten: false, bar: null, hasWord: false, hasSpacer: false },
}

/** What the band's width depends on, in characters. */
export type BandInhalt = {
  /** The project's name. */
  name: number
  /** What stands after `PRs:`: the blank, the number and any raised "+x" (` 12⁺¹`, ` ?`). */
  prs: number
  /** The same after `Issues:`. */
  issues: number
  /** The digits of the context percentage; null where there is no gauge. */
  percent: number | null
}

// The band's five actions are drawn as vector icons where the surface has `Svg` (the desktop, not the
// terminal, which keeps the text glyphs). All five are one family, so they share height, weight and
// color: text glyphs next to them sat lower, smaller and darker. An `Svg` is an image and does not take
// the theme's text color, so the stroke is one mid gray that reads on the light and the dark theme alike.
// Line icons on a 24 grid.
export const ICON_SVG_COLOR = '#666c78'
/** CSS pixels an icon is drawn at; the field around it is `ICON_BOX` cells. */
export const ICON_SVG_SIZE = 14

const svgIcon = (inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${ICON_SVG_COLOR}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`

export const ICON_SVG = {
  // A doctoral cap with a spark: the independent second opinion.
  meinung: {
    alt: 'Opus-Meinung',
    source: svgIcon(
      '<path d="M2.5 11 11 7 19.5 11 11 15Z"/><path d="M6 13v4c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4"/><path d="M19.5 11v4"/><path d="M19 2.5v3.5M17.2 4.2h3.6"/>',
    ),
  },
  // A pull request under a magnifying glass: review the work, then open it.
  review: {
    alt: 'Review und Pull Request',
    source: svgIcon(
      '<circle cx="5" cy="5" r="2"/><circle cx="5" cy="14" r="2"/><path d="M5 7v5"/><path d="M13 10V8a3 3 0 0 0-3-3H8"/><path d="m9.6 3.4-1.6 1.6 1.6 1.6"/><circle cx="16" cy="16" r="4.5"/><path d="M19.3 19.3 22 22"/>',
    ),
  },
  // Three lines: the overview of all sessions.
  uebersicht: {
    alt: 'Übersicht',
    source: svgIcon('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>'),
  },
  // A half-filled disc: the color.
  farbe: {
    alt: 'Farbe ändern',
    source: svgIcon(`<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="${ICON_SVG_COLOR}"/>`),
  },
  // A cross: hide the band.
  ausblenden: {
    alt: 'Band ausblenden',
    source: svgIcon('<path d="M6 6l12 12M18 6 6 18"/>'),
  },
} as const

// An icon's field and the gap between two: three icons take as many cells as `ICON_BOX` and `ICON_GAP` say.
export const ICON_BOX = 3
export const ICON_GAP = 1
const BLOCK_CELLS = 2
// Opus-Meinung, Review + PR, Übersicht ☰, Farbe ändern, ausblenden: in the order the band draws them.
const ACTION_CHARS = [12, 11, 11, 12, 10] as const
// The shortest a name is cut to before the band lets the row run over instead.
const NAME_MIN = 8

/** What the band's widths are measured in: the cells a character, a gap and a node take on a surface. */
type Metrics = {
  /** Cells per character of plain text, of the bold name and of a button's label. */
  text: number
  name: number
  button: number
  /** Cells of the gap `columnGap: 2` and `columnGap: 1` draw, of the gap between two written-out buttons and between two icon fields. */
  gap: number
  gapTight: number
  buttonGap: number
  iconGap: number
  /** The blank node before the gauge. */
  spacer: number
  /** How far the room a row really has reaches past `bodyColumns`. */
  slack: number
}

// Measured on the desktop (the one-row band, in cells of 7.75 px): the text is set in a proportional
// font, so a character takes less than a cell, the bold name a little more; the gap between the items
// is about 22 px (`gap: 2`) or 15 px (`gap: 1`), a native button adds some to its own gaps, and the blank
// spacer before the gauge takes no room of its own. The gauge's bar is a run of blanks on a background:
// exact cells. The band's padding is less than the engine's marks at its right end, hence the slack.
const DESKTOP: Metrics = {
  text: 0.83,
  name: 0.89,
  button: 0.82,
  gap: 2.85,
  gapTight: 1.85,
  buttonGap: 3.55,
  iconGap: 1.5,
  spacer: 0,
  slack: 0.5,
}

// On the terminal a character is one cell and a gap is what `columnGap` says; the spacer is its four blanks.
const TERMINAL: Metrics = {
  text: 1,
  name: 1,
  button: 1,
  gap: 2,
  gapTight: 1,
  buttonGap: 2,
  iconGap: ICON_GAP,
  spacer: 4,
  slack: 0,
}

/**
 * The cells a layout takes in one row (`isMono`: on the terminal, not the desktop); `zwei` has no
 * one-row width and answers Infinity. The row has two parts, spread to its two ends: the project with
 * the counts and the gauge at the left, the actions at the right; the gap between them is the least it
 * keeps.
 */
export function bandBreite(stufe: BandStufe, inhalt: BandInhalt, isMono = false): number {
  if (stufe === 'zwei') {
    return Number.POSITIVE_INFINITY
  }
  const m = isMono ? TERMINAL : DESKTOP
  const form = BAND_FORMEN[stufe]
  const gapCells = form.gap === 1 ? m.gapTight : m.gap
  const items = [
    BLOCK_CELLS + (1 + inhalt.name) * m.name,
    (4 + inhalt.prs) * m.text,
    (7 + inhalt.issues) * m.text,
  ]
  if (inhalt.percent !== null) {
    // The blank spacer before the gauge is a node of its own, with a gap on each side.
    if (form.hasSpacer) {
      items.push(m.spacer)
    }
    // " 8 %" after a bar, "8 %" alone.
    const percent = (inhalt.percent + (form.bar === null ? 2 : 3)) * m.text
    items.push((form.hasWord ? 8 * m.text : 0) + (form.bar ?? 0) + percent)
  }
  const actions = form.isWritten
    ? ACTION_CHARS.reduce((sum, chars) => sum + chars * m.button, 0) + (ACTION_CHARS.length - 1) * m.buttonGap
    : ACTION_CHARS.length * ICON_BOX + (ACTION_CHARS.length - 1) * m.iconGap

  return items.reduce((sum, cells) => sum + cells, 0) + (items.length - 1) * gapCells + gapCells + actions
}

// Going back to a roomier layout than the one drawn last takes this many cells more than fitting does,
// so a window settled again and again along a threshold does not flip the band back and forth. Small: a
// window at rest must show the roomiest layout that fits.
const HYSTERESIS_CELLS = 1

/** The one-row layouts, the roomiest first. */
export const EINZEILER: readonly Exclude<BandStufe, 'zwei'>[] = ['voll', 'icons', 'kompakt', 'dicht', 'minimal']

const STUFEN: readonly BandStufe[] = [...EINZEILER, 'zwei']

/**
 * The roomiest layout that fits `columns` cells in one row; `zwei` when none does. `previous`, the
 * layout drawn last, holds the band in it until the room for a roomier one is clear.
 */
export function bandStufe(
  columns: number,
  inhalt: BandInhalt,
  previous: BandStufe | null = null,
  isMono = false,
): BandStufe {
  const last = previous === null ? -1 : STUFEN.indexOf(previous)
  const room = columns + (isMono ? TERMINAL : DESKTOP).slack

  return (
    EINZEILER.find((stufe, rank) => {
      const bias = last > rank ? HYSTERESIS_CELLS : 0

      return bandBreite(stufe, inhalt, isMono) <= room - bias
    }) ?? 'zwei'
  )
}

/** How many characters of the name fit the first row of `zwei`, beside the block and the gauge. */
export function nameBudget(columns: number, inhalt: BandInhalt, isMono = false): number {
  const m = isMono ? TERMINAL : DESKTOP
  const gauge = inhalt.percent === null ? 0 : m.gapTight + COMPACT_CELLS + (inhalt.percent + 3) * m.text

  return Math.max(NAME_MIN, Math.floor((columns - BLOCK_CELLS - m.name - gauge) / m.name))
}

/** The name cut to `max` characters with an ellipsis; as it is when it fits. */
export function shortName(name: string, max: number): string {
  const chars = [...name]

  return chars.length <= max ? name : `${chars.slice(0, Math.max(1, max - 1)).join('')}…`
}

/** The band counts open pull requests up to this number; more than that shows as "100+". */
export const PR_LIMIT = 100

/** The numbers in the JSON `gh pr list` / `gh issue list --json number` prints; null when it is no list. */
export function ghNumbers(stdout: string): number[] | null {
  try {
    const list: unknown = JSON.parse(stdout)
    if (!Array.isArray(list)) {
      return null
    }

    return list
      .map(entry => (entry !== null && typeof entry === 'object' ? (entry as { number?: unknown }).number : undefined))
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  } catch {
    return null
  }
}

/** The count as the band shows it. */
export function prLabel(count: number): string {
  return count > PR_LIMIT ? `${PR_LIMIT}+` : String(count)
}

/** What the band counts for a repository: its pull requests and its issues. */
export type Art = 'pr' | 'issue'

/**
 * The highest number seen of each kind, per repository folder (`repoKeyOf`), from the store key
 * `gesehen`; entries of older versions are keyed by project name (see `seenFor`).
 */
export type Gesehen = Record<string, Partial<Record<Art, number>>>

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** How many new entries there are, as small raised digits (`⁺²`); empty for none. */
export function superscript(count: number): string {
  if (count <= 0) {
    return ''
  }
  const digits = [...String(Math.floor(count))].map(d => SUPERSCRIPT[Number(d)]).join('')

  return `⁺${digits}`
}

/** The highest seen numbers from the store; anything that is not a number is left out. */
export function readSeen(raw: unknown): Gesehen {
  const seen: Gesehen = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return seen
  }
  for (const [project, value] of Object.entries(raw)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      continue
    }
    const entry: Partial<Record<Art, number>> = {}
    for (const art of ['pr', 'issue'] as const) {
      const n = (value as Record<string, unknown>)[art]
      if (typeof n === 'number' && Number.isFinite(n)) {
        entry[art] = n
      }
    }
    seen[project.toLowerCase()] = entry
  }

  return seen
}

/** How many of these open numbers are newer than the highest one seen; none while nothing was seen. */
export function newCount(numbers: readonly number[], seenMax: number | undefined): number {
  return seenMax === undefined ? 0 : numbers.filter(n => n > seenMax).length
}

/**
 * What was seen in one repository. `key` is the repository's folder (`repoKeyOf`); `legacyKey`, its
 * project name, is where versions before it kept the entry: it still counts until the repository
 * has one of its own, so updating shows no "+x" that was already seen.
 */
export function seenFor(seen: Gesehen, key: string, legacyKey?: string): Partial<Record<Art, number>> {
  const legacy = legacyKey === undefined ? undefined : seen[legacyKey.toLowerCase()]

  return { ...legacy, ...seen[key.toLowerCase()] }
}

/**
 * Marks these open numbers as seen for a repository (`key`, see `seenFor`). With `isFirstOnly`,
 * only where nothing was seen yet: the first reading is the baseline, so it shows no "+x". The
 * highest seen never goes down. Returns the same object when nothing changed.
 */
export function markSeen(
  seen: Gesehen,
  key: string,
  art: Art,
  numbers: readonly number[],
  isFirstOnly: boolean,
  legacyKey?: string,
): Gesehen {
  const own = key.toLowerCase()
  const known = seenFor(seen, own, legacyKey)
  const before = known[art]
  if (isFirstOnly && before !== undefined) {
    return seen
  }
  const after = Math.max(before ?? 0, ...numbers)
  if (after === seen[own]?.[art]) {
    return seen
  }

  return { ...seen, [own]: { ...known, [art]: after } }
}

const TRIED_LIMIT = 300

/** The title each session last tried to recolor, by session id, from the store. */
export function readTried(raw: unknown): Record<string, string> {
  const tried: Record<string, string> = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return tried
  }
  for (const [id, title] of Object.entries(raw)) {
    if (typeof title === 'string') {
      tried[id] = title
    }
  }

  return tried
}

/** Records one try, newest last, keeping the newest 300 sessions. */
export function rememberTry(
  tried: Readonly<Record<string, string>>,
  sessionId: string,
  title: string,
): Record<string, string> {
  const entries = Object.entries(tried).filter(([id]) => id !== sessionId)
  entries.push([sessionId, title])

  return Object.fromEntries(entries.slice(-TRIED_LIMIT))
}

/** Why a session's last own turn ended, as `turn.complete` reports it. */
export type Grund = 'answer' | 'aborted' | 'refusal' | 'error'

/** A session's last own turn: why it ended and when (`$.clock.now()`), from the store key `stand`. */
export type StandEintrag = { grund: Grund; um: number }

const GRUENDE: readonly Grund[] = ['answer', 'aborted', 'refusal', 'error']
const STAND_LIMIT = 300

/** Each session's last turn, by session id, from the store; malformed entries are left out. */
export function readStand(raw: unknown): Record<string, StandEintrag> {
  const stand: Record<string, StandEintrag> = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return stand
  }
  for (const [id, value] of Object.entries(raw)) {
    if (value === null || typeof value !== 'object') {
      continue
    }
    const { grund, um } = value as Record<string, unknown>
    if (GRUENDE.includes(grund as Grund) && typeof um === 'number' && Number.isFinite(um)) {
      stand[id] = { grund: grund as Grund, um }
    }
  }

  return stand
}

/** Records one session's last turn, newest last, keeping the newest 300 sessions. */
export function rememberStand(
  stand: Readonly<Record<string, StandEintrag>>,
  sessionId: string,
  eintrag: StandEintrag,
): Record<string, StandEintrag> {
  const entries = Object.entries(stand).filter(([id]) => id !== sessionId)
  entries.push([sessionId, eintrag])

  return Object.fromEntries(entries.slice(-STAND_LIMIT))
}

export type PrState = 'OPEN' | 'MERGED' | 'CLOSED'

const isPrState = (value: unknown): value is PrState =>
  value === 'OPEN' || value === 'MERGED' || value === 'CLOSED'

/** A session as `list_sessions` lists it, with what its status is read from. */
export type ListedSession = SessionRow & {
  branch: string | null
  isRunning: boolean
  isArchived: boolean
  /** Milliseconds since the epoch; null when the app gave none. */
  lastActivityAt: number | null
  /** The pull request the app itself links to the session, when it names one (`prNumber`, `prState`). */
  appPr: { number: number; state: PrState } | null
  /** The app's `claude://` address of the session, which opens it; null when the app gave none. */
  link: string | null
}

/** One session from a list_sessions or get_session entry, or null when a needed field is missing. */
export function toListed(raw: unknown, fallbackId?: string): ListedSession | null {
  const row = toRow(raw, fallbackId)
  if (row === null) {
    return null
  }
  const entry = raw as Record<string, unknown>
  const at = typeof entry.lastActivityAt === 'string' ? Date.parse(entry.lastActivityAt) : Number.NaN

  return {
    ...row,
    branch: typeof entry.branch === 'string' && entry.branch !== '' ? entry.branch : null,
    isRunning: entry.isRunning === true,
    isArchived: entry.isArchived === true,
    lastActivityAt: Number.isFinite(at) ? at : null,
    appPr:
      typeof entry.prNumber === 'number' && isPrState(entry.prState)
        ? { number: entry.prNumber, state: entry.prState }
        : null,
    link: typeof entry.link === 'string' && /^claude:\/\/[\w.~\/-]+$/.test(entry.link) ? entry.link : null,
  }
}

/** A pull request as `gh pr list --json number,state,headRefName,isDraft,reviewDecision,statusCheckRollup` prints it. */
export type GhPr = {
  number: number
  state: PrState
  headRefName: string
  isDraft: boolean
  /** `REVIEW_REQUIRED`, `CHANGES_REQUESTED`, `APPROVED`, or null when the repository asks for none. */
  reviewDecision: string | null
  /** True when a check failed. */
  isCiRed: boolean
}

/**
 * Conclusions (check runs) and states (commit statuses) that make the CI red. Not CANCELLED: a
 * workflow that cancels its older run on a new push leaves that run in the rollup while CI is green.
 */
const CI_ROT = new Set(['FAILURE', 'ERROR', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE'])

function ciRed(rollup: unknown): boolean {
  if (!Array.isArray(rollup)) {
    return false
  }

  return rollup.some(check => {
    if (check === null || typeof check !== 'object') {
      return false
    }
    const { conclusion, state } = check as Record<string, unknown>

    return CI_ROT.has(String(conclusion ?? '')) || CI_ROT.has(String(state ?? ''))
  })
}

/** The pull requests in what `gh pr list --json …` printed; null when it is no list. */
export function ghPrs(stdout: string): GhPr[] | null {
  let list: unknown
  try {
    list = JSON.parse(stdout)
  } catch {
    return null
  }
  if (!Array.isArray(list)) {
    return null
  }
  const prs: GhPr[] = []
  for (const raw of list) {
    if (raw === null || typeof raw !== 'object') {
      continue
    }
    const entry = raw as Record<string, unknown>
    if (typeof entry.number !== 'number' || !isPrState(entry.state) || typeof entry.headRefName !== 'string') {
      continue
    }
    prs.push({
      number: entry.number,
      state: entry.state,
      headRefName: entry.headRefName,
      isDraft: entry.isDraft === true,
      reviewDecision:
        typeof entry.reviewDecision === 'string' && entry.reviewDecision !== '' ? entry.reviewDecision : null,
      isCiRed: ciRed(entry.statusCheckRollup),
    })
  }

  return prs
}

/**
 * One list from two gh readings: the open pull requests with their checks, review and draft, and
 * all pull requests with number, state and branch only (cheap). An open one's full entry wins;
 * null when neither could be read.
 */
export function mergePrs(open: readonly GhPr[] | null, all: readonly GhPr[] | null): GhPr[] | null {
  if (open === null && all === null) {
    return null
  }
  const byNumber = new Map<number, GhPr>()
  for (const pr of all ?? []) {
    byNumber.set(pr.number, pr)
  }
  for (const pr of open ?? []) {
    byNumber.set(pr.number, pr)
  }

  return [...byNumber.values()].sort((a, b) => b.number - a.number)
}

export type StatusArt =
  | 'laeuft'
  | 'abgebrochen'
  | 'fehler'
  | 'pr-offen'
  | 'pr-gemerged'
  | 'pr-geschlossen'
  | 'in-arbeit'
  | 'ruht'

/** Where a session stands: its sign, a German label, and `rang` (lower first: what needs the person). */
export type Status = {
  art: StatusArt
  mark: string
  label: string
  rang: number
  /** The pull request the status names, if any. */
  pr: number | null
  /** For a resting session: the whole days since it was last active; null otherwise. */
  tage: number | null
}

/** A session with no activity for longer than this rests: a candidate to archive. */
export const RUHT_AB_MS = 3 * 24 * 60 * 60_000
const TAG_MS = 24 * 60 * 60_000

type SessionPr = { number: number; state: PrState; zusatz: string[]; isUrgent: boolean }

/**
 * The session's pull request. The one the app names comes first, with its number and state;
 * `gh` adds what it waits for (CI, review, draft). Without one from the app, the newest
 * `gh` lists for the session's branch.
 */
function prFor(session: ListedSession, prs: readonly GhPr[] | null): SessionPr | null {
  const listed = prs ?? []
  const app = session.appPr
  const own =
    app !== null
      ? listed.find(pr => pr.number === app.number)
      : listed
          .filter(pr => session.branch !== null && pr.headRefName === session.branch)
          .sort((a, b) => b.number - a.number)[0]
  const number = app?.number ?? own?.number
  const state = app?.state ?? own?.state
  if (number === undefined || state === undefined) {
    return null
  }
  if (own === undefined || state !== 'OPEN') {
    return { number, state, zusatz: [], isUrgent: false }
  }
  const zusatz = [
    own.isCiRed ? 'CI rot' : null,
    own.reviewDecision === 'CHANGES_REQUESTED' ? 'Änderungen gewünscht' : null,
    own.reviewDecision === 'REVIEW_REQUIRED' ? 'Review wartet' : null,
    own.isDraft ? 'Entwurf' : null,
  ].filter((z): z is string => z !== null)

  return { number, state, zusatz, isUrgent: own.isCiRed || own.reviewDecision === 'CHANGES_REQUESTED' }
}

function prText(pr: SessionPr): string {
  const what = pr.state === 'OPEN' ? 'offen' : pr.state === 'MERGED' ? 'gemerged' : 'geschlossen'

  return `PR #${pr.number} ${what}${pr.zusatz.length === 0 ? '' : `, ${pr.zusatz.join(', ')}`}`
}

/**
 * Where a session stands, from its list_sessions row, its last turn (`stand`; absent for a
 * session from before this version), its repository's pull requests (null when `gh` could not
 * list them) and the time now. Running comes first; then a merged or closed pull request (the
 * work is done, whatever the last turn was); then an aborted or failed turn, but only while the
 * session is recent: one left alone for more than three days rests like any other; then an open
 * pull request; without one the session is in work or rests.
 */
export function statusOf(
  session: ListedSession,
  stand: StandEintrag | undefined,
  prs: readonly GhPr[] | null,
  now: number,
): Status {
  const pr = prFor(session, prs)
  const id = pr?.number ?? null
  const withPr = (text: string): string => (pr === null ? text : `${text} · ${prText(pr)}`)
  const status = (art: StatusArt, mark: string, label: string, rang: number): Status => ({
    art,
    mark,
    label,
    rang,
    pr: id,
    tage: null,
  })
  if (session.isRunning) {
    return status('laeuft', '▶', withPr('läuft'), 5)
  }
  if (pr !== null && pr.state !== 'OPEN') {
    return pr.state === 'MERGED'
      ? status('pr-gemerged', '✓', prText(pr), 6)
      : status('pr-geschlossen', '✖', prText(pr), 6)
  }
  const last = lastActive(session, stand)
  const rests = last !== null && now - last > RUHT_AB_MS
  const isFailed = stand?.grund === 'error' || stand?.grund === 'refusal'
  if (!rests && stand?.grund === 'aborted') {
    return status('abgebrochen', '⚠', withPr('abgebrochen'), 0)
  }
  if (!rests && isFailed) {
    return status('fehler', '⚠', withPr(stand?.grund === 'error' ? 'Fehler' : 'Fehler (Modell lehnte ab)'), 0)
  }
  if (pr !== null) {
    return status('pr-offen', '🔀', prText(pr), pr.isUrgent ? 1 : 2)
  }
  if (last !== null && rests) {
    const tage = Math.floor((now - last) / TAG_MS)
    const zuletzt = stand?.grund === 'aborted' ? ', zuletzt abgebrochen' : isFailed ? ', zuletzt Fehler' : ''

    return { ...status('ruht', '💤', `ruht seit ${tage} Tagen, kein PR${zuletzt}`, 7), tage }
  }

  return status('in-arbeit', '✎', 'in Arbeit, kein PR', 4)
}

/** When the session was last active: the later of the app's figure and its last turn; null when neither is known. */
export function lastActive(session: ListedSession, stand: StandEintrag | undefined): number | null {
  const times = [session.lastActivityAt, stand?.um].filter((t): t is number => t !== null && t !== undefined)

  return times.length === 0 ? null : Math.max(...times)
}

/** How long ago, in short German: "gerade eben", "vor 5 Min", "vor 2 Std", "vor 3 Tagen". */
export function alterText(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000)
  if (min < 1) {
    return 'gerade eben'
  }
  if (min < 60) {
    return `vor ${min} Min`
  }
  const std = Math.floor(min / 60)
  if (std < 24) {
    return `vor ${std} Std`
  }
  const tage = Math.floor(std / 24)

  return tage === 1 ? 'vor 1 Tag' : `vor ${tage} Tagen`
}

/** The folder of a session's repository, lowercased as a key: a worktree counts as its repository; null without a project. */
export function repoKeyOf(cwd: string): string | null {
  if (projectOf(cwd) === null) {
    return null
  }
  const path = cwd.replace(/\\/g, '/').replace(/\/+$/, '')
  const cut = path.search(/\/\.claude\/worktrees\//i)

  return (cut >= 0 ? path.slice(0, cut) : path).toLowerCase()
}

/** One session in the overview: its title without color mark, its status and how long ago it was active. */
export type UebersichtZeile = {
  sessionId: string
  title: string
  status: Status
  /** "vor 2 Std"; empty when the app gave no time. */
  alter: string
  /** Milliseconds since the epoch; null when unknown. */
  lastActive: number | null
  isSelf: boolean
  /** The `claude://` address that opens the session; null for this one and when the app gave none. */
  link: string | null
}

/** A project's sessions, most in need of the person first. */
export type UebersichtGruppe = {
  /** The project's name as its folder spells it; null for sessions in no project folder. */
  project: string | null
  /** The project's color mark in the set in use; null without a project. */
  mark: string | null
  zeilen: UebersichtZeile[]
}

/** Every open session by project: what `/projektfarbe status` prints and a side panel can draw. */
export type Uebersicht = {
  gruppen: UebersichtGruppe[]
  /** Why some pull requests could not be read, one line per repository. */
  hinweise: string[]
}

/** What the overview is built from: the sessions, their last turns, each repository's pull requests. */
export type UebersichtDaten = {
  sessions: readonly ListedSession[]
  selfId: string | null
  stand: Readonly<Record<string, StandEintrag>>
  /** By `repoKeyOf`; null where `gh` could not list them. */
  prs: ReadonlyMap<string, readonly GhPr[] | null>
  /** The project's color mark, for the group heading. */
  markOf: (project: string) => string
  now: number
  hinweise?: readonly string[]
}

const byRang = (a: UebersichtZeile, b: UebersichtZeile): number =>
  a.status.rang - b.status.rang || (b.lastActive ?? 0) - (a.lastActive ?? 0)

/**
 * Groups the open sessions by project (case-insensitively, like the sidebar), each group by `rang`
 * and then the most recent first; the groups by their most urgent session, then by name.
 * Sessions in no project folder come last. Archived sessions are left out.
 */
export function buildUebersicht(daten: UebersichtDaten): Uebersicht {
  const groups = new Map<string, UebersichtGruppe>()
  for (const session of daten.sessions) {
    if (session.isArchived) {
      continue
    }
    const project = projectOf(session.cwd)
    const repo = repoKeyOf(session.cwd)
    const stand = daten.stand[session.sessionId]
    const prs = repo === null ? null : (daten.prs.get(repo) ?? null)
    const last = lastActive(session, stand)
    const key = project?.toLowerCase() ?? ''
    const group = groups.get(key) ?? {
      project,
      mark: project === null ? null : daten.markOf(project),
      zeilen: [],
    }
    group.zeilen.push({
      sessionId: session.sessionId,
      title: stripMark(session.title),
      status: statusOf(session, stand, prs, daten.now),
      alter: last === null ? '' : alterText(daten.now - last),
      lastActive: last,
      isSelf: session.sessionId === daten.selfId,
      link: session.sessionId === daten.selfId ? null : session.link,
    })
    groups.set(key, group)
  }
  const gruppen = [...groups.values()]
  for (const group of gruppen) {
    group.zeilen.sort(byRang)
  }
  const best = (group: UebersichtGruppe): number => group.zeilen[0]?.status.rang ?? Infinity
  gruppen.sort((a, b) => {
    if ((a.project === null) !== (b.project === null)) {
      return a.project === null ? 1 : -1
    }

    return best(a) - best(b) || (a.project ?? '').localeCompare(b.project ?? '')
  })

  return { gruppen, hinweise: [...(daten.hinweise ?? [])] }
}

/** The overview as text: a heading per project with its mark, one line per session. */
export function uebersichtText(uebersicht: Uebersicht): string {
  const count = uebersicht.gruppen.reduce((n, group) => n + group.zeilen.length, 0)
  if (count === 0) {
    return 'Keine offenen Sessions gefunden.'
  }
  const lines = [`${count} offene Session(s), was Aufmerksamkeit braucht zuerst:`]
  for (const group of uebersicht.gruppen) {
    lines.push('', group.project === null ? 'Ohne Projekt' : `${group.mark ?? ''} ${group.project}`.trim())
    for (const zeile of group.zeilen) {
      const self = zeile.isSelf ? ' (diese)' : ''
      const alter = zeile.alter === '' ? '' : ` · ${zeile.alter}`
      lines.push(`  ${zeile.status.mark} ${zeile.title}${self} — ${zeile.status.label}${alter}`)
    }
  }
  if (uebersicht.hinweise.length > 0) {
    lines.push('', ...uebersicht.hinweise)
  }

  return lines.join('\n')
}

/** The figures of the panel's top line; the panel leaves out the ones that are zero. */
export type Zaehler = { sessions: number; dringend: number; dudran: number; pr: number; ruht: number }

export function uebersichtZaehler(uebersicht: Uebersicht): Zaehler {
  const zeilen = uebersicht.gruppen.flatMap(group => group.zeilen)
  const bereiche = buildBereiche(uebersicht)
  const size = (id: BereichId): number => bereiche.find(bereich => bereich.id === id)?.zeilen.length ?? 0
  const count = (art: StatusArt): number => zeilen.filter(z => z.status.art === art).length

  return {
    sessions: zeilen.length,
    dringend: size('dringend'),
    dudran: size('dudran'),
    pr: count('pr-offen'),
    ruht: count('ruht'),
  }
}

/**
 * Why the panel may offer to archive a session, or null when it may not: it rests, or its pull
 * request is merged or closed. The session the panel runs in is never offered (archiving ends it).
 */
export function archiveReason(zeile: UebersichtZeile): string | null {
  if (zeile.isSelf) {
    return null
  }
  const { art, pr, tage } = zeile.status
  if (art === 'ruht' && tage !== null) {
    return `ruht seit ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`
  }
  if ((art === 'pr-gemerged' || art === 'pr-geschlossen') && pr !== null) {
    return `PR #${pr} ${art === 'pr-gemerged' ? 'gemerged' : 'geschlossen'}`
  }

  return null
}

export type BereichId = 'dringend' | 'dudran' | 'review' | 'laeuft' | 'aufraeumen'

/** One session of a section, with the project it belongs to. */
export type BereichZeile = UebersichtZeile & { project: string | null; mark: string | null }

/** The overview cut by what the person should do about it, not by project. */
export type Bereich = { id: BereichId; titel: string; zeichen: string; zeilen: BereichZeile[] }

const BEREICHE: readonly { id: BereichId; titel: string; zeichen: string }[] = [
  { id: 'dringend', titel: 'Braucht dich: Problem', zeichen: '⚠' },
  { id: 'dudran', titel: 'Du bist dran: Claude wartet', zeichen: '💬' },
  { id: 'review', titel: 'PR wartet auf Review oder Merge', zeichen: '🔀' },
  { id: 'laeuft', titel: 'Läuft, nichts zu tun', zeichen: '▶' },
  { id: 'aufraeumen', titel: 'Aufräumen', zeichen: '🧹' },
]

/**
 * Where a session goes. A problem (aborted, failed, or a pull request with a red CI or changes
 * wanted) needs the person; a session that is stopped and in work has finished its turn, so the
 * next move is theirs (the app does not say whether it asked something, only that it stopped);
 * this very session counts as running. Open pull requests wait on others, running ones need nothing,
 * merged, closed and resting ones can be archived.
 */
export function bereichOf(zeile: UebersichtZeile): BereichId {
  const { art, rang } = zeile.status
  if (art === 'abgebrochen' || art === 'fehler' || (art === 'pr-offen' && rang <= 1)) {
    return 'dringend'
  }
  if (art === 'in-arbeit' && !zeile.isSelf) {
    return 'dudran'
  }
  if (art === 'pr-offen') {
    return 'review'
  }
  if (art === 'laeuft' || art === 'in-arbeit') {
    return 'laeuft'
  }

  return 'aufraeumen'
}

/**
 * The overview by status, in the order of what the person should look at first. Empty sections are
 * left out; inside one, the most urgent and then the most recent first.
 */
export function buildBereiche(uebersicht: Uebersicht): Bereich[] {
  const alle: BereichZeile[] = uebersicht.gruppen.flatMap(group =>
    group.zeilen.map(zeile => ({ ...zeile, project: group.project, mark: group.mark })),
  )
  const bereiche = BEREICHE.map(bereich => ({
    ...bereich,
    zeilen: alle
      .filter(zeile => bereichOf(zeile) === bereich.id)
      .sort(byRang),
  }))

  return bereiche.filter(bereich => bereich.zeilen.length > 0)
}

// ---------------------------------------------------------------- Bramble

/** Where the Bramble repository is when nothing else is named: under the person's own repositories. */
export const BRAMBLE_HOME = ['Documents', 'Repositories', 'LightWeightBrowser']

/** The Bramble profile links from the band open in: its own, so they never overwrite the person's saved tabs. */
export const BRAMBLE_PROFILE = 'projektfarben'

const winPath = (...parts: string[]): string => parts.map(p => p.replace(/[\\/]+$/, '').replace(/\//g, '\\')).join('\\')

/** The repository folder: `BRAMBLE_REPO` when set, else `BRAMBLE_HOME` under the home folder; null without either. */
export function brambleRoot(own: string | undefined, home: string | undefined): string | null {
  if (own !== undefined && own.trim() !== '') {
    return winPath(own.trim())
  }

  return home === undefined || home.trim() === '' ? null : winPath(home.trim(), ...BRAMBLE_HOME)
}

/** Every place a release build may be: the repository's own and each of its worktrees'. */
export function brambleKandidaten(root: string, worktrees: readonly string[]): string[] {
  const exe = ['target', 'release', 'bramble.exe']

  return [winPath(root, ...exe), ...worktrees.map(name => winPath(root, '.claude', 'worktrees', name, ...exe))]
}

/** The newest of the builds found, by the time it was built; null when there is none. */
export function neuesterBuild(builds: readonly { path: string; mtimeMs: number }[]): string | null {
  return builds.reduce<{ path: string; mtimeMs: number } | null>(
    (best, build) => (best === null || build.mtimeMs > best.mtimeMs ? build : best),
    null,
  )?.path ?? null
}

/**
 * How to start Bramble on one address and leave it running: `Start-Process` detaches it from the call,
 * which would otherwise wait for the window to close. The path goes in a variable, not in the command,
 * so no quoting can break it; Bramble takes its start address from `LWB_URL`.
 */
export function brambleStart(exe: string, url: string): { argv: string[]; env: Record<string, string> } {
  return {
    argv: ['powershell', '-NoProfile', '-NonInteractive', '-Command', 'Start-Process -FilePath $env:BRAMBLE_EXE'],
    env: { BRAMBLE_EXE: exe, LWB_URL: url, LWB_PROFILE: BRAMBLE_PROFILE, LWB_NO_PINS: '1' },
  }
}
