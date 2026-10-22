import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpContentBlock, Register } from 'claude-code'

import type { ProjektfarbenView } from '../types'
import {
  assignFarben,
  farbeFor,
  FARBEN,
  findFarbe,
  learnPicks,
  planTitle,
  projectOf,
  readPicks,
  readTried,
  rememberTry,
  toRow,
  type Farbe,
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
  isPicking: false,
  isHidden: false,
}
const view = atom({ plugin: 'projektfarben', key: 'view' } as const, EMPTY)

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

const picksOf = async ($: Engine): Promise<Record<string, string>> =>
  readPicks(await $.store.get('farben'))

/** The picks, with a color handed to each of these projects that has none yet (and stored). */
async function ensurePicks($: Engine, projects: readonly string[]): Promise<Record<string, string>> {
  const picks = await picksOf($)
  const next = assignFarben(projects, picks)
  if (Object.keys(next).length !== Object.keys(picks).length) {
    await $.store.set('farben', next)
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
 * Left undone when the app cannot be asked, and tried again at the next start.
 */
async function learnOnce($: Engine): Promise<void> {
  if ((await $.store.get('gelernt')) === true) {
    return
  }
  const self = toRow(await callJson($, 'get_session', { session_id: 'self' }), 'self')
  const rows = await listRows($)
  const learned = learnPicks(self === null ? rows : [self, ...rows])
  await $.store.set('farben', { ...(await picksOf($)), ...learned })
  await $.store.set('gelernt', true)
}

async function rename($: Engine, sessionId: string, title: string): Promise<Outcome> {
  const result = await $.mcp.call(SERVER, 'set_session_title', { session_id: sessionId, title })

  return result.isError ? 'failed' : 'renamed'
}

/** Puts the project's color mark in front of one session's title. */
async function recolor($: Engine, row: SessionRow, picks: Record<string, string>): Promise<Outcome> {
  const plan = planTitle(row, picks)

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
  const project = projectOf(row.cwd)
  const plan = planTitle(row, await ensurePicks($, project === null ? [] : [project]))
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
  await refreshView($, await $.session.cwd())
  if ((await recolorSelf($, false)) === 'unnamed') {
    $.clock.after(RETRY_MS, () => {
      void recolorSelf($, false).catch(() => undefined)
    })
  }
}

/** Recolors every open session, or those of one project. Returns how many it renamed. */
async function recolorAll($: Engine, onlyProject: string | null): Promise<number> {
  const rows = await listRows($)
  const projects = rows.map(row => projectOf(row.cwd)).filter((p): p is string => p !== null)
  const picks = await ensurePicks($, projects)
  const wanted = onlyProject?.toLowerCase()
  let renamed = (await recolorSelf($, true)) === 'renamed' ? 1 : 0
  for (const row of rows) {
    if (wanted !== undefined && projectOf(row.cwd)?.toLowerCase() !== wanted) {
      continue
    }
    try {
      renamed += (await recolor($, row, picks)) === 'renamed' ? 1 : 0
    } catch {
      // One session that cannot be renamed does not stop the others.
    }
  }

  return renamed
}

/** Reads the project and its color into the band's state. */
async function refreshView($: Engine, cwd: string): Promise<void> {
  const project = projectOf(cwd)
  const farbe = project === null ? null : farbeFor(project, await ensurePicks($, [project]))
  const isHidden = (await $.store.get('bandAus')) === true
  await update($, view, v => ({
    ...v,
    project,
    mark: farbe?.mark ?? null,
    hex: farbe?.hex ?? null,
    isHidden,
  }))
}

/** Stores the person's color for this project (null: the next free one) and recolors its sessions. */
async function choose($: Engine, farbe: Farbe | null): Promise<string> {
  const { project } = await read($, view)
  if (project === null) {
    return 'Diese Session liegt in keinem Projektordner, sie hat keine Projektfarbe.'
  }
  const picks = await picksOf($)
  const key = project.toLowerCase()
  delete picks[key]
  const next = farbe === null ? assignFarben([project], picks) : { ...picks, [key]: farbe.mark }
  await $.store.set('farben', next)
  await update($, view, v => ({ ...v, isPicking: false }))
  await refreshView($, await $.session.cwd())
  const now = farbeFor(project, next)
  const renamed = await recolorAll($, project).catch(() => 0)

  return `${now.mark} ${project} ist jetzt ${now.name}; ${renamed} Session(s) umbenannt.`
}

/** At the session's start: learn the sidebar's colors once, draw the band, mark the title. */
async function startUp($: Engine, cwd: string): Promise<void> {
  await learnOnce($).catch(() => undefined)
  await refreshView($, cwd)
  await recolorSelf($, false)
}

const HILFE = [
  '/projektfarbe            zeigt die Farbe dieses Projekts',
  '/projektfarbe <farbe>    setzt sie und färbt alle Sessions des Projekts um',
  '/projektfarbe standard   nächste freie Farbe automatisch',
  '/projektfarbe alle       färbt alle offenen Sessions neu ein',
  '/projektfarbe band       Band über dem Eingabefeld ein- oder ausblenden',
  '',
  `Farben: ${FARBEN.map(f => `${f.mark} ${f.name}`).join(', ')}`,
].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'projektfarbe',
      description: 'Farbe dieses Projekts zeigen oder ändern (Farbpunkt vor den Session-Namen)',
      argumentHint: '[farbe | standard | alle | band]',
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

    if (arg === '') {
      const name = FARBEN.find(f => f.mark === state.mark)?.name ?? 'keine'
      const head =
        state.project === null
          ? 'Diese Session liegt in keinem Projektordner.'
          : `${state.mark ?? ''} ${state.project}: ${name}`

      return { text: `${head}\n\n${HILFE}` }
    }
    if (arg === 'alle') {
      const renamed = await recolorAll($, null)

      return { text: `${renamed} Session(s) mit ihrer Projektfarbe umbenannt.` }
    }
    if (arg === 'band') {
      const isHidden = !state.isHidden
      await $.store.set('bandAus', isHidden)
      await update($, view, v => ({ ...v, isHidden }))

      return { text: isHidden ? 'Band ausgeblendet.' : 'Band eingeblendet.' }
    }
    if (arg === 'standard') {
      return { text: await choose($, null) }
    }
    const farbe = findFarbe(arg)
    if (farbe === undefined) {
      return { text: `Unbekannte Farbe „${e.args.trim()}“.\n\n${HILFE}` }
    }

    return { text: await choose($, farbe) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const state = await read($, view)
    if (state.isHidden || state.project === null || state.mark === null) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const pick = async (farbe: Farbe): Promise<void> => {
      $.ui.toast(await choose($, farbe))
    }

    if (state.isPicking) {
      return (
        <Box flexDirection="column">
          <Text dimColor>Farbe für {state.project}:</Text>
          <Box flexWrap="wrap" columnGap={1}>
            {FARBEN.map(farbe => (
              <Button key={`farbe-${farbe.name}`} plain onPress={() => pick(farbe)}>
                {farbe.mark}
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
        </Box>
      )
    }

    return (
      <Box columnGap={1}>
        <Text bold color={state.hex ?? 'text'}>
          {state.mark} {state.project}
        </Text>
        <Button
          key="farbe"
          plain
          onPress={() => update($, view, v => ({ ...v, isPicking: true }))}
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
}
