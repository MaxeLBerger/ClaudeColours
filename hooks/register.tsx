import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpContentBlock, Register } from 'claude-code'

import type { ProjektfarbenPanel, ProjektfarbenView } from '../types'
import {
  archiveReason,
  assignFarben,
  buildBereiche,
  buildUebersicht,
  BUNT,
  CONTEXT_CELLS,
  contextFill,
  contextLevel,
  contextPercent,
  farbeFor,
  findFarbe,
  findSatz,
  ghNumbers,
  ghPrs,
  learnPicks,
  markSeen,
  modusLabel,
  newCount,
  planTitle,
  PR_LIMIT,
  prLabel,
  projectOf,
  readPicks,
  readSeen,
  readStand,
  readTried,
  rememberStand,
  rememberTry,
  repoKeyOf,
  SAETZE,
  satzOf,
  SCHLAFSAETZE,
  superscript,
  toListed,
  toRow,
  uebersichtSummary,
  uebersichtText,
  type Art,
  type BereichZeile,
  type Farbe,
  type GhPr,
  type Grund,
  type ListedSession,
  type Satz,
  type SessionRow,
  type TitlePlan,
  type Uebersicht,
  type UebersichtZeile,
} from './colors'

type Engine = EngineInterface
type Outcome = TitlePlan['kind'] | 'renamed' | 'failed' | 'skipped'

// The desktop app's own session tools: the same ones Claude renames sessions with.
const SERVER = 'ccd_session_mgmt'
// A session the app had not named yet when its turn ended is looked at once more.
const RETRY_MS = 20_000
const EMPTY: ProjektfarbenView = {
  project: null,
  mark: null,
  hex: null,
  contextPercent: null,
  openPrs: null,
  prsNote: null,
  prNumbers: [],
  newPrs: 0,
  openIssues: null,
  issuesNote: null,
  issueNumbers: [],
  newIssues: 0,
  repoUrl: null,
  satz: BUNT.id,
  isPicking: false,
  isHidden: false,
}
const view = atom({ plugin: 'projektfarben', key: 'view' } as const, EMPTY)

// The side panel with the overview of all sessions; its data is the one `/projektfarbe status` prints.
const PANEL = 'uebersicht'
const PANEL_EVERY_MS = 60_000
const EMPTY_PANEL: ProjektfarbenPanel = { daten: null, isLoading: false, fehler: null, um: null, isOpen: false, ansicht: 'status' }
const panel = atom({ plugin: 'projektfarben', key: 'uebersicht' } as const, EMPTY_PANEL)

// Theme keys, so the gauge follows the person's theme: a calm gray bar on a fainter track,
// the warning and error colors from where the window is filling up.
const CONTEXT_FILL = { ok: 'inactive', warn: 'warning', full: 'error' } as const
const CONTEXT_TRACK = 'subtle'
// The theme color of the raised "+x" behind a count: new pull requests or issues.
const NEW_COLOR = 'suggestion'

// The color block and the gauge are runs of these on a colored background: on the desktop plain
// runs of spaces collapse, and empty Boxes sat a few pixels off the line of the text beside them.
const NBSP = String.fromCharCode(0xa0)

const textOf = (content: readonly McpContentBlock[]): string =>
  content.map(block => (block.type === 'text' ? (block.text ?? '') : '')).join('')

async function callJson($: Engine, tool: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await $.mcp.call(SERVER, tool, args)
  const text = textOf(result.content)
  if (result.isError) {
    throw new Error(text === '' ? `${tool} failed` : text)
  }

  return JSON.parse(text) as unknown
}

/** The color set in use: the bright one unless the person turned sleep mode on. */
const satzNow = async ($: Engine): Promise<Satz> => satzOf(await $.store.get('modus'))

const picksOf = async ($: Engine, satz: Satz): Promise<Record<string, string>> =>
  readPicks(await $.store.get(satz.storeKey), satz)

/** The picks, with a color handed to each of these projects that has none yet (and stored). */
async function ensurePicks(
  $: Engine,
  projects: readonly string[],
  satz: Satz,
): Promise<Record<string, string>> {
  const picks = await picksOf($, satz)
  const next = assignFarben(projects, picks, satz)
  if (Object.keys(next).length !== Object.keys(picks).length) {
    await $.store.set(satz.storeKey, next)
  }

  return next
}

/** Every open session but this one, from the app. */
async function listRows($: Engine): Promise<SessionRow[]> {
  const listed = await callJson($, 'list_sessions', { limit: 500 })

  return (Array.isArray(listed) ? listed : [])
    .map(entry => toRow(entry))
    .filter((row): row is SessionRow => row !== null)
}

/**
 * Once per person: takes the colors the sidebar already shows into the store,
 * so marks set before this mod (or by an earlier version) keep their project's color.
 * Only the bright set is learned: sleep mode starts after the mod, with nothing to keep.
 * Left undone when the app cannot be asked, and tried again at the next start.
 */
async function learnOnce($: Engine): Promise<void> {
  if ((await $.store.get('gelernt')) === true) {
    return
  }
  const self = toRow(await callJson($, 'get_session', { session_id: 'self' }), 'self')
  const rows = await listRows($)
  const learned = learnPicks(self === null ? rows : [self, ...rows], BUNT)
  await $.store.set(BUNT.storeKey, { ...(await picksOf($, BUNT)), ...learned })
  await $.store.set('gelernt', true)
}

async function rename($: Engine, sessionId: string, title: string): Promise<Outcome> {
  const result = await $.mcp.call(SERVER, 'set_session_title', { session_id: sessionId, title })

  return result.isError ? 'failed' : 'renamed'
}

/** Puts the project's color mark in front of one session's title. */
async function recolor(
  $: Engine,
  row: SessionRow,
  picks: Record<string, string>,
  satz: Satz,
): Promise<Outcome> {
  const plan = planTitle(row, picks, satz)

  return plan.kind === 'rename' ? rename($, row.sessionId, plan.title) : plan.kind
}

/**
 * Recolors this session's own title. A title it already tried is left alone, even
 * after a restart: a title the person set makes the app ask them, and one no is enough.
 */
async function recolorSelf($: Engine, force: boolean, known?: SessionRow | null): Promise<Outcome> {
  const row = known !== undefined ? known : toRow(await callJson($, 'get_session', { session_id: 'self' }), 'self')
  if (row === null) {
    return 'failed'
  }
  const satz = await satzNow($)
  const project = projectOf(row.cwd)
  const plan = planTitle(row, await ensurePicks($, project === null ? [] : [project], satz), satz)
  if (plan.kind !== 'rename') {
    return plan.kind
  }
  const tried = readTried(await $.store.get('versucht'))
  if (!force && tried[row.sessionId] === row.title) {
    return 'skipped'
  }
  // Written before the rename, which may wait on the person's answer in the app.
  await $.store.set('versucht', rememberTry(tried, row.sessionId, row.title))

  return rename($, 'self', plan.title)
}

/** Stores why this session's turn ended and when, for `/projektfarbe status` in every session. */
async function recordStand($: Engine, sessionId: string, grund: Grund): Promise<void> {
  const um = await $.clock.now()
  const stand = readStand(await $.store.get('stand'))
  await $.store.set('stand', rememberStand(stand, sessionId, { grund, um }))
}

/**
 * After a turn: the session's last turn is stored, the band follows a color picked
 * in another session, and the title gets its mark.
 */
async function afterTurn($: Engine, grund: Grund): Promise<void> {
  // Asked first and stored on its own, so a band that cannot be refreshed still leaves the stand.
  const self = callJson($, 'get_session', { session_id: 'self' }).then(raw => toRow(raw, 'self'))
  void self
    .then(row => (row === null ? undefined : recordStand($, row.sessionId, grund)))
    .catch(() => undefined)
  const cwd = await $.session.cwd()
  await refreshView($, cwd)
  void refreshPrs($, cwd, false).catch(() => undefined)
  void refreshPanel($).catch(() => undefined)
  if ((await recolorSelf($, false, await self)) === 'unnamed') {
    $.clock.after(RETRY_MS, () => {
      void recolorSelf($, false).catch(() => undefined)
    })
  }
}

/** Recolors every open session, or those of one project. Returns how many it renamed. */
async function recolorAll($: Engine, onlyProject: string | null): Promise<number> {
  const satz = await satzNow($)
  const rows = await listRows($)
  const projects = rows.map(row => projectOf(row.cwd)).filter((p): p is string => p !== null)
  const picks = await ensurePicks($, projects, satz)
  const wanted = onlyProject?.toLowerCase()
  let renamed = (await recolorSelf($, true)) === 'renamed' ? 1 : 0
  for (const row of rows) {
    if (wanted !== undefined && projectOf(row.cwd)?.toLowerCase() !== wanted) {
      continue
    }
    try {
      renamed += (await recolor($, row, picks, satz)) === 'renamed' ? 1 : 0
    } catch {
      // One session that cannot be renamed does not stop the others.
    }
  }

  return renamed
}

/** How full the context window is: a local read of the figures the status line has, no model call. */
async function readContext($: Engine): Promise<number | null> {
  try {
    return contextPercent(await $.session.usage())
  } catch {
    return null
  }
}

/** Reads the project, its color and the context fill into the band's state. */
async function refreshView($: Engine, cwd: string): Promise<void> {
  const satz = await satzNow($)
  const project = projectOf(cwd)
  const farbe =
    project === null ? null : farbeFor(project, await ensurePicks($, [project], satz), satz)
  const isHidden = (await $.store.get('bandAus')) === true
  const percent = await readContext($)
  await update($, view, v => ({
    ...v,
    project,
    mark: farbe?.mark ?? null,
    hex: farbe?.hex ?? null,
    contextPercent: percent,
    satz: satz.id,
    isHidden,
  }))
  await refreshNew($)
}

/**
 * How many of the open pull requests and issues are new to the person. The highest numbers seen
 * are shared by all sessions: one that opened the list in the browser clears the "+x" in the others.
 */
async function refreshNew($: Engine): Promise<void> {
  const { project } = await read($, view)
  const seen = project === null ? undefined : readSeen(await $.store.get('gesehen'))[project.toLowerCase()]
  await update($, view, v => ({
    ...v,
    newPrs: newCount(v.prNumbers, seen?.pr),
    newIssues: newCount(v.issueNumbers, seen?.issue),
  }))
}

const PR_EVERY_MS = 5 * 60_000
// When, and in which folder, the pull requests and issues were last counted; starts over with a reload.
let prsCheckedAt: number | null = null
let prsFor: string | null = null

const firstLine = (text: string): string => text.trim().split(/\r?\n/)[0]?.slice(0, 120) ?? ''

/** The open pull requests or issues of the session's repository, listed by `gh` with the person's own login. */
async function readOpen($: Engine, art: Art): Promise<{ numbers: number[] | null; note: string | null }> {
  try {
    const { exitCode, stdout, stderr } = await $.process.run(
      // One more than the band shows: that is how "100" and "more than 100" are told apart.
      ['gh', art, 'list', '--state', 'open', '--limit', String(PR_LIMIT + 1), '--json', 'number'],
      { timeoutMs: 20_000 },
    )
    if (exitCode !== 0) {
      return { numbers: null, note: `gh meldet: ${firstLine(stderr)}` }
    }
    const numbers = ghNumbers(stdout)

    return { numbers, note: numbers === null ? 'gh antwortet in einem unerwarteten Format' : null }
  } catch (error) {
    return { numbers: null, note: `gh lässt sich hier nicht starten (${firstLine(String(error))})` }
  }
}

/** The web address of the session's repository, from `gh`; null when it cannot tell. */
async function readRepoUrl($: Engine): Promise<string | null> {
  try {
    const { exitCode, stdout } = await $.process.run(
      ['gh', 'repo', 'view', '--json', 'url', '--jq', '.url'],
      { timeoutMs: 20_000 },
    )
    const url = stdout.trim()

    return exitCode === 0 && /^https:\/\/\S+$/.test(url) ? url : null
  } catch {
    return null
  }
}

// The folder whose repository address the band holds; read once per folder, again after a failure.
let urlFor: string | null = null

/**
 * Opens the list of open pull requests or issues in the person's browser and, once it opened,
 * marks every one open now as seen: the "+x" goes, in every session of the project.
 */
async function openList($: Engine, art: Art): Promise<void> {
  const what = art === 'pr' ? 'PR-Liste' : 'Issue-Liste'
  try {
    const { exitCode, stderr } = await $.process.run(['gh', art, 'list', '--web'], {
      timeoutMs: 15_000,
    })
    if (exitCode !== 0) {
      $.ui.toast(`${what} lässt sich nicht öffnen: ${firstLine(stderr)}`)

      return
    }
  } catch (error) {
    $.ui.toast(`${what} lässt sich nicht öffnen: ${firstLine(String(error))}`)

    return
  }
  // Read again: the list in the browser can hold entries newer than the band's last reading.
  const fresh = (await readOpen($, art)).numbers
  if (fresh !== null) {
    await update($, view, v =>
      art === 'pr'
        ? { ...v, openPrs: fresh.length, prNumbers: fresh, prsNote: null }
        : { ...v, openIssues: fresh.length, issueNumbers: fresh, issuesNote: null },
    )
  }
  const state = await read($, view)
  if (state.project === null) {
    return
  }
  const numbers = art === 'pr' ? state.prNumbers : state.issueNumbers
  const seen = readSeen(await $.store.get('gesehen'))
  const next = markSeen(seen, state.project, art, numbers, false)
  if (next !== seen) {
    await $.store.set('gesehen', next)
  }
  await refreshNew($)
}

/**
 * Counts the open pull requests and issues into the band's state: at most every five minutes for
 * one folder, at once for another, unless forced. A folder without a project has no band: no count.
 * The first reading of a project is its baseline: what is open then is not new.
 */
async function refreshPrs($: Engine, cwd: string, isForced: boolean): Promise<void> {
  const project = projectOf(cwd)
  if (project === null) {
    return
  }
  const now = await $.clock.now()
  const isSameFolder = cwd === prsFor
  if (!isForced && isSameFolder && prsCheckedAt !== null && now - prsCheckedAt < PR_EVERY_MS) {
    return
  }
  prsCheckedAt = now
  prsFor = cwd
  const needsUrl = urlFor !== cwd
  const [prs, issues, url] = await Promise.all([
    readOpen($, 'pr'),
    readOpen($, 'issue'),
    needsUrl ? readRepoUrl($) : Promise.resolve(undefined),
  ])
  if (url !== undefined && url !== null) {
    urlFor = cwd
  }
  // A reading that fails keeps the last good one, but only of the same folder.
  await update($, view, v => ({
    ...v,
    repoUrl: url === undefined ? v.repoUrl : (url ?? (isSameFolder ? v.repoUrl : null)),
    openPrs: prs.numbers?.length ?? (isSameFolder ? v.openPrs : null),
    prNumbers: prs.numbers ?? (isSameFolder ? v.prNumbers : []),
    prsNote: prs.note,
    openIssues: issues.numbers?.length ?? (isSameFolder ? v.openIssues : null),
    issueNumbers: issues.numbers ?? (isSameFolder ? v.issueNumbers : []),
    issuesNote: issues.note,
  }))
  const seen = readSeen(await $.store.get('gesehen'))
  let next = seen
  if (prs.numbers !== null) {
    next = markSeen(next, project, 'pr', prs.numbers, true)
  }
  if (issues.numbers !== null) {
    next = markSeen(next, project, 'issue', issues.numbers, true)
  }
  if (next !== seen) {
    await $.store.set('gesehen', next)
  }
  await refreshNew($)
}

// Newest first, as gh lists them: enough to reach the pull requests of every open session.
const STATUS_PR_LIMIT = 200
const STATUS_GH_MS = 20_000

/** Every pull request of one repository, read in a folder of it; null and why when gh could not list them. */
async function readRepoPrs($: Engine, cwd: string): Promise<{ prs: GhPr[] | null; note: string | null }> {
  try {
    const { exitCode, stdout, stderr } = await $.process.run(
      [
        'gh', 'pr', 'list', '--state', 'all', '--limit', String(STATUS_PR_LIMIT),
        '--json', 'number,state,headRefName,isDraft,reviewDecision,statusCheckRollup',
      ],
      { cwd, timeoutMs: STATUS_GH_MS },
    )
    if (exitCode !== 0) {
      return { prs: null, note: `gh meldet: ${firstLine(stderr)}` }
    }
    const prs = ghPrs(stdout)

    return { prs, note: prs === null ? 'gh antwortet in einem unerwarteten Format' : null }
  } catch (error) {
    return { prs: null, note: `gh lässt sich nicht starten (${firstLine(String(error))})` }
  }
}

/**
 * Where every open session stands, by project: the data `/projektfarbe status` prints (and a side
 * panel can draw). Asks the app for the sessions, and gh once per repository, all repositories
 * at once, each in the folder of one of its sessions.
 */
async function readUebersicht($: Engine): Promise<Uebersicht> {
  const [selfRaw, listed] = await Promise.all([
    callJson($, 'get_session', { session_id: 'self' }),
    callJson($, 'list_sessions', { limit: 500 }),
  ])
  const self = toListed(selfRaw, 'self')
  const others = (Array.isArray(listed) ? listed : [])
    .map(entry => toListed(entry))
    .filter((row): row is ListedSession => row !== null && row.sessionId !== self?.sessionId)
  const sessions = self === null ? others : [self, ...others]

  const folders = new Map<string, { cwd: string; project: string }>()
  for (const session of sessions) {
    const repo = repoKeyOf(session.cwd)
    const project = projectOf(session.cwd)
    if (repo !== null && project !== null && !session.isArchived && !folders.has(repo)) {
      folders.set(repo, { cwd: session.cwd, project })
    }
  }
  const gelesen = await Promise.all(
    [...folders].map(async ([repo, { cwd, project }]) => ({ repo, project, ...(await readRepoPrs($, cwd)) })),
  )
  const prs = new Map(gelesen.map(entry => [entry.repo, entry.prs] as const))
  const hinweise = gelesen
    .filter(entry => entry.note !== null)
    .map(entry => `PR-Stand für ${entry.project} nicht verfügbar: ${entry.note}`)

  const satz = await satzNow($)
  const picks = await picksOf($, satz)

  return buildUebersicht({
    sessions,
    selfId: self?.sessionId ?? null,
    stand: readStand(await $.store.get('stand')),
    prs,
    markOf: project => farbeFor(project, picks, satz).mark,
    now: await $.clock.now(),
    hinweise,
  })
}

/** Reads the overview into the panel's state; a reading already under way is not started twice. */
async function loadPanel($: Engine): Promise<void> {
  if ((await read($, panel)).isLoading) {
    return
  }
  await update($, panel, p => ({ ...p, isLoading: true }))
  try {
    const daten = await readUebersicht($)
    const um = await $.clock.now()
    await update($, panel, p => ({ ...p, daten, um, fehler: null, isLoading: false }))
  } catch (error) {
    await update($, panel, p => ({
      ...p,
      isLoading: false,
      fehler: `Der Stand der Sessions lässt sich nicht lesen (nur in der Desktop-App): ${firstLine(String(error))}`,
    }))
  }
}

/** After a turn: an open panel is read again, at most once a minute. */
async function refreshPanel($: Engine): Promise<void> {
  const { isOpen, um } = await read($, panel)
  if (isOpen && (um === null || (await $.clock.now()) - um >= PANEL_EVERY_MS)) {
    await loadPanel($)
  }
}

/** Opens the panel and reads the overview; false where no surface places it (the terminal, mostly). */
async function openPanel($: Engine): Promise<boolean> {
  const opened = await $.ui.open({ id: PANEL, title: 'Übersicht' })
  if (!opened.isPlaced) {
    return false
  }
  await update($, panel, p => ({ ...p, isOpen: true }))
  void loadPanel($).catch(() => undefined)

  return true
}

/** Archives one session on the person's yes in the app; a no or an error is a toast, the row stays. */
async function archive($: Engine, zeile: UebersichtZeile): Promise<void> {
  const reason = archiveReason(zeile)
  if (reason === null) {
    return
  }
  try {
    const result = await $.mcp.call(SERVER, 'archive_session', { session_id: zeile.sessionId, reason })
    if (result.isError) {
      $.ui.toast(`„${zeile.title}“ bleibt: ${firstLine(textOf(result.content)) || 'nicht archiviert'}`)

      return
    }
  } catch (error) {
    $.ui.toast(`„${zeile.title}“ bleibt: ${firstLine(String(error))}`)

    return
  }
  $.ui.toast(`„${zeile.title}“ archiviert.`)
  await loadPanel($)
}

/** Stores the person's color for this project (null: the next free one) and recolors its sessions. */
async function choose($: Engine, farbe: Farbe | null): Promise<string> {
  const { project } = await read($, view)
  if (project === null) {
    return 'Diese Session liegt in keinem Projektordner, sie hat keine Projektfarbe.'
  }
  const satz = await satzNow($)
  const picks = await picksOf($, satz)
  const key = project.toLowerCase()
  delete picks[key]
  const next = farbe === null ? assignFarben([project], picks, satz) : { ...picks, [key]: farbe.mark }
  await $.store.set(satz.storeKey, next)
  await update($, view, v => ({ ...v, isPicking: false }))
  await refreshView($, await $.session.cwd())
  const now = farbeFor(project, next, satz)
  const renamed = await recolorAll($, project).catch(() => 0)

  return `${now.mark} ${project} ist jetzt ${now.name}; ${renamed} Session(s) umbenannt.`
}

/** Switches the color set (sleep mode or back) and recolors every open session to it. */
async function switchSatz($: Engine, satz: Satz): Promise<string> {
  await $.store.set('modus', satz.id)
  await update($, view, v => ({ ...v, isPicking: false }))
  await refreshView($, await $.session.cwd())
  const renamed = await recolorAll($, null).catch(() => 0)

  return satz === BUNT
    ? `Bunte Farben wieder an; ${renamed} Session(s) umbenannt.`
    : `Schlafmodus (${satz.label}) an; ${renamed} Session(s) umbenannt.`
}

/** At the session's start: learn the sidebar's colors once, draw the band, mark the title. */
async function startUp($: Engine, cwd: string): Promise<void> {
  await learnOnce($).catch(() => undefined)
  await refreshView($, cwd)
  void refreshPrs($, cwd, true).catch(() => undefined)
  await recolorSelf($, false)
}

const hilfe = (satz: Satz): string =>
  [
    '/projektfarbe            zeigt die Farbe dieses Projekts',
    '/projektfarbe <farbe>    setzt sie und färbt alle Sessions des Projekts um',
    '/projektfarbe standard   nächste freie Farbe automatisch',
    '/projektfarbe alle       färbt alle offenen Sessions neu ein',
    '/projektfarbe status     Stand aller offenen Sessions nach Projekt (läuft, abgebrochen, PR, ruht …)',
    '/projektfarbe übersicht  Stand aller Sessions im Seitenpanel (im Terminal als Text)',
    '/projektfarbe band       Band, Kontext-Anzeige, PR- und Issue-Zahl und Farbpunkt am Spinner ein- oder ausblenden',
    '/projektfarbe schlaf     Schlafmodus: ruhige Farben, Formen statt bunter Punkte',
    '/projektfarbe bunt       zurück zu den bunten Farben',
    '',
    `Farben (${satz.label}): ${satz.farben.map(f => `${f.mark} ${f.name}`).join(', ')}`,
  ].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'projektfarbe',
      description: 'Farbe dieses Projekts zeigen oder ändern (Farbpunkt vor den Session-Namen)',
      argumentHint: '[farbe | standard | alle | status | übersicht | band | schlaf | bunt]',
    })
    // In the background, so the session start never waits on the app.
    void startUp($, e.cwd).catch(() => undefined)

    return next(e)
  })

  // After each of the session's own turns (a subagent's are skipped). In the
  // background: the turn never waits on the app or on the person's answer there.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      void afterTurn($, e.reason).catch(() => undefined)
    }

    return next(e)
  })

  on('command.run', { command: 'projektfarbe' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const state = await read($, view)
    const satz = await satzNow($)

    if (arg === '') {
      const name = satz.farben.find(f => f.mark === state.mark)?.name ?? 'keine'
      const head =
        state.project === null
          ? 'Diese Session liegt in keinem Projektordner.'
          : `${state.mark ?? ''} ${state.project}: ${name}${satz === BUNT ? '' : ` (Schlafmodus, ${satz.label})`}`

      const neu = (count: number): string => (count > 0 ? ` (${count} neu)` : '')
      const prs =
        state.openPrs !== null
          ? `\nOffene PRs: ${prLabel(state.openPrs)}${neu(state.newPrs)}`
          : state.prsNote === null
            ? ''
            : `\nPR-Zahl nicht verfügbar: ${state.prsNote}`
      const issues =
        state.openIssues !== null
          ? `\nOffene Issues: ${prLabel(state.openIssues)}${neu(state.newIssues)}`
          : state.issuesNote === null
            ? ''
            : `\nIssue-Zahl nicht verfügbar: ${state.issuesNote}`

      return { text: `${head}${prs}${issues}\n\n${hilfe(satz)}` }
    }
    if (arg === 'alle') {
      const renamed = await recolorAll($, null)

      return { text: `${renamed} Session(s) mit ihrer Projektfarbe umbenannt.` }
    }
    if (arg === 'status') {
      try {
        return { text: uebersichtText(await readUebersicht($)) }
      } catch (error) {
        return {
          text: `Der Stand der Sessions lässt sich nicht lesen (nur in der Desktop-App): ${firstLine(String(error))}`,
        }
      }
    }
    if (arg === 'übersicht' || arg === 'uebersicht') {
      if (await openPanel($)) {
        return { text: 'Übersicht geöffnet.' }
      }
      // No surface places the panel: the same data as text.
      try {
        return { text: uebersichtText(await readUebersicht($)) }
      } catch (error) {
        return {
          text: `Der Stand der Sessions lässt sich nicht lesen (nur in der Desktop-App): ${firstLine(String(error))}`,
        }
      }
    }
    if (arg === 'band') {
      const isHidden = !state.isHidden
      await $.store.set('bandAus', isHidden)
      await update($, view, v => ({ ...v, isHidden }))

      return {
        text: isHidden
          ? 'Band ausgeblendet (mit Kontext-Anzeige, PR- und Issue-Zahl und Farbpunkt am Spinner).'
          : 'Band eingeblendet.',
      }
    }
    if (arg === 'bunt') {
      return { text: await switchSatz($, BUNT) }
    }
    if (arg === 'schlaf' || arg.startsWith('schlaf ')) {
      const wanted = arg.slice('schlaf'.length).trim()
      const sleep = wanted === '' ? SCHLAFSAETZE[0] : findSatz(wanted)
      if (sleep === undefined) {
        return {
          text: `Unbekannter Schlafmodus „${wanted}“. Verfügbar: ${SCHLAFSAETZE.map(s => s.label).join(', ')}.`,
        }
      }

      return { text: await switchSatz($, sleep) }
    }
    if (arg === 'standard') {
      return { text: await choose($, null) }
    }
    const farbe = findFarbe(arg, satz)
    if (farbe === undefined) {
      return { text: `Unbekannte Farbe „${e.args.trim()}“.\n\n${hilfe(satz)}` }
    }

    return { text: await choose($, farbe) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const state = await read($, view)
    const { hex, contextPercent: percent } = state
    // A count that could not be read shows as 0, so the band keeps one shape and never wraps
    // differently; /projektfarbe says why it could not be read.
    const openPrs = state.openPrs ?? 0
    const openIssues = state.openIssues ?? 0
    if (state.isHidden || state.project === null || state.mark === null || hex === null) {
      return next(e)
    }
    const { Box, Button, Link, Text } = $.ui.resolve(e)
    const satz = satzOf(state.satz)
    const isCalm = satz !== BUNT
    const pick = async (farbe: Farbe): Promise<void> => {
      $.ui.toast(await choose($, farbe))
    }
    // The set in use stays as it is; any other one recolors every open session. What counts is
    // the store: another session may have switched since this band last read it.
    const changeMode = async (wanted: Satz): Promise<void> => {
      if (wanted !== (await satzNow($))) {
        $.ui.toast(await switchSatz($, wanted))
      }
    }

    if (state.isPicking) {
      return (
        <Box flexDirection="column">
          <Text dimColor>Farbe für {state.project}:</Text>
          <Box flexWrap="wrap" columnGap={1}>
            {satz.farben.map(farbe => (
              <Button key={`farbe-${farbe.name}`} plain onPress={() => pick(farbe)}>
                {isCalm ? <Text color={farbe.hex}>{farbe.mark}</Text> : farbe.mark}
              </Button>
            ))}
            <Button
              key="abbrechen"
              plain
              onPress={() => update($, view, v => ({ ...v, isPicking: false }))}
            >
              <Text dimColor>abbrechen</Text>
            </Button>
          </Box>
          <Box columnGap={2} marginTop="lg" flexWrap="wrap">
            <Text dimColor>Modus:</Text>
            {SAETZE.map(wanted => (
              <Button key={`modus-${wanted.id}`} plain onPress={() => changeMode(wanted)}>
                <Text bold={wanted === satz} dimColor={wanted !== satz}>
                  {modusLabel(wanted)}
                </Text>
              </Button>
            ))}
            <Text dimColor>benennt alle Sessions um</Text>
          </Box>
        </Box>
      )
    }

    const level = percent === null ? 'ok' : contextLevel(percent)
    const filled = percent === null ? 0 : contextFill(percent)
    const tone =
      level === 'ok' ? { dimColor: true } : { color: CONTEXT_FILL[level], bold: level === 'full' }
    // Subagent views get no gauge: the number is the main session's.
    const showsGauge = percent !== null && e.props.view.agentId === undefined
    const name = (
      <Text>
        {isCalm ? (
          <Text color={hex}>{state.mark}</Text>
        ) : (
          <Text mono backgroundColor={hex}>
            {NBSP.repeat(2)}
          </Text>
        )}
        {/* The theme's text color, so the link around it does not paint the name in its own. */}
        <Text color="text" bold={!isCalm}>{` ${state.project}`}</Text>
      </Text>
    )
    // Only the word is the button: the desktop draws a Button natively and drops the bold count
    // and the colored "+x" inside it, so those stand beside it.
    const count = (art: Art, label: string, open: number, fresh: number) => {
      const key = art === 'pr' ? 'prs' : 'issues'

      return (
        <Box key={`${key}-zahl`}>
          <Button key={key} plain dimColor onPress={() => openList($, art)}>
            {label}
          </Button>
          <Text>
            <Text bold>{` ${prLabel(open)}`}</Text>
            {fresh === 0 ? null : (
              <Text color={NEW_COLOR} bold>
                {superscript(fresh)}
              </Text>
            )}
          </Text>
        </Box>
      )
    }

    return (
      <Box columnGap={2} flexWrap="wrap">
        {state.repoUrl === null ? name : <Link href={state.repoUrl}>{name}</Link>}
        {count('pr', 'PRs:', openPrs, state.newPrs)}
        {count('issue', 'Issues:', openIssues, state.newIssues)}
        {!showsGauge ? null : (
          <Text>{NBSP.repeat(4)}</Text>
        )}
        {!showsGauge ? null : (
          <Text>
            <Text dimColor>Kontext </Text>
            {filled === 0 ? null : (
              <Text mono backgroundColor={CONTEXT_FILL[level]}>
                {NBSP.repeat(filled)}
              </Text>
            )}
            {filled === CONTEXT_CELLS ? null : (
              <Text mono backgroundColor={CONTEXT_TRACK}>
                {NBSP.repeat(CONTEXT_CELLS - filled)}
              </Text>
            )}
            <Text {...tone}>{` ${percent} %`}</Text>
          </Text>
        )}
        <Button
          key="uebersicht"
          plain
          onPress={async () => {
            if (!(await openPanel($))) {
              $.ui.toast('Hier ist kein Platz für das Panel; /projektfarbe status zeigt den Stand als Text.')
            }
          }}
        >
          <Text dimColor>Übersicht ☰</Text>
        </Button>
        <Button
          key="farbe"
          plain
          onPress={async () => {
            // The picker offers the colors of the set in the store, not of the last turn's reading.
            const current = await satzNow($)
            await update($, view, v => ({ ...v, satz: current.id, isPicking: true }))
          }}
        >
          <Text dimColor>Farbe ändern</Text>
        </Button>
        <Button
          key="ausblenden"
          plain
          onPress={async () => {
            await $.store.set('bandAus', true)
            await update($, view, v => ({ ...v, isHidden: true }))
          }}
        >
          <Text dimColor>ausblenden</Text>
        </Button>
      </Box>
    )
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANEL) {
      await update($, panel, p => ({ ...p, isOpen: false }))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANEL }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const state = await read($, panel)
    const satz = await satzNow($)
    const picks = await picksOf($, satz)
    const isCalm = satz !== BUNT
    const gruppen = state.daten?.gruppen ?? []
    const isStatus = state.ansicht === 'status'

    // The project's color, as in the band: a block on the desktop, a colored shape in sleep mode.
    const block = (project: string | null) => {
      const farbe = project === null ? null : farbeFor(project, picks, satz)
      if (farbe === null) {
        return null
      }

      return isCalm ? (
        <Text color={farbe.hex}>{farbe.mark}</Text>
      ) : (
        <Text mono backgroundColor={farbe.hex}>
          {NBSP.repeat(2)}
        </Text>
      )
    }
    // Two lines per session: the sign, the title (and project), then what it waits for and how long ago.
    const zeileBox = (zeile: BereichZeile, withProject: boolean) => (
      <Box key={`zeile-${zeile.sessionId}`} flexDirection="column" marginBottom="sm" paddingLeft={3}>
        <Box columnGap={1}>
          <Text>{zeile.status.mark}</Text>
          {withProject ? block(zeile.project) : null}
          <Text bold>{zeile.isSelf ? `${zeile.title} (diese)` : zeile.title}</Text>
          {withProject && zeile.project !== null ? <Text dimColor>{zeile.project}</Text> : null}
        </Box>
        <Box columnGap={2} flexWrap="wrap" paddingLeft={withProject ? 5 : 2}>
          <Text dimColor>{`${zeile.status.label}${zeile.alter === '' ? '' : ` · ${zeile.alter}`}`}</Text>
          {archiveReason(zeile) === null ? null : (
            <Button key={`archivieren-${zeile.sessionId}`} plain onPress={() => archive($, zeile)}>
              <Text color="suggestion">archivieren</Text>
            </Button>
          )}
        </Box>
      </Box>
    )
    const title = (text: string, count: number, color?: 'error') => (
      <Box columnGap={1} marginTop="md" marginBottom="sm">
        <Text bold color={color}>
          {text}
        </Text>
        <Text dimColor>{`${count}`}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column">
        <Box columnGap={2} flexWrap="wrap">
          <Button key="aktualisieren" plain onPress={() => loadPanel($)}>
            <Text>{state.isLoading ? 'lädt …' : 'aktualisieren'}</Text>
          </Button>
          <Button
            key="ansicht"
            plain
            onPress={() => update($, panel, p => ({ ...p, ansicht: p.ansicht === 'status' ? 'projekt' : 'status' }))}
          >
            <Text>{isStatus ? 'nach Projekt' : 'nach Status'}</Text>
          </Button>
          <Button
            key="schliessen"
            plain
            onPress={async () => {
              await update($, panel, p => ({ ...p, isOpen: false }))
              await $.ui.close({ id: PANEL })
            }}
          >
            <Text dimColor>schließen</Text>
          </Button>
        </Box>
        {state.daten === null ? null : <Text bold>{uebersichtSummary(state.daten)}</Text>}
        {state.fehler === null ? null : <Text color="error">{state.fehler}</Text>}
        {state.daten === null && state.fehler === null ? <Text dimColor>Lädt …</Text> : null}
        {state.daten !== null && gruppen.length === 0 ? <Text dimColor>Keine offenen Sessions gefunden.</Text> : null}
        {state.daten !== null && isStatus
          ? buildBereiche(state.daten).map(bereich => (
              <Box key={`bereich-${bereich.id}`} flexDirection="column">
                {title(`${bereich.zeichen} ${bereich.titel}`, bereich.zeilen.length, bereich.id === 'dringend' ? 'error' : undefined)}
                {bereich.zeilen.map(zeile => zeileBox(zeile, true))}
              </Box>
            ))
          : null}
        {state.daten !== null && !isStatus
          ? gruppen.map(gruppe => (
              <Box key={`gruppe-${gruppe.project ?? ''}`} flexDirection="column">
                <Box columnGap={1} marginTop="md" marginBottom="sm">
                  {block(gruppe.project)}
                  <Text bold>{`${gruppe.mark ?? ''} ${gruppe.project ?? 'Ohne Projekt'}`.trim()}</Text>
                  <Text dimColor>{`${gruppe.zeilen.length}`}</Text>
                </Box>
                {gruppe.zeilen.map(zeile => zeileBox({ ...zeile, project: gruppe.project, mark: gruppe.mark }, false))}
              </Box>
            ))
          : null}
        {state.daten === null || state.daten.hinweise.length === 0 ? null : (
          <Text dimColor>{state.daten.hinweise.join('\n')}</Text>
        )}
      </Box>
    )
  })

  // The project's mark in front of what the spinner says; the engine still draws the rest.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const { isHidden, mark } = await read($, view)
    if (isHidden || mark === null) {
      return next(e)
    }
    const { message, word } = e.props
    const props =
      message === null
        ? { ...e.props, word: `${mark} ${word}` }
        : { ...e.props, message: `${mark} ${message}` }

    return next({ ...e, props })
  })
}
