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

/** Conclusions (check runs) and states (commit statuses) that make the CI red. */
const CI_ROT = new Set(['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE'])

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
 * list them) and the time now. Running beats an aborted or failed turn, that beats the pull
 * request; without one the session is in work or, inactive for more than three days, rests.
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
  if (session.isRunning) {
    return { art: 'laeuft', mark: '▶', label: withPr('läuft'), rang: 5, pr: id }
  }
  if (stand?.grund === 'aborted') {
    return { art: 'abgebrochen', mark: '⚠', label: withPr('abgebrochen'), rang: 0, pr: id }
  }
  if (stand?.grund === 'error' || stand?.grund === 'refusal') {
    const text = stand.grund === 'error' ? 'Fehler' : 'Fehler (Modell lehnte ab)'

    return { art: 'fehler', mark: '⚠', label: withPr(text), rang: 0, pr: id }
  }
  if (pr !== null) {
    if (pr.state === 'OPEN') {
      return { art: 'pr-offen', mark: '🔀', label: prText(pr), rang: pr.isUrgent ? 1 : 2, pr: id }
    }

    return pr.state === 'MERGED'
      ? { art: 'pr-gemerged', mark: '✓', label: prText(pr), rang: 6, pr: id }
      : { art: 'pr-geschlossen', mark: '✖', label: prText(pr), rang: 6, pr: id }
  }
  const last = lastActive(session, stand)
  if (last !== null && now - last > RUHT_AB_MS) {
    const tage = Math.floor((now - last) / TAG_MS)

    return { art: 'ruht', mark: '💤', label: `ruht seit ${tage} Tagen, kein PR`, rang: 7, pr: null }
  }

  return { art: 'in-arbeit', mark: '✎', label: 'in Arbeit, kein PR', rang: 4, pr: null }
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
