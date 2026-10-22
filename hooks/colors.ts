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

/** How many of the gauge's cells are filled: in proportion to the percentage, at least one once there is any use. */
export function contextFill(percent: number): number {
  const cells = Math.round((percent / 100) * CONTEXT_CELLS)

  return Math.min(CONTEXT_CELLS, Math.max(percent > 0 ? 1 : 0, cells))
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

/** The number of open pull requests from the JSON `gh pr list --json number` prints; null when it is no list. */
export function prCount(stdout: string): number | null {
  return ghNumbers(stdout)?.length ?? null
}

/** The count as the band shows it. */
export function prLabel(count: number): string {
  return count > PR_LIMIT ? `${PR_LIMIT}+` : String(count)
}

/** What the band counts for a repository: its pull requests and its issues. */
export type Art = 'pr' | 'issue'

/** The highest number seen of each kind, per project (lowercased), from the store key `gesehen`. */
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
 * Marks these open numbers as seen for a project. With `isFirstOnly`, only where nothing was seen
 * yet: the first reading is the baseline, so it shows no "+x". The highest seen never goes down.
 * Returns the same object when nothing changed.
 */
export function markSeen(
  seen: Gesehen,
  project: string,
  art: Art,
  numbers: readonly number[],
  isFirstOnly: boolean,
): Gesehen {
  const key = project.toLowerCase()
  const before = seen[key]?.[art]
  if (isFirstOnly && before !== undefined) {
    return seen
  }
  const after = Math.max(before ?? 0, ...numbers)
  if (after === before) {
    return seen
  }

  return { ...seen, [key]: { ...seen[key], [art]: after } }
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
