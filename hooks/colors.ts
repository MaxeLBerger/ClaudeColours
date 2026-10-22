// Pure helpers: which project a folder belongs to, which color it has,
// and what a session title looks like with the color mark in front.
// No project is named here: colors live in the mod's own store, per person.

export type Farbe = { name: string; mark: string; hex: string }

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

const PLATZHALTER = new Set(['', 'new session', 'neue session', 'untitled', 'unbenannt'])

const byName = (name: string): Farbe | undefined => FARBEN.find(f => f.name === name)
const byMark = (mark: string): Farbe | undefined => FARBEN.find(f => f.mark === mark)

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

/** A color from a project's name, the same every time: used once all 18 are taken. */
function hashFarbe(project: string): Farbe {
  let hash = 0
  for (const ch of project.toLowerCase()) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  }

  return FARBEN[hash % FARBEN.length] ?? FARBEN[0]!
}

/** The color a project with none gets: the first no other project has, else one from its name. */
export function nextFarbe(project: string, picks: Readonly<Record<string, string>>): Farbe {
  const taken = new Set(Object.values(picks))
  const free = REIHENFOLGE.map(byName).find(f => f !== undefined && !taken.has(f.mark))

  return free ?? hashFarbe(project)
}

/** The project's color: the stored one, else the one it would be handed now. */
export function farbeFor(project: string, picks: Readonly<Record<string, string>>): Farbe {
  const picked = picks[project.toLowerCase()]

  return (picked === undefined ? undefined : byMark(picked)) ?? nextFarbe(project, picks)
}

/** The picks with a color recorded for each project that has none yet, in the order given. */
export function assignFarben(
  projects: readonly string[],
  picks: Readonly<Record<string, string>>,
): Record<string, string> {
  const next: Record<string, string> = { ...picks }
  for (const project of projects) {
    const key = project.toLowerCase()
    if (next[key] === undefined || byMark(next[key]) === undefined) {
      next[key] = nextFarbe(project, next).mark
    }
  }

  return next
}

/** A color from what the person typed: its name (grün, weiß and kreis-… work) or its emoji. */
export function findFarbe(input: string): Farbe | undefined {
  const text = input.trim()
  const name = text
    .toLowerCase()
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')

  return byName(name) ?? FARBEN.find(f => text.startsWith(f.mark))
}

/** The color mark a title starts with, if any. */
export function markOf(title: string): Farbe | undefined {
  const text = title.trim()

  return FARBEN.find(f => text.startsWith(f.mark))
}

/** The title without a color mark in front. */
export function stripMark(title: string): string {
  const text = title.trim()
  const farbe = markOf(text)

  return farbe === undefined ? text : text.slice(farbe.mark.length).replace(/^️/, '').trim()
}

/** The title with `mark` in front, or null while the app has not named the session yet. */
export function desiredTitle(title: string, mark: string): string | null {
  const bare = stripMark(title)
  if (PLATZHALTER.has(bare.toLowerCase())) {
    return null
  }

  return `${mark} ${bare}`
}

/** The person's picks from the store, keeping only well-formed entries. */
export function readPicks(raw: unknown): Record<string, string> {
  const picks: Record<string, string> = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return picks
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && byMark(value) !== undefined) {
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
 * The colors the sidebar already shows: per project, the mark most of its
 * sessions carry (the first seen on a tie). Sessions without a mark count for nothing.
 */
export function learnPicks(rows: readonly SessionRow[]): Record<string, string> {
  const tally = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const project = projectOf(row.cwd)
    const farbe = markOf(row.title)
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

export function planTitle(row: SessionRow, picks: Readonly<Record<string, string>>): TitlePlan {
  const project = projectOf(row.cwd)
  if (project === null) {
    return { kind: 'no-project' }
  }
  const wanted = desiredTitle(row.title, farbeFor(project, picks).mark)
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

/** `gh pr list` is asked for this many pull requests at most; a list that long shows as "100+". */
export const PR_LIMIT = 100

/** The number of open pull requests from the JSON `gh pr list --json number` prints; null when it is no list. */
export function prCount(stdout: string): number | null {
  try {
    const list: unknown = JSON.parse(stdout)

    return Array.isArray(list) ? list.length : null
  } catch {
    return null
  }
}

/** The count as the band shows it. */
export function prLabel(count: number): string {
  return count >= PR_LIMIT ? `${PR_LIMIT}+` : String(count)
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
