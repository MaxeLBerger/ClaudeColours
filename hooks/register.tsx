import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpContentBlock, Register } from 'claude-code'

import type { ProjektfarbenView } from '../types'
import {
  assignFarben,
  BUNT,
  CONTEXT_CELLS,
  contextFill,
  contextLevel,
  contextPercent,
  farbeFor,
  findFarbe,
  findSatz,
  learnPicks,
  modusLabel,
  planTitle,
  PR_LIMIT,
  prCount,
  prLabel,
  projectOf,
  readPicks,
  readTried,
  rememberTry,
  SAETZE,
  satzOf,
  SCHLAFSAETZE,
  toRow,
  type Farbe,
  type Satz,
  type SessionRow,
  type TitlePlan,
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
  satz: BUNT.id,
  isPicking: false,
  isHidden: false,
}
const view = atom({ plugin: 'projektfarben', key: 'view' } as const, EMPTY)

// Theme keys, so the gauge follows the person's theme: a calm gray bar on a fainter track,
// the warning and error colors from where the window is filling up.
const CONTEXT_FILL = { ok: 'inactive', warn: 'warning', full: 'error' } as const
const CONTEXT_TRACK = 'subtle'

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
async function recolorSelf($: Engine, force: boolean): Promise<Outcome> {
  const row = toRow(await callJson($, 'get_session', { session_id: 'self' }), 'self')
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

/** After a turn: the band follows a color picked in another session, and the title gets its mark. */
async function afterTurn($: Engine): Promise<void> {
  const cwd = await $.session.cwd()
  await refreshView($, cwd)
  void refreshPrs($, cwd, false).catch(() => undefined)
  if ((await recolorSelf($, false)) === 'unnamed') {
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
}

const PR_EVERY_MS = 5 * 60_000
// When, and in which folder, the pull requests were last counted; starts over with a reload.
let prsCheckedAt: number | null = null
let prsFor: string | null = null

const firstLine = (text: string): string => text.trim().split(/\r?\n/)[0]?.slice(0, 120) ?? ''

/** The open pull requests of the session's repository, counted by `gh` with the person's own login. */
async function readOpenPrs($: Engine): Promise<{ count: number | null; note: string | null }> {
  try {
    const { exitCode, stdout, stderr } = await $.process.run(
      // One more than the band shows: that is how "100" and "more than 100" are told apart.
      ['gh', 'pr', 'list', '--state', 'open', '--limit', String(PR_LIMIT + 1), '--json', 'number'],
      { timeoutMs: 20_000 },
    )
    if (exitCode !== 0) {
      return { count: null, note: `gh meldet: ${firstLine(stderr)}` }
    }
    const count = prCount(stdout)

    return { count, note: count === null ? 'gh antwortet in einem unerwarteten Format' : null }
  } catch (error) {
    return { count: null, note: `gh lässt sich hier nicht starten (${firstLine(String(error))})` }
  }
}

/**
 * Opens the project's repository in the person's own browser: `gh` hands the address to the
 * system's default browser, not to the browser pane inside the app.
 */
async function openRepo($: Engine): Promise<void> {
  try {
    const { exitCode, stderr } = await $.process.run(['gh', 'repo', 'view', '--web'], {
      timeoutMs: 15_000,
    })
    if (exitCode !== 0) {
      $.ui.toast(`Repo lässt sich nicht öffnen: ${firstLine(stderr)}`)
    }
  } catch (error) {
    $.ui.toast(`Repo lässt sich nicht öffnen: ${firstLine(String(error))}`)
  }
}

/**
 * Counts the open pull requests into the band's state: at most every five minutes for one
 * folder, at once for another, unless forced. A folder without a project has no band: no count.
 */
async function refreshPrs($: Engine, cwd: string, isForced: boolean): Promise<void> {
  if (projectOf(cwd) === null) {
    return
  }
  const now = await $.clock.now()
  const isSameFolder = cwd === prsFor
  if (!isForced && isSameFolder && prsCheckedAt !== null && now - prsCheckedAt < PR_EVERY_MS) {
    return
  }
  prsCheckedAt = now
  prsFor = cwd
  const { count, note } = await readOpenPrs($)
  // A reading that fails keeps the last good number, but only of the same folder.
  await update($, view, v => ({
    ...v,
    openPrs: count ?? (isSameFolder ? v.openPrs : null),
    prsNote: note,
  }))
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
    '/projektfarbe band       Band, Kontext-Anzeige, PR-Zahl und Farbpunkt am Spinner ein- oder ausblenden',
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
      argumentHint: '[farbe | standard | alle | band | schlaf | bunt]',
    })
    // In the background, so the session start never waits on the app.
    void startUp($, e.cwd).catch(() => undefined)

    return next(e)
  })

  // After each of the session's own turns (a subagent's are skipped). In the
  // background: the turn never waits on the app or on the person's answer there.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      void afterTurn($).catch(() => undefined)
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

      const prs =
        state.openPrs !== null
          ? `\nOffene PRs: ${prLabel(state.openPrs)}`
          : state.prsNote === null
            ? ''
            : `\nPR-Zahl nicht verfügbar: ${state.prsNote}`

      return { text: `${head}${prs}\n\n${hilfe(satz)}` }
    }
    if (arg === 'alle') {
      const renamed = await recolorAll($, null)

      return { text: `${renamed} Session(s) mit ihrer Projektfarbe umbenannt.` }
    }
    if (arg === 'band') {
      const isHidden = !state.isHidden
      await $.store.set('bandAus', isHidden)
      await update($, view, v => ({ ...v, isHidden }))

      return {
        text: isHidden
          ? 'Band ausgeblendet (mit Kontext-Anzeige, PR-Zahl und Farbpunkt am Spinner).'
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
    const { hex, contextPercent: percent, openPrs } = state
    if (state.isHidden || state.project === null || state.mark === null || hex === null) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
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

    return (
      <Box columnGap={2} flexWrap="wrap">
        <Text>
          {isCalm ? (
            <Text color={hex}>{state.mark}</Text>
          ) : (
            <Text mono backgroundColor={hex}>
              {NBSP.repeat(2)}
            </Text>
          )}
          <Text bold={!isCalm}>{` ${state.project}`}</Text>
        </Text>
        {percent === null || e.props.view.agentId !== undefined ? null : (
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
        {openPrs === null ? null : (
          <Text>
            {NBSP.repeat(6)}
            <Text dimColor>PRs: </Text>
            <Text bold>{prLabel(openPrs)}</Text>
          </Text>
        )}
        {openPrs === null ? null : (
          <Button key="repo" plain onPress={() => openRepo($)}>
            <Text dimColor>Repo ↗</Text>
          </Button>
        )}
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
