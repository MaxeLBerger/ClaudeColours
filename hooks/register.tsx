import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpContentBlock, Register } from 'claude-code'

import type { ProjektfarbenPanel, ProjektfarbenView } from '../types'
import {
  archiveReason,
  assignFarben,
  BAND_FORMEN,
  bandBreite,
  brambleKandidaten,
  brambleRoot,
  brambleStart,
  bandStufe,
  EINZEILER,
  erkenneDienste,
  bereichOf,
  buildBereiche,
  buildUebersicht,
  BUNT,
  contextLevel,
  contextPercent,
  contextTokens,
  farbeFor,
  findFarbe,
  findSatz,
  ghNumbers,
  ghPrs,
  CELL_PX,
  ICON_BOX,
  ICON_GAP,
  ICON_SVG,
  MERGE_EXTRA,
  mergePrompt,
  ICON_SVG_SIZE,
  kontextHint,
  kontextIcon,
  kontextZellen,
  tokenLabel,
  raised,
  learnPicks,
  markSeen,
  handoffPrompt,
  meinungPrompt,
  promptsMarkdown,
  pruefenPrompt,
  stackPrompt,
  mergePrs,
  modusLabel,
  nameBudget,
  neuesterBuild,
  newCount,
  reviewPrompt,
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
  seenFor,
  SAETZE,
  satzOf,
  SCHLAFSAETZE,
  shortName,
  superscript,
  toListed,
  toRow,
  uebersichtZaehler,
  uebersichtText,
  type Art,
  type BandInhalt,
  type BandStufe,
  type BereichId,
  type BereichZeile,
  type Farbe,
  type GhPr,
  type Grund,
  type ListedSession,
  type Satz,
  type Status,
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
  contextTokens: null,
  contextWindow: null,
  isCompacted: false,
  openPrs: null,
  prsNote: null,
  prNumbers: [],
  newPrs: 0,
  openIssues: null,
  issuesNote: null,
  issueNumbers: [],
  newIssues: 0,
  repoUrl: null,
  bramble: null,
  satz: BUNT.id,
  isPicking: false,
  isHidden: false,
  hasStack: false,
}
const view = atom({ plugin: 'projektfarben', key: 'view' } as const, EMPTY)

// The side panel with the overview of all sessions; its data is the one `/projektfarbe status` prints.
const PANEL = 'uebersicht'
const PANEL_EVERY_MS = 60_000
const EMPTY_PANEL: ProjektfarbenPanel = { daten: null, isLoading: false, fehler: null, um: null, isOpen: false, ansicht: 'status', zu: ['laeuft'] }
// Only the sections that want the person are colored: a problem in the error color, a waiting session in the warning's.
const BEREICH_FARBE: Partial<Record<BereichId, 'error' | 'warning'>> = { dringend: 'error', dudran: 'warning' }

/** The theme color a status label is drawn in; none for what is only history. */
function statusFarbe(status: Status): 'error' | 'warning' | 'success' | 'suggestion' | 'merged' | undefined {
  switch (status.art) {
    case 'abgebrochen':
    case 'fehler':
      return 'error'
    case 'pr-offen':
      return status.rang <= 1 ? 'error' : 'suggestion'
    case 'in-arbeit':
      return 'warning'
    case 'laeuft':
      return 'success'
    case 'pr-gemerged':
      return 'merged'
    default:
      return undefined
  }
}

const panel = atom({ plugin: 'projektfarben', key: 'uebersicht' } as const, EMPTY_PANEL)

// Theme keys for the gauge's figure, so it follows the person's theme: calm gray, then the warning and
// error colors from where the window is filling up. The ring itself is an image (`kontextIcon`).
const CONTEXT_FILL = { ok: 'inactive', warn: 'warning', full: 'error' } as const
// The theme color of the raised "+x" behind a count: new pull requests or issues.
const NEW_COLOR = 'suggestion'

// The color block is a run of these on a colored background: on the desktop plain runs of spaces
// collapse, and empty Boxes sat a few pixels off the line of the text beside them.
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
async function readContext($: Engine): Promise<{ percent: number | null; tokens: number | null; window: number | null }> {
  try {
    const usage = await $.session.usage()
    const figures = contextTokens(usage)

    return { percent: contextPercent(usage), tokens: figures?.tokens ?? null, window: figures?.window ?? null }
  } catch {
    return { percent: null, tokens: null, window: null }
  }
}

/** True where the session's folder holds a compose file: the band then offers the stack rebuild. */
async function readDienste($: Engine, cwd: string): Promise<boolean> {
  try {
    const entries = await $.fs.list(cwd)

    return erkenneDienste(entries.filter(entry => entry.kind === 'file').map(entry => entry.name)).hasCompose
  } catch {
    return false
  }
}

/** Reads the project, its color and the context fill into the band's state. */
async function refreshView($: Engine, cwd: string): Promise<void> {
  const satz = await satzNow($)
  const project = projectOf(cwd)
  const farbe =
    project === null ? null : farbeFor(project, await ensurePicks($, [project], satz), satz)
  const isHidden = (await $.store.get('bandAus')) === true
  const context = await readContext($)
  const hasStack = await readDienste($, cwd)
  await update($, view, v => ({
    ...v,
    project,
    mark: farbe?.mark ?? null,
    hex: farbe?.hex ?? null,
    contextPercent: context.percent,
    contextTokens: context.tokens,
    contextWindow: context.window,
    // The gauge shows a dash from a compaction until the next answer gives a figure again.
    isCompacted: context.percent === null ? v.isCompacted : false,
    satz: satz.id,
    isHidden,
    hasStack,
  }))
  await refreshNew($, cwd)
}

/**
 * How many of the open pull requests and issues are new to the person. The highest numbers seen
 * are kept per repository and shared by all sessions: one that opened the list in the browser
 * clears the "+x" in the others.
 */
async function refreshNew($: Engine, cwd: string): Promise<void> {
  const repo = repoKeyOf(cwd)
  const project = projectOf(cwd)
  const seen =
    repo === null || project === null ? undefined : seenFor(readSeen(await $.store.get('gesehen')), repo, project)
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

/** The newest release build of Bramble, the person's own browser; null where there is none. */
async function findBramble($: Engine): Promise<string | null> {
  const root = await Promise.all([$.env.get('BRAMBLE_REPO'), $.env.get('USERPROFILE')])
    .then(([own, home]) => brambleRoot(own, home))
    .catch(() => null)
  if (root === null) {
    return null
  }
  const worktrees = await $.fs
    .list(`${root}\\.claude\\worktrees`)
    .then(entries => entries.filter(entry => entry.kind === 'dir').map(entry => entry.name))
    .catch(() => [] as string[])
  const builds = await Promise.all(
    brambleKandidaten(root, worktrees).map(path =>
      $.fs
        .stat(path)
        .then(stat => (stat.kind === 'file' ? { path, mtimeMs: stat.mtimeMs } : null))
        .catch(() => null),
    ),
  )

  return neuesterBuild(builds.filter(build => build !== null))
}

/**
 * Opens an address in the newest Bramble build, looked up again on every press: a build made since
 * the band last looked is the one that opens. False where there is no build or it would not start.
 */
async function openInBramble($: Engine, url: string): Promise<boolean> {
  const exe = await findBramble($)
  if (exe === null) {
    return false
  }
  const { argv, env } = brambleStart(exe, url)
  try {
    const { exitCode } = await $.process.run(argv, { env, timeoutMs: 15_000 })

    return exitCode === 0
  } catch {
    return false
  }
}

/** Opens the repository's page in Bramble, or, without it, where the system opens web addresses. */
async function openRepo($: Engine, url: string): Promise<void> {
  if (await openInBramble($, url)) {
    return
  }
  for (const opener of OPENERS) {
    try {
      if ((await $.process.run([...opener, url], { timeoutMs: 10_000 })).exitCode === 0) {
        return
      }
    } catch {
      // This system has no such opener: the next one is tried.
    }
  }
  $.ui.toast(`Das Repository lässt sich nicht öffnen: ${url}`)
}

/**
 * Opens the list of open pull requests or issues in the person's browser and, once it opened,
 * marks every one open now as seen: the "+x" goes, in every session of the project.
 */
async function openList($: Engine, art: Art): Promise<void> {
  const what = art === 'pr' ? 'PR-Liste' : 'Issue-Liste'
  const { repoUrl } = await read($, view)
  // In Bramble when there is a build and the address is known; else gh opens the default browser.
  const isInBramble = repoUrl !== null && (await openInBramble($, `${repoUrl}/${art === 'pr' ? 'pulls' : 'issues'}`))
  if (!isInBramble) {
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
  const cwd = await $.session.cwd()
  const repo = repoKeyOf(cwd)
  if (repo === null) {
    return
  }
  const numbers = art === 'pr' ? state.prNumbers : state.issueNumbers
  const seen = readSeen(await $.store.get('gesehen'))
  const next = markSeen(seen, repo, art, numbers, false, state.project)
  if (next !== seen) {
    await $.store.set('gesehen', next)
  }
  await refreshNew($, cwd)
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
  const [prs, issues, url, bramble] = await Promise.all([
    readOpen($, 'pr'),
    readOpen($, 'issue'),
    needsUrl ? readRepoUrl($) : Promise.resolve(undefined),
    findBramble($),
  ])
  if (url !== undefined && url !== null) {
    urlFor = cwd
  }
  // A reading that fails keeps the last good one, but only of the same folder.
  await update($, view, v => ({
    ...v,
    repoUrl: url === undefined ? v.repoUrl : (url ?? (isSameFolder ? v.repoUrl : null)),
    bramble,
    openPrs: prs.numbers?.length ?? (isSameFolder ? v.openPrs : null),
    prNumbers: prs.numbers ?? (isSameFolder ? v.prNumbers : []),
    prsNote: prs.note,
    openIssues: issues.numbers?.length ?? (isSameFolder ? v.openIssues : null),
    issueNumbers: issues.numbers ?? (isSameFolder ? v.issueNumbers : []),
    issuesNote: issues.note,
  }))
  const repo = repoKeyOf(cwd) ?? project
  const seen = readSeen(await $.store.get('gesehen'))
  let next = seen
  if (prs.numbers !== null) {
    next = markSeen(next, repo, 'pr', prs.numbers, true, project)
  }
  if (issues.numbers !== null) {
    next = markSeen(next, repo, 'issue', issues.numbers, true, project)
  }
  if (next !== seen) {
    await $.store.set('gesehen', next)
  }
  await refreshNew($, cwd)
}

// Newest first, as gh lists them: enough to reach the pull requests of every open session.
const STATUS_PR_LIMIT = 200
// The open ones carry their checks, the costly part of the query: fewer of them.
const STATUS_OPEN_LIMIT = 100
const STATUS_GH_MS = 20_000

type RepoPrs = { prs: GhPr[] | null; note: string | null }

/** One `gh pr list` in a folder of the repository; null and why when gh could not list them. */
async function ghPrList($: Engine, cwd: string, args: readonly string[]): Promise<RepoPrs> {
  try {
    const { exitCode, stdout, stderr } = await $.process.run(['gh', 'pr', 'list', ...args], {
      cwd,
      timeoutMs: STATUS_GH_MS,
    })
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
 * Every pull request of one repository: the open ones with checks, review and draft, the rest
 * with number, state and branch only, so the costly checks are fetched for the few that are open.
 */
async function readRepoPrs($: Engine, cwd: string): Promise<RepoPrs> {
  const [open, all] = await Promise.all([
    ghPrList($, cwd, [
      '--state', 'open', '--limit', String(STATUS_OPEN_LIMIT),
      '--json', 'number,state,headRefName,isDraft,reviewDecision,statusCheckRollup',
    ]),
    ghPrList($, cwd, ['--state', 'all', '--limit', String(STATUS_PR_LIMIT), '--json', 'number,state,headRefName']),
  ])
  const prs = mergePrs(open.prs, all.prs)

  return { prs, note: prs === null ? open.note : null }
}

// Each repository's pull requests, by `repoKeyOf`, with when they were read: the panel reloads the
// sessions every minute, but asks gh at most every five minutes, like the band.
const prCache = new Map<string, RepoPrs & { um: number }>()

/** A repository's pull requests from the cache while fresh, else from gh; `isForced` always asks gh. */
async function repoPrs($: Engine, repo: string, cwd: string, isForced: boolean): Promise<RepoPrs> {
  const now = await $.clock.now()
  const cached = prCache.get(repo)
  if (!isForced && cached !== undefined && now - cached.um < PR_EVERY_MS) {
    return cached
  }
  const fresh = await readRepoPrs($, cwd)
  prCache.set(repo, { ...fresh, um: now })

  return fresh
}

/**
 * Where every open session stands, by project: the data `/projektfarbe status` prints and the side
 * panel draws. Asks the app for the sessions, and gh per repository (see `repoPrs`), all
 * repositories at once, each in the folder of one of its sessions.
 */
async function readUebersicht($: Engine, isForced: boolean): Promise<Uebersicht> {
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
    [...folders].map(async ([repo, { cwd, project }]) => ({
      repo,
      project,
      ...(await repoPrs($, repo, cwd, isForced)),
    })),
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

/**
 * Reads the overview into the panel's state; a reading already under way is not started twice.
 * `isForced` (the `aktualisieren` button) asks gh even when its last answer is fresh.
 */
async function loadPanel($: Engine, isForced = false): Promise<void> {
  if ((await read($, panel)).isLoading) {
    return
  }
  await update($, panel, p => ({ ...p, isLoading: true }))
  try {
    const daten = await readUebersicht($, isForced)
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

/** After a turn: an open panel is read again, at most once a minute (gh at most every five). */
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

/**
 * Sends the session a prompt of the person's own (`asUser`), a turn of its own once the session is idle:
 * the band's two session actions (the Opus opinion, review + commit + PR) are such prompts, and the answer
 * is a chat turn the person sees and can reply to. A refused or failing submission is a toast.
 */
async function bitteSenden($: Engine, failure: string, text: (projekt: string) => string): Promise<void> {
  try {
    const projekt = projectOf(await $.session.cwd()) ?? 'dieses Projekt'
    const sent = await $.prompt.submit({ text: text(projekt), asUser: true })
    if (sent.drop !== undefined) {
      $.ui.toast(`${failure}: ${sent.drop}`)
    }
  } catch (error) {
    $.ui.toast(`${failure}: ${firstLine(String(error))}`)
  }
}

// What opens a `claude://` address, tried in turn until one starts: Windows, macOS, Linux.
const OPENERS: readonly (readonly string[])[] = [['rundll32', 'url.dll,FileProtocolHandler'], ['open'], ['xdg-open']]

/** Opens a session in the app through the system's handler for its `claude://` address. */
async function openSession($: Engine, zeile: UebersichtZeile): Promise<void> {
  if (zeile.link !== null) {
    for (const opener of OPENERS) {
      try {
        const { exitCode } = await $.process.run([...opener, zeile.link], { timeoutMs: 10_000 })
        if (exitCode === 0) {
          return
        }
      } catch {
        // This system has no such opener: the next one is tried.
      }
    }
  }
  $.ui.toast(`„${zeile.title}“ lässt sich von hier nicht öffnen: bitte in der Seitenleiste wählen.`)
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
    '/projektfarbe breite     wie breit das Band gerade ist und in welchem Layout es gezeichnet wird',
    '                         Symbole im Band: ✦ Opus-Meinung, ↑ Review + PR, ✉ Handoff, ▣ Stack neu bauen (nur mit Compose-Datei), ✓ Prüfen (e2e), ⇉ Merge + Issues, ☰ Übersicht, ⚙ Einstellungen (Farbe, Modus, ausblenden)',
    '/projektfarbe prompts    die Prompts hinter den Band-Knöpfen als Text, zum Prüfen',
    '/projektfarbe schlaf     Schlafmodus: ruhige Farben, Formen statt bunter Punkte',
    '/projektfarbe bunt       zurück zu den bunten Farben',
    '',
    `Farben (${satz.label}): ${satz.farben.map(f => `${f.mark} ${f.name}`).join(', ')}`,
  ].join('\n')

// True while a compaction runs: a second press must not start another one.
let isCompacting = false

// The engine's own compaction, the call `/compact` makes; it runs between turns and is refused during one.
async function kontextKomprimieren($: Engine): Promise<void> {
  if (isCompacting) {
    $.ui.toast('Das Komprimieren läuft schon.')

    return
  }
  isCompacting = true
  try {
    const result = await $.session.compact()
    if (result.skip !== undefined) {
      $.ui.toast(`Kontext nicht komprimiert: ${result.skip}`)
    } else {
      const { tokensBefore, tokensAfter } = result
      $.ui.toast(
        tokensBefore !== undefined && tokensAfter !== undefined
          ? `Kontext komprimiert: ${tokenLabel(tokensBefore)} → ${tokenLabel(tokensAfter)} Tokens`
          : 'Kontext komprimiert',
      )
      await update($, view, v => ({ ...v, isCompacted: true, contextPercent: null }))
    }
  } catch {
    $.ui.toast('Der Kontext lässt sich erst komprimieren, wenn die laufende Antwort fertig ist.')
  } finally {
    isCompacting = false
  }
  await refreshView($, await $.session.cwd()).catch(() => undefined)
}

export const register: Register = on => {
  // What the band was last drawn in, for `/projektfarbe breite`; a plain variable, as drawing must not write state.
  let lastBand: { columns: number; stufe: BandStufe; inhalt: BandInhalt; isMono: boolean } | null = null
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'projektfarbe',
      description: 'Farbe dieses Projekts zeigen oder ändern (Farbpunkt vor den Session-Namen)',
      argumentHint: '[farbe | standard | alle | status | übersicht | band | breite | schlaf | bunt]',
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
        return { text: uebersichtText(await readUebersicht($, true)) }
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
        return { text: uebersichtText(await readUebersicht($, true)) }
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
    if (arg === 'breite') {
      // A hidden band is not drawn at all, in every session: say so rather than "not drawn yet".
      if (state.isHidden) {
        return { text: 'Das Band ist ausgeblendet; /projektfarbe band blendet es wieder ein.' }
      }

      return {
        text:
          lastBand === null
            ? 'Das Band wurde in dieser Session noch nicht gezeichnet.'
            : `Das Band hat ${lastBand.columns} Zellen und ist im Layout „${lastBand.stufe}“ gezeichnet (Name: ${lastBand.inhalt.name} Zeichen). In einer Zeile braucht es: ${EINZEILER.map(stufe => `${stufe} ${Math.round(bandBreite(stufe, lastBand!.inhalt, lastBand!.isMono))}`).join(', ')} Zellen.`,
      }
    }
    if (arg === 'prompts') {
      return { text: promptsMarkdown() }
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
    // A count that could not be read shows as a dimmed "?", not 0 (which would read as "none open"),
    // so the band keeps one shape; /projektfarbe says why it could not be read.
    const { openPrs, openIssues } = state
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
          <Box marginTop="lg">
            <Button
              key="ausblenden"
              plain
              onPress={async () => {
                await $.store.set('bandAus', true)
                await update($, view, v => ({ ...v, isPicking: false, isHidden: true }))
              }}
            >
              <Text dimColor>Band ausblenden</Text>
            </Button>
          </Box>
        </Box>
      )
    }

    const level = percent === null ? 'ok' : contextLevel(percent)
    const tone =
      level === 'ok' ? { dimColor: true } : { color: CONTEXT_FILL[level], bold: level === 'full' }
    // Subagent views get no gauge: the number is the main session's.
    // After a compaction the figure is gone until the next answer: the ring stays, with a dash.
    const showsGauge = (percent !== null || state.isCompacted) && e.props.view.agentId === undefined
    const figure = percent === null ? '–' : String(percent)
    // How the band is laid out follows the cells its tree has (`bandStufe`); the counts are measured
    // by the text they will show.
    const countRest = (open: number | null, fresh: number): string =>
      `${open === null ? ' ?' : ` ${prLabel(open)}`}${superscript(fresh)}`
    const inhalt: BandInhalt = {
      name: [...state.project].length,
      prs: countRest(openPrs, state.newPrs).length,
      issues: countRest(openIssues, state.newIssues).length,
      percent: showsGauge ? figure.length : null,
      hasStack: state.hasStack,
    }
    // A surface that does not say how wide the band is (an older Claude Code) gets a roomy one-row band.
    const columns = Number.isFinite(e.props.bodyColumns) ? e.props.bodyColumns : 120
    // On the terminal a character is one cell, on the desktop it is less: the widths differ.
    const isMono = e.surface === 'terminal'
    // Only the session's own view is remembered and held in its layout: a subagent's has other content.
    const isMain = e.props.view.agentId === undefined
    const stufe = bandStufe(columns, inhalt, isMain ? (lastBand?.stufe ?? null) : null, isMono)
    if (isMain) {
      lastBand = { columns, stufe, inhalt, isMono }
    }
    const form = stufe === 'zwei' ? null : BAND_FORMEN[stufe]
    const block = isCalm ? (
      <Text color={hex}>{state.mark}</Text>
    ) : (
      <Text mono backgroundColor={hex}>
        {NBSP.repeat(2)}
      </Text>
    )
    // No break inside the name: a row squeezed by a resize would split "My Project" in two lines.
    const nameText = ` ${(stufe === 'zwei' ? shortName(state.project, nameBudget(columns, inhalt, isMono)) : state.project).split(' ').join(NBSP)}`
    const name = (
      <Text>
        {block}
        {/* The theme's text color, so the link around it does not paint the name in its own. */}
        <Text color="text" bold={!isCalm}>
          {nameText}
        </Text>
      </Text>
    )
    // Only the word is the button: the desktop draws a Button natively and drops the bold count
    // and the colored "+x" inside it, so those stand beside it.
    const count = (art: Art, label: string, open: number | null, fresh: number) => {
      const key = art === 'pr' ? 'prs' : 'issues'

      return (
        <Box key={`${key}-zahl`}>
          <Button key={key} plain dimColor onPress={() => openList($, art)}>
            {label}
          </Button>
          <Text>
            {open === null ? <Text dimColor>{' ?'}</Text> : <Text bold>{` ${prLabel(open)}`}</Text>}
            {fresh === 0 ? null : (
              <Text color={NEW_COLOR} bold>
                {superscript(fresh)}
              </Text>
            )}
          </Text>
        </Box>
      )
    }
    // The actions in the band's order (✦ opinion, ↑ review + PR, ✉ handoff, ▣ stack where a compose file lies,
    // ✓ check, ⇉ merge, then ☰ overview and ⚙ settings at the right edge), each in a field of one width so
    // they are evenly spaced.
    const mergeBadge = openPrs !== null && openPrs > 0 ? raised(prLabel(openPrs)) : ''
    type Def = {
      key: string
      hint: string
      icon: string
      svg?: { alt: string; source: string; height?: number }
      /** Text beside the icon, in the field; `tone` is its Text's props (dimmed where none). */
      badge?: string
      tone?: Record<string, unknown>
      /** The field's width in cells; `ICON_BOX` where none. */
      width?: number
      press: () => void | Promise<void>
    }
    const defs: Def[] = [
      {
        key: 'meinung',
        hint: 'Opus-Meinung im Chat anfordern',
        icon: '✦',
        svg: ICON_SVG.meinung,
        press: () => bitteSenden($, 'Die Opus-Meinung wurde nicht angefordert', meinungPrompt),
      },
      {
        key: 'review',
        hint: 'Review, Commit und Pull Request anfordern',
        icon: '↑',
        svg: ICON_SVG.review,
        press: () => bitteSenden($, 'Review und PR wurden nicht gestartet', reviewPrompt),
      },
      {
        key: 'handoff',
        hint: 'Übergabe für eine frische Session schreiben lassen',
        icon: '✉',
        svg: ICON_SVG.handoff,
        press: () => bitteSenden($, 'Die Übergabe wurde nicht angefordert', handoffPrompt),
      },
      {
        key: 'stack',
        hint: 'Docker-Stack auf diesen Stand neu bauen',
        icon: '▣',
        svg: ICON_SVG.stack,
        press: () => bitteSenden($, 'Der Stack wurde nicht neu gebaut', stackPrompt),
      },
      {
        key: 'pruefen',
        hint: 'Prüfen: Qualität, Tests und e2e mit Playwright',
        icon: '✓',
        svg: ICON_SVG.pruefen,
        press: () => bitteSenden($, 'Die Prüfung wurde nicht gestartet', pruefenPrompt),
      },
      {
        key: 'merge',
        hint: 'Offene PRs mergen und passende Issues lösen',
        icon: '⇉',
        svg: ICON_SVG.merge,
        // The open pull requests as small raised digits at the icon: what it will merge.
        badge: mergeBadge,
        width: ICON_BOX + MERGE_EXTRA,
        press: () => bitteSenden($, 'Merge und Issues wurden nicht gestartet', mergePrompt),
      },
      {
        key: 'uebersicht',
        hint: 'Übersicht',
        icon: '☰',
        svg: ICON_SVG.uebersicht,
        press: async () => {
          if (!(await openPanel($))) {
            $.ui.toast('Hier ist kein Platz für das Panel; /projektfarbe status zeigt den Stand als Text.')
          }
        },
      },
      {
        key: 'einstellungen',
        hint: 'Einstellungen: Farbe, Modus, Band ausblenden',
        icon: '⚙',
        svg: ICON_SVG.einstellungen,
        press: async () => {
          // The picker offers the colors of the set in the store, not of the last turn's reading.
          const current = await satzNow($)
          await update($, view, v => ({ ...v, satz: current.id, isPicking: true }))
        },
      },
      // The rebuild needs a compose file in the folder.
    ].filter(def => def.key !== 'stack' || state.hasStack)
    // Where the surface has `Svg` (not the terminal) the actions are drawn as vector icons, all of one
    // family so they stand on one line at one height. A Button takes only text, so the icon stands in the
    // field, centered in the row, and a Button of blanks lies over it, in the same cells; the press lands
    // on the Button. The terminal keeps its text glyphs.
    const elements = $.ui.resolve(e)
    const Svg = e.surface !== 'terminal' && 'Svg' in elements ? elements.Svg : null
    // The actions come in two groups: the session actions stand left, before the counts; the overview and
    // the settings stand right, beside the gauge.
    const RIGHT_KEYS = ['kontext', 'uebersicht', 'einstellungen']
    // The gauge is an icon of the family: a ring that fills with the context, and the figure beside it.
    // Pressing it compacts the context. On the terminal the glyph and the figure are the button's text.
    const kontextDef = (hasPercent: boolean): Def => {
      const label = hasPercent ? `${NBSP}${figure}${NBSP}%` : ''

      return {
        key: 'kontext',
        hint: kontextHint({ tokens: state.contextTokens, window: state.contextWindow }, state.isCompacted),
        icon: `◔${label}`,
        svg: kontextIcon(percent),
        // The percent sign never breaks away from its number, however tight the row gets.
        badge: label,
        tone,
        width: kontextZellen(figure.length, hasPercent),
        press: () => kontextKomprimieren($),
      }
    }
    const draw = (def: Def) => {
      const isRight = RIGHT_KEYS.includes(def.key)
      const hasSvg = Svg !== null && def.svg !== undefined
      const width = def.width ?? ICON_BOX
      const badge =
        def.badge === undefined || def.badge === '' ? null : <Text {...(def.tone ?? { dimColor: true })}>{def.badge}</Text>
      const button = (
        <Button key={def.key} plain onPress={def.press}>
          {hasSvg ? <Text dimColor>{NBSP.repeat(width)}</Text> : <Text {...(def.tone ?? { dimColor: true })}>{def.icon}</Text>}
        </Button>
      )

      return (
        <Box key={`${def.key}-feld`} width={width} justifyContent="center" alignItems="center">
          {hasSvg && Svg !== null && def.svg !== undefined ? (
            <>
              <Box alignItems="center">
                <Svg
                  source={def.svg.source}
                  alt={def.svg.alt}
                  width={ICON_BOX * CELL_PX}
                  height={def.svg.height ?? ICON_SVG_SIZE}
                />
                {badge}
              </Box>
              {/* As wide as the field and centered, so the Button's hover patch sits on the icon: its blanks
                  are narrower than the field's cells, and left-aligned the patch slid off to one side. */}
              <Box position="absolute" top={0} left={0} width={width} justifyContent="center">
                {button}
              </Box>
            </>
          ) : (
            <>
              {button}
              {def.key === 'kontext' ? null : badge}
            </>
          )}
          {/* What the icon does, as a card in the band's own row (a card is clipped to the band), shown while
              the pointer is over the field; the surface does it, no hook runs. The left group opens it to
              the right of its icon, the right group to the left, so none reaches past the band's edge. */}
          <Box
            position="absolute"
            top={0}
            {...(isRight ? { right: width } : { left: width })}
            display="none"
            hover={{ display: 'flex' }}
            backgroundColor="subtle"
            paddingX={1}
          >
            <Text>{def.hint}</Text>
          </Box>
        </Box>
      )
    }
    const sessionActions = defs.filter(def => !RIGHT_KEYS.includes(def.key)).map(draw)
    const settingActions = defs.filter(def => RIGHT_KEYS.includes(def.key)).map(draw)
    const repoUrl = state.repoUrl
    // With a Bramble build the name is a Button that opens the repository there: a Link is opened by
    // the surface, in the system's browser. The block stays beside it, since a Button drops its color.
    const project =
      repoUrl === null ? (
        name
      ) : state.bramble === null ? (
        <Link href={repoUrl}>{name}</Link>
      ) : (
        <Box key="repo-feld">
          <Text>{block}</Text>
          <Button key="repo" plain onPress={() => openRepo($, repoUrl)}>
            {nameText}
          </Button>
        </Box>
      )
    const prs = count('pr', 'PRs:', openPrs, state.newPrs)
    const issues = count('issue', 'Issues:', openIssues, state.newIssues)

    // Too narrow for one row: two rows. Name, counts and a short gauge above; below the session actions at
    // the left and the overview and settings at the right, indented to stand under the name.
    if (form === null) {
      return (
        <Box flexDirection="column">
          <Box columnGap={1} justifyContent="space-between">
            <Box columnGap={1}>
              {project}
              {prs}
              {issues}
            </Box>
            {!showsGauge ? null : draw(kontextDef(true))}
          </Box>
          <Box columnGap={1} paddingLeft={2} justifyContent="space-between">
            <Box columnGap={ICON_GAP}>{sessionActions}</Box>
            <Box columnGap={ICON_GAP}>{settingActions}</Box>
          </Box>
        </Box>
      )
    }

    // One row of two parts spread to its ends: the project, the session actions and the counts at the
    // left, the gauge with the overview and the settings flush right. It never wraps: after a resize the
    // surface draws the old tree in the new width until the hook answers, and a wrap then made the band
    // jump to two rows and back; what does not fit is cut off at the right for that moment. The narrower
    // layouts move the items closer together.
    return (
      <Box columnGap={form.gap} flexWrap="nowrap" overflow="hidden" justifyContent="space-between">
        <Box columnGap={form.gap}>
          {project}
          <Box columnGap={ICON_GAP}>{sessionActions}</Box>
          {prs}
          {issues}
        </Box>
        <Box columnGap={ICON_GAP}>
          {!showsGauge ? null : draw(kontextDef(form.hasPercent))}
          {settingActions}
        </Box>
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
    const isStatus = (state.ansicht ?? EMPTY_PANEL.ansicht) === 'status'
    const zaehler = state.daten === null ? null : uebersichtZaehler(state.daten)
    // A state kept from before the fold lists existed (a reload keeps the session's state) has no `zu`.
    const isFolded = (id: string): boolean => (state.zu ?? EMPTY_PANEL.zu).includes(id)
    const fold = (id: string) =>
      update($, panel, p => {
        const zu = p.zu ?? EMPTY_PANEL.zu

        return { ...p, zu: zu.includes(id) ? zu.filter(one => one !== id) : [...zu, id] }
      })

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
    // A session: a rail in the section's color along both lines; the sign, color, title and the
    // actions on the first, what it waits for and how long ago on the second.
    const zeileBox = (zeile: BereichZeile, withProject: boolean) => (
      <Box key={`zeile-${zeile.sessionId}`} columnGap={1} marginBottom="sm" paddingLeft={2}>
        <Box width={1} backgroundColor={BEREICH_FARBE[bereichOf(zeile)]} />
        <Box flexDirection="column" flexGrow={1}>
          <Box justifyContent="space-between" columnGap={2} flexWrap="wrap">
            <Box columnGap={1}>
              <Text>{zeile.status.mark}</Text>
              {withProject ? block(zeile.project) : null}
              <Text bold>{zeile.title}</Text>
              {zeile.isSelf ? <Text dimColor>diese Session</Text> : null}
              {withProject && zeile.project !== null ? <Text dimColor>{zeile.project}</Text> : null}
            </Box>
            <Box columnGap={2}>
              {zeile.link === null ? null : (
                <Button key={`oeffnen-${zeile.sessionId}`} plain onPress={() => openSession($, zeile)}>
                  <Text color="suggestion">öffnen ↗</Text>
                </Button>
              )}
              {archiveReason(zeile) === null ? null : (
                <Button key={`archivieren-${zeile.sessionId}`} plain onPress={() => archive($, zeile)}>
                  <Text dimColor>archivieren</Text>
                </Button>
              )}
            </Box>
          </Box>
          <Box columnGap={1} paddingLeft={withProject ? 5 : 2}>
            <Text color={statusFarbe(zeile.status)} dimColor={statusFarbe(zeile.status) === undefined}>
              {zeile.status.label}
            </Text>
            {zeile.alter === '' ? null : <Text dimColor>{`· ${zeile.alter}`}</Text>}
          </Box>
        </Box>
      </Box>
    )
    // A heading: the fold button, the title in its color, the count.
    const heading = (id: string, titel: unknown, count: number) => (
      <Box columnGap={1} marginTop="md" marginBottom="sm">
        <Button key={`falten-${id}`} plain onPress={() => fold(id)}>
          <Text dimColor>{isFolded(id) ? '▸' : '▾'}</Text>
        </Button>
        {titel}
        <Text dimColor>{`${count}`}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column">
        <Box columnGap={2} flexWrap="wrap">
          <Text bold>{isStatus ? 'Nach Status' : 'Nach Projekt'}</Text>
          <Button key="ansicht" plain onPress={() => update($, panel, p => ({ ...p, ansicht: p.ansicht === 'status' ? 'projekt' : 'status' }))}>
            <Text color="suggestion">{isStatus ? 'nach Projekt' : 'nach Status'}</Text>
          </Button>
          <Button key="aktualisieren" plain onPress={() => loadPanel($, true)}>
            <Text color="suggestion">{state.isLoading ? 'lädt …' : '↻ aktualisieren'}</Text>
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
        {zaehler === null ? null : (
          <Box columnGap={2} flexWrap="wrap" marginTop="sm">
            <Text bold>{`${zaehler.sessions} ${zaehler.sessions === 1 ? 'Session' : 'Sessions'}`}</Text>
            {zaehler.dringend === 0 ? null : (
              <Text bold color="error">{`⚠ ${zaehler.dringend} dringend`}</Text>
            )}
            {zaehler.dudran === 0 ? null : (
              <Text bold color="warning">{`💬 ${zaehler.dudran} ${zaehler.dudran === 1 ? 'wartet' : 'warten'} auf dich`}</Text>
            )}
            {zaehler.pr === 0 ? null : <Text dimColor>{`${zaehler.pr} mit offenem PR`}</Text>}
            {zaehler.ruht === 0 ? null : <Text dimColor>{`${zaehler.ruht} ${zaehler.ruht === 1 ? 'ruht' : 'ruhen'}`}</Text>}
          </Box>
        )}
        {state.fehler === null ? null : <Text color="error">{state.fehler}</Text>}
        {state.daten === null && state.fehler === null ? <Text dimColor>Lädt …</Text> : null}
        {state.daten !== null && gruppen.length === 0 ? <Text dimColor>Keine offenen Sessions gefunden.</Text> : null}
        {state.daten !== null && isStatus
          ? buildBereiche(state.daten).map(bereich => (
              <Box key={`bereich-${bereich.id}`} flexDirection="column">
                {heading(
                  bereich.id,
                  <Text bold color={BEREICH_FARBE[bereich.id]}>{`${bereich.zeichen} ${bereich.titel}`}</Text>,
                  bereich.zeilen.length,
                )}
                {isFolded(bereich.id) ? null : bereich.zeilen.map(zeile => zeileBox(zeile, true))}
              </Box>
            ))
          : null}
        {state.daten !== null && !isStatus
          ? gruppen.map(gruppe => {
              const id = `projekt-${gruppe.project ?? ''}`

              return (
                <Box key={`gruppe-${gruppe.project ?? ''}`} flexDirection="column">
                  {heading(
                    id,
                    <Box columnGap={1}>
                      {block(gruppe.project)}
                      {/* In sleep mode the block already is the mark: it stands once. */}
                      <Text bold>{`${isCalm ? '' : (gruppe.mark ?? '')} ${gruppe.project ?? 'Ohne Projekt'}`.trim()}</Text>
                    </Box>,
                    gruppe.zeilen.length,
                  )}
                  {isFolded(id)
                    ? null
                    : gruppe.zeilen.map(zeile => zeileBox({ ...zeile, project: gruppe.project, mark: gruppe.mark }, false))}
                </Box>
              )
            })
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
