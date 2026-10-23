import { expect, mock, test } from 'claude-code/testing'

import {
  alterText,
  archiveReason,
  assignFarben,
  bandBreite,
  bandStufe,
  buildBereiche,
  buildUebersicht,
  BUNT,
  contextFill,
  contextLevel,
  contextPercent,
  DAEMMERUNG,
  desiredTitle,
  farbeFor,
  FARBEN,
  findFarbe,
  findSatz,
  ghNumbers,
  ghPrs,
  learnPicks,
  markOf,
  markSeen,
  mergePrs,
  modusLabel,
  nameBudget,
  newCount,
  prLabel,
  projectOf,
  readPicks,
  SAETZE,
  readSeen,
  readStand,
  rememberStand,
  satzOf,
  seenFor,
  shortName,
  statusOf,
  stripMark,
  superscript,
  toListed,
  uebersichtZaehler,
  uebersichtText,
  type GhPr,
  type Grund,
} from './colors'

const ALPHA = 'C:\\Users\\me\\Repos\\Alpha'
const BETA = 'C:\\Users\\me\\Repos\\Beta'
// The key of Beta's entry in `gesehen`: its repository folder (`repoKeyOf`).
const BETA_KEY = 'c:/users/me/repos/beta'

const BAND = {
  plugin: 'projektfarben',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const RUN = {
  command: 'projektfarbe',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

// What the band's color block and gauge are drawn with: blanks that keep their width on a colored background.
const NBSP = String.fromCharCode(0xa0)

const TURN = { answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const

type Row = { sessionId: string; title: string; cwd: string }

/**
 * A stand-in for the desktop app's session tools, holding titles in memory.
 * `refuse`: the person says no when the app asks about a title they set.
 */
function fakeDesktop(self: Row, others: Row[], options: { refuse?: boolean } = {}) {
  const all = [self, ...others]
  const calls = { get: 0, list: 0, set: 0 }
  const reply = (value: unknown) => ({
    value: { content: [{ type: 'text', text: JSON.stringify(value) }], isError: false },
  })

  return {
    all,
    calls,
    hook: (_: unknown, e: { tool: string; args: Record<string, unknown> }) => {
      if (e.tool === 'get_session') {
        calls.get += 1

        return reply(self)
      }
      if (e.tool === 'list_sessions') {
        calls.list += 1

        return reply(others)
      }
      calls.set += 1
      const id = e.args.session_id === 'self' ? self.sessionId : e.args.session_id
      const row = all.find(one => one.sessionId === id)
      if (row !== undefined && options.refuse !== true) {
        row.title = String(e.args.title)
      }

      return reply({ ok: true })
    },
  }
}

test('a worktree belongs to its repository, a scratch folder to none', async () => {
  expect(projectOf(`${ALPHA}\\.claude\\worktrees\\brave-otter-1a2b3c`)).toBe('Alpha')
  expect(projectOf('/home/me/code/beta/')).toBe('beta')
  expect(projectOf('C:\\Users\\me\\AppData\\Local\\Claude-Data\\x\\scratch-workspaces\\a\\b')).toBe(
    null,
  )
})

test('the mark goes in front once, replaces an old one and waits for a real title', async () => {
  expect(desiredTitle('Fix the login bug', '🟦')).toBe('🟦 Fix the login bug')
  expect(desiredTitle('🟩 Fix the login bug', '🟦')).toBe('🟦 Fix the login bug')
  expect(desiredTitle('🟦 Fix the login bug', '🟦')).toBe('🟦 Fix the login bug')
  expect(desiredTitle('New session', '🟦')).toBe(null)
  expect(stripMark('⚪ Release notes')).toBe('Release notes')
})

test('a new project gets the next free color; a picked one is kept', async () => {
  expect(farbeFor('Alpha', {}).mark).toBe('🟦')
  expect(farbeFor('Beta', { alpha: '🟦' }).mark).toBe('🟩')
  expect(farbeFor('Alpha', { alpha: '🟥' }).mark).toBe('🟥')
  expect(assignFarben(['Alpha', 'Beta', 'Gamma'], { beta: '🟦' })).toEqual({
    beta: '🟦',
    alpha: '🟩',
    gamma: '🟧',
  })
  // All 18 taken: a color from the name, the same every time.
  const full = Object.fromEntries(FARBEN.map((f, i) => [`p${i}`, f.mark]))
  expect(farbeFor('Delta', full).mark).toBe(farbeFor('delta', full).mark)
  expect(findFarbe('Grün')?.mark).toBe('🟩')
  expect(findFarbe('kreis weiß')?.mark).toBe('⚪')
  expect(findFarbe('🟪')?.name).toBe('lila')
  expect(findFarbe('pink')).toBe(undefined)
})

test('the context fill is read from the usage figures; the gauge warns from 70 %', async () => {
  expect(contextPercent({ context: { window: 200_000, percent: 41.6 } })).toBe(42)
  expect(contextPercent({ context: { window: 200_000, tokens: 50_000 } })).toBe(25)
  expect(contextPercent({ context: { window: 200_000, percent: 140 } })).toBe(100)
  // Before the first answer the engine has no figure: no gauge rather than 0 %.
  expect(contextPercent({ context: { window: 200_000 } })).toBe(null)
  expect(contextPercent({ context: { percent: Number.NaN } })).toBe(null)
  expect(contextPercent(undefined)).toBe(null)
  expect([69, 70, 84, 85].map(contextLevel)).toEqual(['ok', 'warn', 'warn', 'full'])
  // Any use at all shows one cell; a full window fills all eight.
  expect([0, 3, 7, 50, 100].map(percent => contextFill(percent))).toEqual([0, 1, 1, 4, 8])
  // The short bar of the compact band has four cells.
  expect([0, 3, 50, 100].map(percent => contextFill(percent, 4))).toEqual([0, 1, 2, 4])
})

// The band of the target picture: LightWeightBrowser, both counts unknown, a gauge at 8 %.
const ZIEL = { name: 18, prs: 2, issues: 2, percent: 1 } as const

test('the band picks the roomiest layout that fits its cells, and none is roomier when there is less room', async () => {
  expect(bandStufe(120, ZIEL)).toBe('voll')
  expect(bandStufe(94, ZIEL)).toBe('voll')
  expect(bandStufe(80, ZIEL)).toBe('icons')
  expect(bandStufe(63, ZIEL)).toBe('kompakt')
  expect(bandStufe(40, ZIEL)).toBe('zwei')

  const order = ['zwei', 'kompakt', 'icons', 'voll']
  const steps = Array.from({ length: 140 }, (_, i) => order.indexOf(bandStufe(i + 1, ZIEL)))
  expect(steps).toEqual([...steps].sort((a, b) => a - b))

  // A longer name or more digits need more room; a missing gauge needs less.
  expect(bandStufe(94, { ...ZIEL, name: 28 })).not.toBe('voll')
  expect(bandStufe(94, { ...ZIEL, prs: 6, issues: 6 })).not.toBe('voll')
  expect(bandBreite('voll', { ...ZIEL, percent: null })).toBeLessThan(bandBreite('voll', ZIEL))
  expect(bandBreite('zwei', ZIEL)).toBe(Number.POSITIVE_INFINITY)
})

test('the layouts switch where the desktop screenshots of the band switched', async () => {
  // The target picture's window (a 729 px band, about 91 cells) still shows the written-out actions.
  expect(bandStufe(91, ZIEL)).toBe('voll')
  // ClaudeColours (13 characters, counts 0) in bands of 720, 687, 533, 518, 475 and 428 px.
  const claude = { name: 13, prs: 2, issues: 2, percent: 1 }
  expect([90, 85, 66, 64, 58, 52].map(columns => bandStufe(columns, claude))).toEqual([
    'voll',
    'icons',
    'icons',
    'icons',
    'kompakt',
    'zwei',
  ])
})

test('a name too long for the first row of the two-row band is cut with an ellipsis', async () => {
  expect(shortName('LightWeightBrowser', 18)).toBe('LightWeightBrowser')
  expect(shortName('LightWeightBrowser', 10)).toBe('LightWeig…')
  expect(shortName('Beta', 4)).toBe('Beta')
  expect(shortName('Beta', 1)).toBe('B…')
  // At 40 cells the whole name still fits; at 30 it has to give way, but never below eight characters.
  expect(nameBudget(40, ZIEL)).toBeGreaterThanOrEqual(18)
  expect(nameBudget(30, ZIEL)).toBeLessThan(18)
  expect(nameBudget(10, ZIEL)).toBe(8)
})

test('the open pull requests are the length of the list gh prints; 100 shows as 100+', async () => {
  expect(ghNumbers('[{"number":4},{"number":9}]')?.length).toBe(2)
  expect(ghNumbers('[]')).toEqual([])
  expect(ghNumbers('')).toBe(null)
  expect(ghNumbers('{"number":4}')).toBe(null)
  expect(ghNumbers('gh: not logged in')).toBe(null)
  // gh is asked for 101: exactly 100 shows as it is, one more as 100+.
  expect([0, 7, 99, 100, 101].map(prLabel)).toEqual(['0', '7', '99', '100', '100+'])
})

test("the sidebar's colors are learned: the mark most of a project's sessions carry", async () => {
  expect(
    learnPicks([
      { sessionId: '1', title: '🟧 One', cwd: ALPHA },
      { sessionId: '2', title: '🟧 Two', cwd: `${ALPHA}\\.claude\\worktrees\\x` },
      { sessionId: '3', title: '🟦 Three', cwd: ALPHA },
      { sessionId: '4', title: 'Unmarked', cwd: BETA },
      { sessionId: '5', title: '🟥 Scratch', cwd: 'C:\\x\\scratch-workspaces\\y' },
    ]),
  ).toEqual({ alpha: '🟧' })
})

test('a turn puts the color in front of the title; /projektfarbe recolors the project', async ($, on) => {
  const self = { sessionId: 'local_self', title: 'Fix the login bug', cwd: `${ALPHA}\\.claude\\worktrees\\a` }
  const desk = fakeDesktop(self, [
    { sessionId: 'local_a', title: 'Write the docs', cwd: `${ALPHA}\\.claude\\worktrees\\b` },
    { sessionId: 'local_b', title: 'Release notes', cwd: `${BETA}\\.claude\\worktrees\\c` },
  ])
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(self.title).toBe('🟦 Fix the login bug')

  const ran = await $.command.run({ ...RUN, args: 'rot' })
  expect(ran.text).toContain('🟥 Alpha ist jetzt rot')
  expect(desk.all.map(row => row.title)).toEqual([
    '🟥 Fix the login bug',
    '🟥 Write the docs',
    'Release notes',
  ])

  // Blue is free again, so Beta gets it.
  await $.command.run({ ...RUN, args: 'alle' })
  expect(desk.all[2]?.title).toBe('🟦 Release notes')
})

test('colors already in the sidebar are kept, and learned only once', async ($, on) => {
  const self = { sessionId: 'local_self', title: 'New idea', cwd: ALPHA }
  const desk = fakeDesktop(self, [
    { sessionId: 'local_a', title: '🟧 Old work', cwd: `${ALPHA}\\.claude\\worktrees\\b` },
    { sessionId: 'local_b', title: '🟦 Other', cwd: BETA },
  ])
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(self.title).toBe('🟧 New idea')
  expect(desk.calls.list).toBe(1)

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(desk.calls.list).toBe(1)
})

test('a session the app names late gets its mark 20 s after the turn', async ($, on) => {
  const self = { sessionId: 'local_new', title: 'New session', cwd: `${ALPHA}\\.claude\\worktrees\\a` }
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await $.turn.complete(TURN)
  await clock.settle()
  expect(self.title).toBe('New session')

  self.title = 'First question'
  await clock.advance(19_000)
  expect(self.title).toBe('First question')
  await clock.advance(1_000)
  expect(self.title).toBe('🟦 First question')
})

test('a title the person kept is asked about once per session', async ($, on) => {
  const self = { sessionId: 'local_mine', title: 'My own name', cwd: `${ALPHA}\\.claude\\worktrees\\a` }
  const desk = fakeDesktop(self, [], { refuse: true })
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  await $.turn.complete(TURN)
  await clock.settle()
  expect(desk.calls.set).toBe(1)
  expect(self.title).toBe('My own name')
})

test('after a restart a title already asked about is not asked about again', async ($, on) => {
  const self = { sessionId: 'local_mine', title: 'My own name', cwd: `${ALPHA}\\.claude\\worktrees\\a` }
  const desk = fakeDesktop(self, [], { refuse: true })
  const clock = mock.clock(on)
  // What the store kept from before the restart; the session's own state starts empty.
  mock.store(on, { versucht: { local_mine: 'My own name' } })
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  await $.turn.complete(TURN)
  await clock.settle()
  expect(desk.calls.set).toBe(0)
})

test("a subagent's turn reads nothing; the band follows a color picked elsewhere", async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const desk = fakeDesktop(self, [])
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const reads = desk.calls.get
  await $.turn.complete({ ...TURN, agentId: 'a1' })
  await clock.settle()
  expect(desk.calls.get).toBe(reads)

  // Another session of the project picks purple: the store is shared, this band follows.
  await $.command.run({ ...RUN, args: 'lila' })
  self.title = 'Neu'
  await $.turn.complete(TURN)
  await clock.settle()
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const texts = await ui.findAll({ type: 'Text' })
  expect(texts.some(text => /Beta/.test(text.text))).toBe(true)
  expect(texts.some(text => text.props.backgroundColor === '#a855f7')).toBe(true)
  await ui.unmount()
  expect(self.title).toBe('🟪 Neu')
})

test('the band shows the project in its color and hides on request', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // Stands for the engine's own (empty) band once the mod hands it on.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const texts = await ui.findAll({ type: 'Text' })
    expect(texts.some(text => /Beta/.test(text.text))).toBe(true)
    // The color block: two blanks on the project's color.
    expect(texts.find(text => text.props.backgroundColor === '#3b82f6')?.children).toEqual([NBSP.repeat(2)])
    // No usage figure yet, so no gauge.
    expect(texts.some(text => /Kontext/.test(text.text))).toBe(false)
    // No gh in this test: the counts show a dimmed ? (unknown) rather than leave a gap.
    expect(await countOf(ui, 'prs')).toBe('PRs: ?')
    await ui.press({ key: 'farbe' })
    expect(await ui.find({ key: 'farbe-lila' })).toBeDefined()
    await ui.press({ key: 'abbrechen' })
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'ausblenden' })
  expect(await ui.find({ type: 'Text', text: /Beta/ })).toBe(undefined)
  await ui.unmount()
})

test('the band gauges the context window after each turn: a warning from 70 %, bold red from 85 %', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  let percent = 41
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000, percent }, rateLimits: [] },
  }))
  on('turn.complete', () => ({ text: '' }))

  // The gauge is a run of blanks on the fill color, one on the track color, and the percentage.
  const gauge = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const texts = await ui.findAll({ type: 'Text' })
    await ui.unmount()
    const on = (color: string) => texts.find(text => text.props.backgroundColor === color)

    return {
      fill: on('inactive') ?? on('warning') ?? on('error'),
      track: on('subtle'),
      // The Text that holds the number itself, not the one around the whole gauge (no props).
      percent: texts.find(text => /\d+ %$/.test(text.text) && Object.keys(text.props).length > 0),
    }
  }

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const calm = await gauge()
  expect(calm.fill?.props).toMatchObject({ backgroundColor: 'inactive' })
  expect(calm.fill?.children).toEqual([NBSP.repeat(3)])
  expect(calm.track?.children).toEqual([NBSP.repeat(5)])
  expect(calm.percent?.text.trim()).toBe('41 %')
  expect(calm.percent?.props).toMatchObject({ dimColor: true })

  percent = 72
  await $.turn.complete(TURN)
  await clock.settle()
  const warn = await gauge()
  expect(warn.fill?.props).toMatchObject({ backgroundColor: 'warning' })
  expect(warn.fill?.children).toEqual([NBSP.repeat(6)])
  expect(warn.percent?.text.trim()).toBe('72 %')
  expect(warn.percent?.props).toMatchObject({ color: 'warning' })

  percent = 90
  await $.turn.complete(TURN)
  await clock.settle()
  const full = await gauge()
  expect(full.fill?.props).toMatchObject({ backgroundColor: 'error' })
  expect(full.fill?.children).toEqual([NBSP.repeat(7)])
  expect(full.percent?.text.trim()).toBe('90 %')
  expect(full.percent?.props).toMatchObject({ color: 'error', bold: true })

  // A full window leaves no track.
  percent = 100
  await $.turn.complete(TURN)
  await clock.settle()
  const brim = await gauge()
  expect(brim.fill?.children).toEqual([NBSP.repeat(8)])
  expect(brim.track).toBe(undefined)
})

test('the spinner carries the project mark; hiding the band takes it away', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // Stands for the engine's own spinner: it draws the message, or else the word, it is handed.
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.message ?? e.props.word}</Text>
  })

  const SPINNER = { plugin: 'projektfarben', component: 'Spinner', surface: 'desktop' } as const
  const shown = async (props: { word: string; message: string | null }) => {
    const ui = await $.ui.mount({
      ...SPINNER,
      props: { ...props, suffix: '…', mode: 'thinking' },
    })
    const found = await ui.find({ type: 'Text' })
    await ui.unmount()

    return found?.text
  }

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await shown({ word: 'Sauteing', message: null })).toBe('🟦 Sauteing')
  expect(await shown({ word: 'Sauteing', message: 'Compacting' })).toBe('🟦 Compacting')

  await $.command.run({ ...RUN, args: 'band' })
  expect(await shown({ word: 'Sauteing', message: null })).toBe('Sauteing')
})

/** What `$.process.run` answers when `gh pr list` printed these pull requests. */
const ghList = (numbers: number[]) => ({
  value: {
    exitCode: 0,
    stdout: JSON.stringify(numbers.map(number => ({ number }))),
    stderr: '',
    isStdoutTruncated: false,
    isStderrTruncated: false,
  },
})

test('the band counts the open pull requests with gh, at most every five minutes', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  let open = [1, 2]
  const asked: string[][] = []
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', (_, e) => {
    // The repository's address is read once beside the counts; only the counts are timed here.
    if (e.argv[1] !== 'repo') {
      asked.push([...e.argv])
    }

    return ghList(open)
  })

  const shown = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const texts = await ui.findAll({ type: 'Text' })
    const shownCount = await countOf(ui, 'prs')
    await ui.unmount()
    // The number stands in bold beside the word, outside the button.
    expect(texts.some(text => text.props.bold === true && /^ \d+\+?$/.test(text.text))).toBe(true)

    return shownCount
  }

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await shown()).toBe('PRs: 2')
  // Pull requests, then issues.
  expect(asked).toEqual([
    ['gh', 'pr', 'list', '--state', 'open', '--limit', '101', '--json', 'number'],
    ['gh', 'issue', 'list', '--state', 'open', '--limit', '101', '--json', 'number'],
  ])

  // A turn within five minutes does not ask again; one after them does.
  open = [1, 2, 3]
  await $.turn.complete(TURN)
  await clock.settle()
  expect(asked).toHaveLength(2)
  expect(await shown()).toBe('PRs: 2')
  await clock.advance(5 * 60_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(asked).toHaveLength(4)
  // #3 is newer than the #2 seen at the start: raised as new.
  expect(await shown()).toBe('PRs: 3⁺¹')
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain('Offene PRs: 3')
})

/** What `$.process.run` answers for `gh repo view --json url`: the address, or a failure. */
const ghUrl = (url: string | null) =>
  url === null
    ? ghFails('no default remote repository\nrun gh repo set-default')
    : { value: { exitCode: 0, stdout: `${url}\n`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }

test("the project's color and name link to the repository, read once per folder", async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const asked: string[][] = []
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', (_, e) => {
    asked.push([...e.argv])

    return e.argv[1] === 'repo' ? ghUrl('https://github.com/me/beta') : ghList([1])
  })

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const links = await ui.findAll({ type: 'Link' })
  await ui.unmount()
  expect(links.map(link => link.props.href)).toEqual(['https://github.com/me/beta'])
  // The link holds the color block and the bold name, as before.
  expect(links[0]?.text).toContain('Beta')
  expect(asked).toContainEqual(['gh', 'repo', 'view', '--json', 'url', '--jq', '.url'])

  await clock.advance(5 * 60_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(asked.filter(argv => argv[1] === 'repo')).toHaveLength(1)
})

test('without an address the name stays plain text, and the next count asks again', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  let url: string | null = null
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', (_, e) => (e.argv[1] === 'repo' ? ghUrl(url) : ghList([1])))

  const band = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const links = (await ui.findAll({ type: 'Link' })).map(link => link.props.href)
    const colored = (await ui.findAll({ type: 'Text' })).some(text => text.props.backgroundColor === '#3b82f6')
    await ui.unmount()

    return { links, colored }
  }

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await band()).toEqual({ links: [], colored: true })

  url = 'https://github.com/me/beta'
  await clock.advance(5 * 60_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(await band()).toEqual({ links: ['https://github.com/me/beta'], colored: true })
})

test('without a working gh the band shows ? for the counts, and /projektfarbe says why', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  let fails: 'start' | 'exit' = 'start'
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('process.run', () => {
    if (fails === 'start') {
      throw new Error('spawn gh ENOENT')
    }

    return {
      value: {
        exitCode: 1,
        stdout: '',
        stderr: 'no git remotes found\nsecond line',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })


  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  // The band keeps its shape: a dimmed ? for what could not be read; /projektfarbe says why.
  expect(await counts($)).toEqual({ prs: 'PRs: ?', issues: 'Issues: ?', raised: [] })
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain(
    'PR-Zahl nicht verfügbar: gh lässt sich hier nicht starten',
  )

  fails = 'exit'
  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await counts($)).toEqual({ prs: 'PRs: ?', issues: 'Issues: ?', raised: [] })
  const text = (await $.command.run({ ...RUN, args: '' })).text
  expect(text).toContain('PR-Zahl nicht verfügbar: gh meldet: no git remotes found')
  expect(text).not.toContain('second line')
})

/** A hex color in OKLab (L, a, b), to hold the sleep colors to their promise. */
function oklab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

test('every color set has unique names and marks, and an order that names them all', async () => {
  for (const satz of SAETZE) {
    const names = satz.farben.map(f => f.name)
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(satz.farben.map(f => f.mark)).size).toBe(satz.farben.length)
    expect([...satz.reihenfolge].sort()).toEqual([...names].sort())
    expect(satz.farben.every(f => /^#[0-9a-f]{6}$/.test(f.hex))).toBe(true)
  }
  // No mark belongs to two sets, or a title could not tell them apart.
  const marks = SAETZE.flatMap(s => s.farben.map(f => f.mark))
  expect(new Set(marks).size).toBe(marks.length)
  // The mode switch shows each set by its own emoji, so none may be missing or shared.
  expect(new Set(SAETZE.map(s => s.emoji)).size).toBe(SAETZE.length)
  expect(SAETZE.every(s => s.emoji !== '')).toBe(true)
  expect(SAETZE.map(modusLabel)).toEqual(['🎨 Bunt', '🌙 Dämmerung'])
  expect(satzOf(undefined)).toBe(BUNT)
  expect(satzOf('daemmerung')).toBe(DAEMMERUNG)
  expect(findSatz('Dämmerung')).toBe(DAEMMERUNG)
  expect(findSatz('mond')).toBe(undefined)
})

test('the sleep colors stay calm (chroma under 0.06) and apart (at least 5)', async () => {
  const labs = DAEMMERUNG.farben.map(f => oklab(f.hex))
  for (const [, a, b] of labs) {
    expect(Math.hypot(a, b)).toBeLessThan(0.06)
  }
  let closest = Infinity
  labs.forEach((x, i) => {
    for (const y of labs.slice(i + 1)) {
      closest = Math.min(closest, Math.hypot(...x.map((v, k) => (v - (y[k] ?? 0)) * 100)))
    }
  })
  expect(closest).toBeGreaterThan(5)
})

test('sleep marks are plain shapes: stripped from any set, and only in front of a space', async () => {
  expect(stripMark('◆ Release notes')).toBe('Release notes')
  expect(stripMark('⬤ 🟦 Release notes')).toBe('Release notes')
  expect(stripMark('▲Plan')).toBe('▲Plan')
  expect(stripMark('■')).toBe('')
  expect(markOf('◆ Release notes')?.name).toBe('moos')
  expect(markOf('◆ Release notes', BUNT)).toBe(undefined)
  expect(desiredTitle('🟦 Fix the login bug', '◆')).toBe('◆ Fix the login bug')
  expect(desiredTitle('■', '◆')).toBe(null)
})

test('the sleep set hands out its colors in order, from its own picks', async () => {
  expect(farbeFor('Alpha', {}, DAEMMERUNG).mark).toBe('⬤')
  expect(farbeFor('Beta', { alpha: '⬤' }, DAEMMERUNG).mark).toBe('■')
  // A mark of the other set is not a pick of this one.
  expect(farbeFor('Alpha', { alpha: '🟥' }, DAEMMERUNG).mark).toBe('⬤')
  expect(readPicks({ alpha: '◆', beta: '🟦' }, DAEMMERUNG)).toEqual({ alpha: '◆' })
  expect(readPicks({ alpha: '◆', beta: '🟦' })).toEqual({ beta: '🟦' })
  const full = Object.fromEntries(DAEMMERUNG.farben.map((f, i) => [`p${i}`, f.mark]))
  expect(farbeFor('Delta', full, DAEMMERUNG).mark).toBe(farbeFor('delta', full, DAEMMERUNG).mark)
  expect(findFarbe('Moos', DAEMMERUNG)?.mark).toBe('◆')
  expect(findFarbe('◐', DAEMMERUNG)?.name).toBe('petrol')
  expect(findFarbe('moos')).toBe(undefined)
  expect(findFarbe('rot', DAEMMERUNG)).toBe(undefined)
  // Shapes already in the sidebar are not picks of the bright set.
  const row = { sessionId: '1', title: '◆ One', cwd: ALPHA }
  expect(learnPicks([row])).toEqual({})
  expect(learnPicks([row], DAEMMERUNG)).toEqual({ alpha: '◆' })
})

test('sleep mode swaps every mark for a calm one, and bunt swaps them back', async ($, on) => {
  const self = { sessionId: 'local_self', title: 'Fix the login bug', cwd: `${ALPHA}\\.claude\\worktrees\\a` }
  const desk = fakeDesktop(self, [
    { sessionId: 'local_a', title: '🟦 Write the docs', cwd: `${ALPHA}\\.claude\\worktrees\\b` },
    { sessionId: 'local_b', title: '🟩 Release notes', cwd: `${BETA}\\.claude\\worktrees\\c` },
  ])
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const bright = ['🟦 Fix the login bug', '🟦 Write the docs', '🟩 Release notes']
  expect(desk.all.map(row => row.title)).toEqual(bright)

  const slept = await $.command.run({ ...RUN, args: 'schlaf' })
  expect(slept.text).toContain('Schlafmodus (Dämmerung) an; 3 Session(s) umbenannt')
  expect(desk.all.map(row => row.title)).toEqual([
    '⬤ Fix the login bug',
    '⬤ Write the docs',
    '■ Release notes',
  ])

  // The band shows the shape and offers the calm colors only.
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const texts = await ui.findAll({ type: 'Text' })
  expect(texts.find(text => text.text === '⬤')?.props).toMatchObject({ color: DAEMMERUNG.farben[0]?.hex })
  expect(texts.some(text => /Alpha/.test(text.text))).toBe(true)
  await ui.press({ key: 'farbe' })
  expect(await ui.find({ key: 'farbe-moos' })).toBeDefined()
  expect(await ui.find({ key: 'farbe-lila' })).toBe(undefined)
  await ui.press({ key: 'abbrechen' })
  await ui.unmount()

  // A pick in sleep mode uses the sleep names; the bright ones are not known there.
  const picked = await $.command.run({ ...RUN, args: 'moos' })
  expect(picked.text).toContain('◆ Alpha ist jetzt moos')
  expect((await $.command.run({ ...RUN, args: 'rot' })).text).toContain('Unbekannte Farbe')
  expect(desk.all.map(row => row.title)).toEqual([
    '◆ Fix the login bug',
    '◆ Write the docs',
    '■ Release notes',
  ])

  // Back to bright: each project has the color it had before.
  const back = await $.command.run({ ...RUN, args: 'bunt' })
  expect(back.text).toContain('Bunte Farben wieder an; 3 Session(s) umbenannt')
  expect(desk.all.map(row => row.title)).toEqual(bright)
})

test('sleep mode survives a restart, and an unknown sleep set is refused', async ($, on) => {
  const self = { sessionId: 'local_self', title: 'Another one', cwd: ALPHA }
  const desk = fakeDesktop(self, [])
  const clock = mock.clock(on)
  // What the store kept from before the restart.
  mock.store(on, { modus: 'daemmerung', gelernt: true, 'farben-daemmerung': { alpha: '▼' } })
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(self.title).toBe('▼ Another one')

  const refused = await $.command.run({ ...RUN, args: 'schlaf mond' })
  expect(refused.text).toContain('Unbekannter Schlafmodus')
  expect(self.title).toBe('▼ Another one')
})

test('the color picker switches between the bright colors and sleep mode', async ($, on) => {
  const self = { sessionId: 'local_self', title: 'Fix the login bug', cwd: `${ALPHA}\\.claude\\worktrees\\a` }
  const desk = fakeDesktop(self, [
    { sessionId: 'local_a', title: '🟦 Write the docs', cwd: `${ALPHA}\\.claude\\worktrees\\b` },
  ])
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', desk.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(desk.all.map(row => row.title)).toEqual(['🟦 Fix the login bug', '🟦 Write the docs'])

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  // One entry per set, its emoji and name; the one in use is bold, the others dimmed.
  const modes = async () =>
    (await ui.findAll({ type: 'Text' }))
      .filter(text => SAETZE.some(satz => text.text === modusLabel(satz)))
      .map(text => `${text.props.bold === true ? 'an' : 'aus'}: ${text.text}`)

  // The switch sits in the color picker.
  await ui.press({ key: 'farbe' })
  expect(await modes()).toEqual(['an: 🎨 Bunt', 'aus: 🌙 Dämmerung'])

  await ui.press({ key: 'modus-daemmerung' })
  expect(desk.all.map(row => row.title)).toEqual(['⬤ Fix the login bug', '⬤ Write the docs'])
  // The switch closed the picker; opened again it shows the new mode, and its colors.
  await ui.press({ key: 'farbe' })
  expect(await modes()).toEqual(['aus: 🎨 Bunt', 'an: 🌙 Dämmerung'])
  expect(await ui.find({ key: 'farbe-moos' })).toBeDefined()

  // The mode in use asks for nothing: no title is renamed again.
  const renames = desk.calls.set
  await ui.press({ key: 'modus-daemmerung' })
  expect(desk.calls.set).toBe(renames)

  await ui.press({ key: 'modus-bunt' })
  expect(desk.all.map(row => row.title)).toEqual(['🟦 Fix the login bug', '🟦 Write the docs'])
  await ui.unmount()
})

test('the picker reads the mode from the store: another session may have switched it', async ($, on) => {
  const self = { sessionId: 'local_self', title: 'Fix the login bug', cwd: `${ALPHA}\\.claude\\worktrees\\a` }
  const clock = mock.clock(on)
  // The store is the one thing the sessions share, so the test holds it itself.
  const kept = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  // Sleep mode was switched on elsewhere; this band has not been redrawn since.
  kept.set('modus', 'daemmerung')

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'farbe' })
  const bold = (await ui.findAll({ type: 'Text' })).filter(text => text.props.bold === true)
  expect(bold.some(text => text.text === modusLabel(DAEMMERUNG))).toBe(true)
  expect(await ui.find({ key: 'farbe-moos' })).toBeDefined()

  // The bright mode is not the one in use, so pressing it switches.
  await ui.press({ key: 'modus-bunt' })
  expect(kept.get('modus')).toBe('bunt')
  await ui.unmount()
})

test('a count that cannot be read again is kept for the same folder and dropped for another', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  let cwd = self.cwd
  let isBroken = false
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', () =>
    isBroken
      ? {
          value: {
            exitCode: 1,
            stdout: '',
            stderr: 'not a git repository',
            isStdoutTruncated: false,
            isStderrTruncated: false,
          },
        }
      : ghList([1, 2]),
  )


  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect((await counts($)).prs).toBe('PRs: 2')

  // gh fails five minutes later, in the same folder: the number of before stays.
  isBroken = true
  await clock.advance(5 * 60_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect((await counts($)).prs).toBe('PRs: 2')

  // In another folder the old number says nothing about the new repository: 0 until read.
  cwd = `${ALPHA}\\.claude\\worktrees\\a`
  await $.turn.complete(TURN)
  await clock.settle()
  expect((await counts($)).prs).toBe('PRs: ?')
})

test("the gauge shows the main conversation's window, not an agent's view", async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000, percent: 40 }, rateLimits: [] },
  }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const hasGauge = async (view: { agentId?: string }) => {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, view }, surface: 'desktop' })
    const texts = await ui.findAll({ type: 'Text' })
    await ui.unmount()

    return texts.some(text => /Kontext/.test(text.text))
  }

  expect(await hasGauge({})).toBe(true)
  expect(await hasGauge({ agentId: 'a1' })).toBe(false)
})

/** A store the test holds itself, so it can read what the mod wrote and write as another session. */
function sharedStore(on: Parameters<typeof mock.store>[0], entries: Record<string, unknown> = {}) {
  const kept = new Map<string, unknown>(Object.entries(entries))
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => {
    kept.set(e.key, e.value)

    return { value: undefined }
  })

  return kept
}

test('new entries show as raised digits; the first reading is the baseline, and the highest seen never drops', async () => {
  expect([0, 1, 2, 10, 123].map(superscript)).toEqual(['', '⁺¹', '⁺²', '⁺¹⁰', '⁺¹²³'])
  expect(ghNumbers('[{"number":4},{"number":9}]')).toEqual([4, 9])
  expect(ghNumbers('[{"title":"x"},{"number":2}]')).toEqual([2])
  expect(ghNumbers('gh: not logged in')).toBe(null)

  // Nothing seen yet: nothing is new.
  expect(newCount([3, 7, 9], undefined)).toBe(0)
  expect(newCount([3, 7, 9], 7)).toBe(1)
  expect(newCount([], 7)).toBe(0)

  // The first reading sets the baseline once; a later first-only reading leaves it.
  const first = markSeen({}, 'Beta', 'issue', [4, 9], true)
  expect(first).toEqual({ beta: { issue: 9 } })
  expect(markSeen(first, 'beta', 'issue', [4, 9, 12], true)).toBe(first)
  // An empty repository is seen at 0, so its first issue counts as new.
  expect(markSeen({}, 'beta', 'pr', [], true)).toEqual({ beta: { pr: 0 } })
  // Seeing all raises the baseline, never lowers it; the other kind stays.
  const both = markSeen(first, 'beta', 'pr', [5], false)
  expect(both).toEqual({ beta: { issue: 9, pr: 5 } })
  expect(markSeen(both, 'beta', 'issue', [2], false)).toBe(both)

  expect(readSeen({ Beta: { pr: 3, issue: 'x' }, broken: 5 })).toEqual({ beta: { pr: 3 } })
  expect(readSeen(null)).toEqual({})
})

test('what was seen is kept per repository folder; an entry under the project name still counts', async () => {
  const work = 'c:/work/api'
  const home = 'c:/home/api'
  // Before this version the entry was keyed by the project name: it is the baseline until the
  // repository has its own, so updating shows no "+x" twice.
  const legacy = { api: { pr: 10, issue: 4 } }
  expect(seenFor(legacy, work, 'api')).toEqual({ pr: 10, issue: 4 })
  expect(markSeen(legacy, work, 'pr', [12], true, 'api')).toBe(legacy)
  const seen = markSeen(legacy, work, 'pr', [12, 11], false, 'api')
  expect(seen).toEqual({ api: { pr: 10, issue: 4 }, [work]: { pr: 12, issue: 4 } })
  expect(seenFor(seen, work, 'api')).toEqual({ pr: 12, issue: 4 })
  // Two repositories with the same folder name no longer share what was seen.
  const other = markSeen(seen, home, 'pr', [3], false)
  expect(seenFor(other, home)).toEqual({ pr: 3 })
  expect(seenFor(other, work, 'api')).toEqual({ pr: 12, issue: 4 })
})

const ghFails = (stderr: string) => ({
  value: { exitCode: 1, stdout: '', stderr, isStdoutTruncated: false, isStderrTruncated: false },
})

/** What `$.process.run` answers for `gh pr list` and `gh issue list`, and the argv it was asked. */
function fakeGh(lists: { pr: number[]; issue: number[] | 'disabled' }) {
  const asked: string[][] = []

  return {
    asked,
    lists,
    hook: (_: unknown, e: { argv: readonly string[] }) => {
      asked.push([...e.argv])
      if (e.argv.includes('--web')) {
        return ghList([])
      }
      const numbers = lists[e.argv[1] === 'issue' ? 'issue' : 'pr']

      return numbers === 'disabled' ? ghFails('the repository has disabled issues') : ghList(numbers)
    },
  }
}

type Tested = Parameters<Parameters<typeof test>[1]>[0]

/** The PR and issue counts as the band shows them, with the color of each raised "+x". */
/** A count as the band shows it: the word (the button), then the bold number and any "+x". */
async function countOf(ui: Awaited<ReturnType<Tested['ui']['mount']>>, key: 'prs' | 'issues') {
  const box = await ui.find({ key: `${key}-zahl` })

  return box?.text.replace(/\s+/g, ' ')
}

async function counts($: Tested) {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const texts = await ui.findAll({ type: 'Text' })
  const prs = await countOf(ui, 'prs')
  const issues = await countOf(ui, 'issues')
  await ui.unmount()

  return {
    prs,
    issues,
    raised: texts.filter(text => text.text.startsWith('⁺')).map(text => text.props.color),
  }
}

test('the band counts the open issues next to the pull requests and raises the new ones', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const gh = fakeGh({ pr: [3, 2], issue: [5, 4, 1] })
  const clock = mock.clock(on)
  const kept = sharedStore(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', gh.hook)

  // The first reading is the baseline: nothing is new yet.
  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await counts($)).toEqual({ prs: 'PRs: 2', issues: 'Issues: 3', raised: [] })
  expect(kept.get('gesehen')).toEqual({ [BETA_KEY]: { pr: 3, issue: 5 } })

  // Five minutes later: one new pull request, two new issues (one old one closed meanwhile).
  gh.lists.pr = [6, 3, 2]
  gh.lists.issue = [8, 7, 5, 4]
  await clock.advance(5 * 60_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(await counts($)).toEqual({
    prs: 'PRs: 3⁺¹',
    issues: 'Issues: 4⁺²',
    raised: ['suggestion', 'suggestion'],
  })
  const text = (await $.command.run({ ...RUN, args: '' })).text
  expect(text).toContain('Offene PRs: 3 (1 neu)')
  expect(text).toContain('Offene Issues: 4 (2 neu)')

  // Opening the issue list in the browser reads the issues again and marks all open now as seen,
  // also #9, which came after the last count; the pull requests stay new.
  gh.lists.issue = [9, 8, 7, 5, 4]
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'issues' })
  await ui.unmount()
  expect(gh.asked).toContainEqual(['gh', 'issue', 'list', '--web'])
  expect(await counts($)).toEqual({ prs: 'PRs: 3⁺¹', issues: 'Issues: 5', raised: ['suggestion'] })
  expect(kept.get('gesehen')).toEqual({ [BETA_KEY]: { pr: 3, issue: 9 } })

  const again = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await again.press({ key: 'prs' })
  await again.unmount()
  expect(gh.asked).toContainEqual(['gh', 'pr', 'list', '--web'])
  expect(await counts($)).toEqual({ prs: 'PRs: 3', issues: 'Issues: 5', raised: [] })
})

test('what another session has seen counts here too', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const gh = fakeGh({ pr: [12, 11, 10], issue: [4] })
  const clock = mock.clock(on)
  const kept = sharedStore(on, { gesehen: { beta: { pr: 10, issue: 4 } } })
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', gh.hook)

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await counts($)).toEqual({ prs: 'PRs: 3⁺²', issues: 'Issues: 1', raised: ['suggestion'] })

  // Another session opened the list meanwhile: the next turn here drops the "+x", without asking gh.
  kept.set('gesehen', { beta: { pr: 12, issue: 4 } })
  const before = gh.asked.length
  await $.turn.complete(TURN)
  await clock.settle()
  expect(gh.asked).toHaveLength(before)
  expect(await counts($)).toEqual({ prs: 'PRs: 3', issues: 'Issues: 1', raised: [] })
})

test('a repository without issues still shows its pull requests; /projektfarbe says why', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const gh = fakeGh({ pr: [1], issue: 'disabled' })
  const clock = mock.clock(on)
  const kept = sharedStore(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', gh.hook)

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await counts($)).toEqual({ prs: 'PRs: 1', issues: 'Issues: ?', raised: [] })
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain(
    'Issue-Zahl nicht verfügbar: gh meldet: the repository has disabled issues',
  )
  // Only the pull requests got a baseline.
  expect(kept.get('gesehen')).toEqual({ [BETA_KEY]: { pr: 1 } })
})

test('a list that cannot be opened says why and keeps the "+x"', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const toasts: string[] = []
  const clock = mock.clock(on)
  mock.store(on, { gesehen: { beta: { pr: 1, issue: 0 } } })
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('process.run', (_, e) =>
    e.argv.includes('--web') ? ghFails('no default remote repository') : ghList([2, 1]),
  )

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'prs' })
  await ui.unmount()
  expect(toasts).toEqual(['PR-Liste lässt sich nicht öffnen: no default remote repository'])
  expect((await counts($)).prs).toBe('PRs: 2⁺¹')
})

test('the band puts the project, then the counts before the context gauge', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000, percent: 40 }, rateLimits: [] },
  }))
  on('process.run', fakeGh({ pr: [2, 1], issue: [3] }).hook)

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  // The whole band's text in document order.
  const whole = (await ui.find({ type: 'Box' }))?.text ?? ''
  const name = (await ui.findAll({ type: 'Text' })).find(text => text.props.color === 'text')
  const button = await ui.find({ key: 'prs' })
  await ui.unmount()
  const at = (part: string) => whole.indexOf(part)

  expect(at('Beta')).toBeGreaterThan(-1)
  expect(at('Beta')).toBeLessThan(at('PRs:'))
  expect(at('PRs:')).toBeLessThan(at('Issues:'))
  expect(at('Issues:')).toBeLessThan(at('Kontext'))
  // No separate repo button any more: the project name links to the repository.
  expect(at('Repo')).toBe(-1)
  // The name keeps the theme's text color and bold inside the link; only the word is a button.
  expect(name?.text).toBe(' Beta')
  expect(name?.props.bold).toBe(true)
  expect(button?.text).toBe('PRs:')
})

/** A band in a desktop session of `cwd`, with a context gauge at 8 %. */
async function startBand($: Tested, on: Parameters<typeof mock.store>[0], cwd: string) {
  const self = { sessionId: 'local_b', title: 'Neu', cwd }
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000, percent: 8 }, rateLimits: [] },
  }))
  // Stands for the engine's own (empty) band once the mod hands it on, as the band is hidden.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  await $.session.start({ cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
}

/** What the band shows at `bodyColumns` cells: its rows' layout, the action labels and the gauge. */
async function drawBand($: Tested, bodyColumns: number) {
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  const texts = await ui.findAll({ type: 'Text' })
  const shown = {
    isStacked: (await ui.find({ type: 'Box' }))?.props.flexDirection === 'column',
    actions: [
      (await ui.find({ key: 'uebersicht' }))?.text,
      (await ui.find({ key: 'farbe' }))?.text,
      (await ui.find({ key: 'ausblenden' }))?.text,
    ],
    hasWord: texts.some(text => /Kontext/.test(text.text)),
    barCells: texts
      .filter(text => text.props.backgroundColor === 'inactive' || text.props.backgroundColor === 'subtle')
      .reduce((sum, text) => sum + text.text.length, 0),
    name: texts.find(text => text.props.color === 'text')?.text,
  }
  await ui.unmount()

  return shown
}

test('the band lays itself out by its cells: written out, icons, a short bar, then two rows', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  const wide = await drawBand($, 120)
  expect(wide).toMatchObject({ isStacked: false, actions: ['Übersicht ☰', 'Farbe ändern', 'ausblenden'], hasWord: true, barCells: 8 })

  const medium = await drawBand($, 70)
  expect(medium).toMatchObject({ isStacked: false, actions: ['☰', '◐', '✕'], hasWord: true, barCells: 8 })

  // No word and a bar of four cells; still one row.
  const compact = await drawBand($, 50)
  expect(compact).toMatchObject({ isStacked: false, actions: ['☰', '◐', '✕'], hasWord: false, barCells: 4 })

  // The first row stays; the gauge and the icons stand in a second one.
  const narrow = await drawBand($, 30)
  expect(narrow).toMatchObject({ isStacked: true, actions: ['☰', '◐', '✕'], hasWord: true, barCells: 8, name: ' Beta' })

  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toBe(
    'Das Band hat 30 Zellen und ist im Layout „zwei“ gezeichnet (Name: 4 Zeichen).',
  )
})

test('/projektfarbe breite says so when the band is hidden, and when it was not drawn yet', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toBe('Das Band wurde in dieser Session noch nicht gezeichnet.')

  await $.command.run({ ...RUN, args: 'band' })
  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toBe(
    'Das Band ist ausgeblendet; /projektfarbe band blendet es wieder ein.',
  )

  await $.command.run({ ...RUN, args: 'band' })
  await drawBand($, 120)
  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toMatch(/^Das Band hat 120 Zellen und ist im Layout „voll“/)
})

test('the two-row band centers its icons where there is no gauge, and keeps them right of it otherwise', async ($, on) => {
  await startBand($, on, `${BETA}\.claude\worktrees\a`)

  const rowOf = async (view: { agentId?: string }) => {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 30, view }, surface: 'desktop' })
    const boxes = await ui.findAll({ type: 'Box' })
    await ui.unmount()

    return boxes.find(box => box.props.justifyContent === 'center' || box.props.justifyContent === 'space-between')
  }

  // A subagent's view has no gauge: the number is the main session's.
  expect((await rowOf({ agentId: 'a1' }))?.props.justifyContent).toBe('center')
  expect((await rowOf({}))?.props.justifyContent).toBe('space-between')
})

test('the icons press what the written actions do, in every layout', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  for (const bodyColumns of [120, 70, 50, 30]) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
    await ui.press({ key: 'farbe' })
    expect(await ui.find({ key: 'farbe-lila' })).toBeDefined()
    await ui.press({ key: 'abbrechen' })
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 30 }, surface: 'desktop' })
  await ui.press({ key: 'ausblenden' })
  expect(await ui.find({ type: 'Text', text: /Beta/ })).toBe(undefined)
  await ui.unmount()
})

test('a project name too long for the two-row band is cut; the other layouts keep it whole', async ($, on) => {
  await startBand($, on, 'C:\\Users\\me\\Repos\\AVeryLongProjectNameForTheBandTest')

  expect((await drawBand($, 200)).name).toBe(' AVeryLongProjectNameForTheBandTest')
  const narrow = await drawBand($, 30)
  expect(narrow.isStacked).toBe(true)
  expect(narrow.name).toMatch(/^ \S+…$/)
  expect(narrow.name?.length).toBeLessThan(' AVeryLongProjectNameForTheBandTest'.length)
})

const HOUR = 60 * 60_000
const DAY = 24 * HOUR
const NOW = Date.parse('2026-10-23T12:00:00.000Z')

/** A list_sessions entry as the app gives it, with fields as needed. */
const listed = (fields: Record<string, unknown>) => ({
  sessionId: 'local_s',
  title: '🟦 Fix the login bug',
  cwd: `${ALPHA}\\.claude\\worktrees\\a`,
  branch: 'claude/login',
  isRunning: false,
  isArchived: false,
  lastActivityAt: new Date(NOW - 2 * HOUR).toISOString(),
  ...fields,
})

const session = (fields: Record<string, unknown> = {}) => toListed(listed(fields))!

const pr = (fields: Partial<GhPr> = {}): GhPr => ({
  number: 7,
  state: 'OPEN',
  headRefName: 'claude/login',
  isDraft: false,
  reviewDecision: null,
  isCiRed: false,
  ...fields,
})

test('the stand of each session is read safely and kept for the newest 300 sessions', async () => {
  expect(readStand({ a: { grund: 'aborted', um: 5 }, b: { grund: 'nope', um: 1 }, c: 'x', d: { grund: 'answer' } })).toEqual({
    a: { grund: 'aborted', um: 5 },
  })
  expect(readStand(null)).toEqual({})
  let stand = {}
  for (let i = 0; i < 305; i += 1) {
    stand = rememberStand(stand, `s${i}`, { grund: 'answer', um: i })
  }
  stand = rememberStand(stand, 's10', { grund: 'error', um: 999 })
  const ids = Object.keys(stand)
  expect(ids).toHaveLength(300)
  expect(ids[0]).toBe('s5')
  expect(ids[299]).toBe('s10')
})

test('the sessions list and gh pr list are read into what the status needs', async () => {
  const row = session({ prNumber: 3, prState: 'OPEN' })
  expect(row.lastActivityAt).toBe(NOW - 2 * HOUR)
  expect(row.appPr).toEqual({ number: 3, state: 'OPEN' })
  expect(session({ branch: '', lastActivityAt: 'later' })).toMatchObject({ branch: null, lastActivityAt: null, appPr: null })
  expect(toListed({ title: 'x' })).toBe(null)

  const stdout = JSON.stringify([
    {
      number: 9, state: 'OPEN', headRefName: 'a', isDraft: true, reviewDecision: 'REVIEW_REQUIRED',
      statusCheckRollup: [
        { __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SUCCESS' },
        { __typename: 'StatusContext', state: 'FAILURE' },
      ],
    },
    { number: 8, state: 'MERGED', headRefName: 'b', isDraft: false, reviewDecision: '', statusCheckRollup: [] },
    { number: 'x', state: 'OPEN', headRefName: 'c' },
  ])
  expect(ghPrs(stdout)).toEqual([
    { number: 9, state: 'OPEN', headRefName: 'a', isDraft: true, reviewDecision: 'REVIEW_REQUIRED', isCiRed: true },
    { number: 8, state: 'MERGED', headRefName: 'b', isDraft: false, reviewDecision: null, isCiRed: false },
  ])
  expect(ghPrs('not json')).toBe(null)
  expect(ghPrs('{}')).toBe(null)
})

test('a session is running, aborted, failed, in work or resting; a newer answer clears an abort', async () => {
  const at = (grund: Grund) => ({ grund, um: NOW - HOUR })
  const sign = (s: ReturnType<typeof session>, stand?: { grund: Grund; um: number }) => {
    const status = statusOf(s, stand, [], NOW)

    return `${status.mark} ${status.label}`
  }
  expect(sign(session({ isRunning: true }), at('aborted'))).toBe('▶ läuft')
  expect(sign(session(), at('aborted'))).toBe('⚠ abgebrochen')
  expect(sign(session(), at('error'))).toBe('⚠ Fehler')
  expect(sign(session(), at('refusal'))).toBe('⚠ Fehler (Modell lehnte ab)')
  // Only the last turn is kept: an answer after the abort is all that is left.
  expect(sign(session(), at('answer'))).toBe('✎ in Arbeit, kein PR')
  // A session from before this version has no stand: no abort info, still a status.
  expect(sign(session())).toBe('✎ in Arbeit, kein PR')
  expect(sign(session({ lastActivityAt: new Date(NOW - 5 * DAY).toISOString() }))).toBe('💤 ruht seit 5 Tagen, kein PR')
  // Exactly three days is not yet resting; the last turn counts as activity too.
  expect(sign(session({ lastActivityAt: new Date(NOW - 3 * DAY).toISOString() }))).toBe('✎ in Arbeit, kein PR')
  expect(sign(session({ lastActivityAt: new Date(NOW - 9 * DAY).toISOString() }), { grund: 'answer', um: NOW - DAY })).toBe(
    '✎ in Arbeit, kein PR',
  )
  const ranks = [
    statusOf(session(), at('aborted'), [], NOW),
    statusOf(session(), undefined, [pr({ isCiRed: true })], NOW),
    statusOf(session(), undefined, [pr()], NOW),
    statusOf(session(), undefined, [], NOW),
    statusOf(session({ isRunning: true }), undefined, [], NOW),
    statusOf(session(), undefined, [pr({ state: 'MERGED' })], NOW),
    statusOf(session({ lastActivityAt: new Date(NOW - 5 * DAY).toISOString() }), undefined, [], NOW),
  ].map(status => status.rang)
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
})

test('an abort or failure left alone for days rests, and a merged or closed pull request beats it', async () => {
  const old = new Date(NOW - 5 * DAY).toISOString()
  const status = (fields: Record<string, unknown>, grund: Grund, prs: GhPr[] = []) =>
    statusOf(session(fields), { grund, um: NOW - 5 * DAY }, prs, NOW)

  const aborted = status({ lastActivityAt: old }, 'aborted')
  expect(`${aborted.mark} ${aborted.label}`).toBe('💤 ruht seit 5 Tagen, kein PR, zuletzt abgebrochen')
  expect(aborted).toMatchObject({ art: 'ruht', tage: 5 })
  expect(status({ lastActivityAt: old }, 'error').label).toBe('ruht seit 5 Tagen, kein PR, zuletzt Fehler')
  // So the panel can offer to archive it.
  const zeile = { sessionId: 'x', title: 'Alt', status: aborted, alter: '', lastActive: null, isSelf: false, link: null }
  expect(archiveReason(zeile)).toBe('ruht seit 5 Tagen')
  // An old abort with an open pull request: the pull request is what is left to do.
  expect(status({ lastActivityAt: old }, 'aborted', [pr()]).art).toBe('pr-offen')

  // A recent abort whose pull request merged or closed meanwhile: the work is done.
  const recent = { grund: 'aborted' as const, um: NOW - HOUR }
  expect(statusOf(session(), recent, [pr({ state: 'MERGED' })], NOW).art).toBe('pr-gemerged')
  expect(statusOf(session({ prNumber: 7, prState: 'CLOSED' }), recent, null, NOW).art).toBe('pr-geschlossen')
  // Only resting statuses carry days.
  expect(statusOf(session(), recent, [], NOW).tage).toBe(null)
})

test('a cancelled check is not a red CI; the open pull requests with checks win over the plain list', async () => {
  const rollup = (conclusion: string) =>
    ghPrs(
      JSON.stringify([
        { number: 1, state: 'OPEN', headRefName: 'a', statusCheckRollup: [{ status: 'COMPLETED', conclusion }] },
      ]),
    )?.[0]?.isCiRed
  expect(rollup('CANCELLED')).toBe(false)
  expect(rollup('SKIPPED')).toBe(false)
  expect(rollup('FAILURE')).toBe(true)
  expect(rollup('TIMED_OUT')).toBe(true)

  const open = [pr({ number: 9, isCiRed: true, reviewDecision: 'REVIEW_REQUIRED' })]
  const all = [pr({ number: 9 }), pr({ number: 8, state: 'MERGED' }), pr({ number: 10, state: 'CLOSED' })]
  expect(mergePrs(open, all)?.map(one => [one.number, one.state, one.isCiRed])).toEqual([
    [10, 'CLOSED', false],
    [9, 'OPEN', true],
    [8, 'MERGED', false],
  ])
  expect(mergePrs(null, all)).toHaveLength(3)
  expect(mergePrs(open, null)).toEqual(open)
  expect(mergePrs(null, null)).toBe(null)
})

test("a session's pull request is the newest on its branch, with what it is waiting for", async () => {
  const label = (prs: GhPr[] | null, fields: Record<string, unknown> = {}) => {
    const status = statusOf(session(fields), undefined, prs, NOW)

    return `${status.mark} ${status.label}`
  }
  expect(label([pr()])).toBe('🔀 PR #7 offen')
  expect(label([pr({ isCiRed: true, reviewDecision: 'REVIEW_REQUIRED' })])).toBe('🔀 PR #7 offen, CI rot, Review wartet')
  expect(label([pr({ isDraft: true })])).toBe('🔀 PR #7 offen, Entwurf')
  expect(label([pr({ reviewDecision: 'CHANGES_REQUESTED' })])).toBe('🔀 PR #7 offen, Änderungen gewünscht')
  expect(label([pr({ state: 'MERGED', isCiRed: true })])).toBe('✓ PR #7 gemerged')
  expect(label([pr({ state: 'CLOSED' })])).toBe('✖ PR #7 geschlossen')
  // Several on one branch: the newest counts, an old closed one is history.
  expect(label([pr({ number: 4, state: 'CLOSED' }), pr({ number: 12 }), pr({ number: 9, state: 'MERGED' })])).toBe(
    '🔀 PR #12 offen',
  )
  // A branch without one, or another session's branch: no pull request.
  expect(label([pr({ headRefName: 'claude/other' })])).toBe('✎ in Arbeit, kein PR')
  expect(label([pr()], { branch: null })).toBe('✎ in Arbeit, kein PR')
  // gh not available: no pull request part, still a status; the app's own link fills in when it has one.
  expect(label(null)).toBe('✎ in Arbeit, kein PR')
  expect(label(null, { prNumber: 5, prState: 'MERGED' })).toBe('✓ PR #5 gemerged')
  expect(label(null, { prNumber: 5, prState: 'OPEN' })).toBe('🔀 PR #5 offen')
  // Running or aborted: the pull request rides along.
  expect(label([pr()], { isRunning: true })).toBe('▶ läuft · PR #7 offen')
  expect(statusOf(session(), { grund: 'aborted', um: NOW }, [pr()], NOW).label).toBe('abgebrochen · PR #7 offen')
})

test("the app's own pull request comes first; gh only adds what it waits for", async () => {
  const label = (prs: GhPr[] | null, fields: Record<string, unknown>) => {
    const status = statusOf(session(fields), undefined, prs, NOW)

    return `${status.mark} ${status.label}`
  }
  const app = { prNumber: 3, prState: 'OPEN' }
  // gh lists a newer one on the branch: the app's number still counts, with gh's details for it.
  expect(label([pr({ number: 12 }), pr({ number: 3, isCiRed: true, isDraft: true })], app)).toBe(
    '🔀 PR #3 offen, CI rot, Entwurf',
  )
  // gh does not know the app's number (or is not there): the app's PR without details.
  expect(label([pr({ number: 12 })], app)).toBe('🔀 PR #3 offen')
  // The app's state wins over gh's; a closed or merged one gets no details.
  expect(label([pr({ number: 3, state: 'OPEN', isCiRed: true })], { prNumber: 3, prState: 'MERGED' })).toBe(
    '✓ PR #3 gemerged',
  )
  // gh's details for the app's PR count for the order too.
  expect(statusOf(session(app), undefined, [pr({ number: 3, isCiRed: true })], NOW).rang).toBe(1)
  // Without a number from the app, gh by branch is the fallback.
  expect(label([pr({ number: 12 })], {})).toBe('🔀 PR #12 offen')
})

test('how long ago reads in short German', async () => {
  expect([0, 59_000, 5 * 60_000, 2 * HOUR + 59 * 60_000, DAY, 3 * DAY].map(alterText)).toEqual([
    'gerade eben',
    'gerade eben',
    'vor 5 Min',
    'vor 2 Std',
    'vor 1 Tag',
    'vor 3 Tagen',
  ])
})

test('the overview groups by project, the most urgent first, and prints a line per session', async () => {
  const sessions = [
    session({ sessionId: 'a1', title: '🟦 Ruhig', branch: 'x', lastActivityAt: new Date(NOW - 6 * DAY).toISOString() }),
    session({ sessionId: 'a2', title: '🟦 Neu', branch: 'y', cwd: ALPHA, lastActivityAt: new Date(NOW - 10 * 60_000).toISOString() }),
    session({ sessionId: 'b1', title: '🟩 PR rot', cwd: `${BETA}\\.claude\\worktrees\\q`, branch: 'claude/beta' }),
    session({ sessionId: 'b2', title: 'Archiviert', cwd: BETA, isArchived: true }),
    session({ sessionId: 'c1', title: 'Notiz', cwd: 'C:\\x\\scratch-workspaces\\y', isRunning: true }),
  ]
  const overview = buildUebersicht({
    sessions,
    selfId: 'a2',
    stand: { a2: { grund: 'aborted', um: NOW - 10 * 60_000 } },
    prs: new Map([
      ['c:/users/me/repos/alpha', []],
      ['c:/users/me/repos/beta', [pr({ number: 3, headRefName: 'claude/beta', isCiRed: true })]],
    ]),
    markOf: project => (project === 'Alpha' ? '🟦' : '🟩'),
    now: NOW,
    hinweise: ['PR-Stand für Gamma nicht verfügbar: gh meldet: no'],
  })
  expect(overview.gruppen.map(g => [g.project, g.zeilen.map(z => z.sessionId)])).toEqual([
    ['Alpha', ['a2', 'a1']],
    ['Beta', ['b1']],
    [null, ['c1']],
  ])
  expect(uebersichtText(overview)).toBe(
    [
      '4 offene Session(s), was Aufmerksamkeit braucht zuerst:',
      '',
      '🟦 Alpha',
      '  ⚠ Neu (diese) — abgebrochen · vor 10 Min',
      '  💤 Ruhig — ruht seit 6 Tagen, kein PR · vor 6 Tagen',
      '',
      '🟩 Beta',
      '  🔀 PR rot — PR #3 offen, CI rot · vor 2 Std',
      '',
      'Ohne Projekt',
      '  ▶ Notiz — läuft · vor 2 Std',
      '',
      'PR-Stand für Gamma nicht verfügbar: gh meldet: no',
    ].join('\n'),
  )
  expect(uebersichtText({ gruppen: [], hinweise: [] })).toBe('Keine offenen Sessions gefunden.')
})

test("each own turn stores why it ended and when; a subagent's does not", async ($, on) => {
  const self = { sessionId: 'local_self', title: '🟦 Arbeit', cwd: ALPHA }
  const clock = mock.clock(on)
  const kept = sharedStore(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(kept.get('stand')).toBe(undefined)

  await $.turn.complete({ ...TURN, reason: 'aborted', isAborted: true })
  await clock.settle()
  const first = clock.now()
  expect(kept.get('stand')).toEqual({ local_self: { grund: 'aborted', um: first } })

  await clock.advance(60_000)
  await $.turn.complete({ ...TURN, agentId: 'a1', reason: 'error' })
  await clock.settle()
  expect(kept.get('stand')).toEqual({ local_self: { grund: 'aborted', um: first } })

  await $.turn.complete(TURN)
  await clock.settle()
  expect(kept.get('stand')).toEqual({ local_self: { grund: 'answer', um: first + 60_000 } })
})

test('/projektfarbe status asks gh once per repository, in a folder of it, and still answers without gh', async ($, on) => {
  const clock = mock.clock(on)
  await clock.set(NOW)
  const self = listed({ sessionId: 'local_self', title: '🟦 Status bauen', cwd: `${ALPHA}\\.claude\\worktrees\\a`, branch: 'claude/status', isRunning: true })
  const others = [
    listed({ sessionId: 'local_a', title: '🟦 Login', cwd: `${ALPHA}\\.claude\\worktrees\\b`, branch: 'claude/login' }),
    listed({ sessionId: 'local_b', title: '🟩 Doku', cwd: `${BETA}\\.claude\\worktrees\\c`, branch: 'claude/doku', lastActivityAt: new Date(NOW - 4 * DAY).toISOString() }),
    listed({ sessionId: 'local_c', title: '🟩 Alt', cwd: BETA, branch: 'main', prNumber: 2, prState: 'OPEN' }),
  ]
  const asked: { argv: string[]; cwd: string | undefined }[] = []
  mock.store(on, { stand: { local_a: { grund: 'aborted', um: NOW - 3 * HOUR } }, farben: { alpha: '🟦', beta: '🟩' } })
  on('mcp.call', fakeDesktop(self as Row, others as Row[]).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('process.run', (_, e) => {
    asked.push({ argv: [...e.argv], cwd: e.init?.cwd })
    // The overview's two readings name the branch; the band's counts do not.
    if (e.argv.some(arg => arg.includes('headRefName'))) {
      if (e.init?.cwd?.includes('Beta') === true) {
        return ghFails('could not resolve to a Repository')
      }
      // The open ones with their review; all of them with number, state and branch only.
      const prs = e.argv.includes('open')
        ? [{ number: 11, state: 'OPEN', headRefName: 'claude/login', isDraft: false, reviewDecision: 'REVIEW_REQUIRED', statusCheckRollup: [] }]
        : [
            { number: 11, state: 'OPEN', headRefName: 'claude/login' },
            { number: 10, state: 'CLOSED', headRefName: 'claude/login' },
          ]

      return {
        value: { exitCode: 0, stdout: JSON.stringify(prs), stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
      }
    }

    return ghList([])
  })

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  asked.length = 0
  const text = (await $.command.run({ ...RUN, args: 'status' })).text

  // Two readings per repository: the checks only for the open pull requests.
  expect(asked).toHaveLength(4)
  expect(asked.filter(one => one.cwd === self.cwd).map(one => one.argv)).toEqual([
    [
      'gh', 'pr', 'list', '--state', 'open', '--limit', '100',
      '--json', 'number,state,headRefName,isDraft,reviewDecision,statusCheckRollup',
    ],
    ['gh', 'pr', 'list', '--state', 'all', '--limit', '200', '--json', 'number,state,headRefName'],
  ])
  expect(asked.filter(one => one.cwd === others[1]!.cwd)).toHaveLength(2)
  expect(text).toBe(
    [
      '4 offene Session(s), was Aufmerksamkeit braucht zuerst:',
      '',
      '🟦 Alpha',
      '  ⚠ Login — abgebrochen · PR #11 offen, Review wartet · vor 2 Std',
      '  ▶ Status bauen (diese) — läuft · vor 2 Std',
      '',
      '🟩 Beta',
      '  🔀 Alt — PR #2 offen · vor 2 Std',
      '  💤 Doku — ruht seit 4 Tagen, kein PR · vor 4 Tagen',
      '',
      'PR-Stand für Beta nicht verfügbar: gh meldet: could not resolve to a Repository',
    ].join('\n'),
  )
})

test('/projektfarbe status says so when the app cannot be asked', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', () => ({ value: { content: [{ type: 'text', text: 'no such server' }], isError: true } }))
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: ALPHA }))

  await $.session.start({ cwd: ALPHA, surface: 'terminal', isInteractive: true })
  await clock.settle()
  const text = (await $.command.run({ ...RUN, args: 'status' })).text
  expect(text).toContain('Der Stand der Sessions lässt sich nicht lesen (nur in der Desktop-App)')
})

const PANE = {
  plugin: 'projektfarben',
  component: 'Pane',
  requestId: 'uebersicht',
  props: {
    title: 'Übersicht',
    isFocused: false,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

type TestEngine = Parameters<Parameters<typeof test>[1]>[0]
type TestOn = Parameters<Parameters<typeof test>[1]>[1]

test('the footer counts what needs the person; only resting sessions and closed pull requests can be archived', async () => {
  const sessions = [
    session({ sessionId: 'a', branch: 'x', lastActivityAt: new Date(NOW - 5 * DAY).toISOString() }),
    session({ sessionId: 'b', branch: 'y', lastActivityAt: new Date(NOW - 6 * DAY).toISOString() }),
    session({ sessionId: 'c', branch: 'z', prNumber: 4, prState: 'MERGED' }),
    session({ sessionId: 'd', branch: 'w', prNumber: 5, prState: 'CLOSED' }),
    session({ sessionId: 'e', branch: 'v', prNumber: 6, prState: 'OPEN' }),
    session({ sessionId: 'f', branch: 'u', isRunning: true }),
    session({ sessionId: 'g', branch: 't' }),
  ]
  const overview = buildUebersicht({
    sessions,
    selfId: 'g',
    stand: { f: { grund: 'answer', um: NOW }, g: { grund: 'aborted', um: NOW } },
    prs: new Map(),
    markOf: () => '🟦',
    now: NOW,
  })
  expect(uebersichtZaehler(overview)).toEqual({ sessions: 7, dringend: 1, dudran: 0, pr: 1, ruht: 2 })
  expect(uebersichtZaehler({ gruppen: [], hinweise: [] })).toEqual({ sessions: 0, dringend: 0, dudran: 0, pr: 0, ruht: 0 })
  const zeilen = overview.gruppen.flatMap(group => group.zeilen)
  const reasons = Object.fromEntries(zeilen.map(zeile => [zeile.sessionId, archiveReason(zeile)]))
  expect(reasons).toEqual({
    a: 'ruht seit 5 Tagen',
    b: 'ruht seit 6 Tagen',
    c: 'PR #4 gemerged',
    d: 'PR #5 geschlossen',
    e: null,
    f: null,
    g: null,
  })
  // The session the panel runs in is never offered, even when it rests.
  const own = buildUebersicht({
    sessions: [sessions[0]!],
    selfId: 'a',
    stand: {},
    prs: new Map(),
    markOf: () => '🟦',
    now: NOW,
  })
  expect(archiveReason(own.gruppen[0]!.zeilen[0]!)).toBe(null)
})

/** The desktop with sessions that carry what the overview needs, and a recorded archive_session. */
function panelDesktop(options: { refuseArchive?: boolean } = {}) {
  const self = listed({
    sessionId: 'local_self',
    title: '🟦 Panel bauen',
    cwd: `${ALPHA}\\.claude\\worktrees\\a`,
    branch: 'claude/panel',
    isRunning: true,
  })
  const others = [
    listed({
      sessionId: 'local_alt',
      title: '🟦 Alte Idee',
      cwd: `${ALPHA}\\.claude\\worktrees\\b`,
      branch: 'claude/alt',
      lastActivityAt: new Date(NOW - 5 * DAY).toISOString(),
    }),
    listed({ sessionId: 'local_ab', title: '🟩 Abgebrochen', cwd: `${BETA}\\.claude\\worktrees\\c`, branch: 'claude/ab' }),
    listed({ sessionId: 'local_pr', title: '🟩 Mit PR', cwd: BETA, branch: 'main', prNumber: 2, prState: 'OPEN' }),
    listed({ sessionId: 'local_wartet', title: '🟦 Frage offen', cwd: `${ALPHA}\\.claude\\worktrees\\d`, branch: 'claude/wartet' }),
  ].map(row => ({ ...row, link: `claude://claude.ai/epitaxy/${row.sessionId}` }))
  const archived: { session_id: unknown; reason: unknown }[] = []
  let lists = 0
  const reply = (value: unknown, isError = false) => ({
    value: { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }], isError },
  })

  return {
    archived,
    lists: () => lists,
    hook: (_: unknown, e: { tool: string; args: Record<string, unknown> }) => {
      if (e.tool === 'get_session') {
        return reply(self)
      }
      if (e.tool === 'list_sessions') {
        lists += 1

        return reply(others)
      }
      if (e.tool === 'archive_session') {
        archived.push({ session_id: e.args.session_id, reason: e.args.reason })

        return options.refuseArchive === true ? reply('Der Nutzer hat abgelehnt.', true) : reply({ ok: true })
      }

      return reply({ ok: true })
    },
    cwd: self.cwd,
  }
}

async function openedPanel($: TestEngine, on: TestOn, options: { refuseArchive?: boolean } = {}) {
  const clock = mock.clock(on)
  await clock.set(NOW)
  const desktop = panelDesktop(options)
  const toasts: string[] = []
  const closed: unknown[] = []
  // What is asked of the system to open a session; `works.on = false` has every opener fail.
  const opened: string[][] = []
  const works = { on: true }
  // How often the overview asked gh for a repository's pull requests (the band's counts aside).
  let ghAsks = 0
  mock.store(on, { stand: { local_ab: { grund: 'aborted', um: NOW - 3 * HOUR } }, farben: { alpha: '🟦', beta: '🟩' } })
  on('mcp.call', desktop.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: desktop.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', (_, e) => {
    closed.push(e.id)

    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('process.run', (_, e) => {
    if (e.argv[0] === 'gh') {
      if (e.argv.some(arg => arg.includes('headRefName'))) {
        ghAsks += 1
      }

      return ghList([])
    }
    opened.push([...e.argv])
    if (!works.on) {
      throw new Error('spawn ENOENT')
    }

    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start({ cwd: desktop.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const text = (await $.command.run({ ...RUN, args: 'übersicht' })).text
  await clock.settle()

  return { clock, desktop, toasts, closed, text, opened, works, ghAsks: () => ghAsks }
}

const panelText = async ($: TestEngine) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const whole = (await ui.find({ type: 'Box' }))?.text ?? ''
  const keys = (await ui.findAll({ type: 'Button' })).map(button => String(button.key))
  await ui.unmount()

  return { whole, keys }
}

test('/projektfarbe übersicht opens the panel: groups with the urgent project first, a line and the footer', async ($, on) => {
  const { text } = await openedPanel($, on)
  expect(text).toBe('Übersicht geöffnet.')

  const { whole, keys } = await panelText($)
  const at = (part: string) => whole.indexOf(part)
  // Beta has an aborted session and comes before Alpha, whose best session is still running.
  expect(at('Beta')).toBeGreaterThan(-1)
  expect(at('Beta')).toBeLessThan(at('Alpha'))
  expect(at('Abgebrochen')).toBeLessThan(at('Mit PR'))
  expect(whole).toContain('abgebrochen· vor 2 Std')
  expect(whole).toContain('PR #2 offen')
  // What runs is folded by default: its heading shows, its session does not.
  expect(whole).toContain('Läuft, nichts zu tun')
  expect(whole).not.toContain('Panel bauen')
  expect(whole).toContain('5 Sessions⚠ 1 dringend💬 1 wartet auf dich1 mit offenem PR1 ruht')
  // Only the resting session can be archived, never the running one that shows the panel.
  expect(keys.filter(key => key.startsWith('archivieren-'))).toEqual(['archivieren-local_alt'])
  expect(keys).toContain('aktualisieren')
  expect(keys).toContain('schliessen')
  // Every session but the one the panel runs in can be opened.
  expect(keys.filter(key => key.startsWith('oeffnen-'))).toHaveLength(4)
  expect(keys).not.toContain('oeffnen-local_self')
})

test('aktualisieren reads the sessions again; schliessen closes the panel', async ($, on) => {
  const { desktop, closed } = await openedPanel($, on)
  const before = desktop.lists()
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'aktualisieren' })
  expect(desktop.lists()).toBe(before + 1)
  await ui.press({ key: 'schliessen' })
  await ui.unmount()
  expect(closed).toEqual(['uebersicht'])
})

test('archivieren asks the app with a reason and reads the list again', async ($, on) => {
  const { desktop, toasts } = await openedPanel($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'archivieren-local_alt' })
  await ui.unmount()
  expect(desktop.archived).toEqual([{ session_id: 'local_alt', reason: 'ruht seit 5 Tagen' }])
  expect(toasts).toEqual(['„Alte Idee“ archiviert.'])
})

test('a refused archive is a toast, and the row stays', async ($, on) => {
  const { desktop, toasts } = await openedPanel($, on, { refuseArchive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'archivieren-local_alt' })
  await ui.unmount()
  expect(desktop.archived).toHaveLength(1)
  expect(toasts).toEqual(['„Alte Idee“ bleibt: Der Nutzer hat abgelehnt.'])
  expect((await panelText($)).keys).toContain('archivieren-local_alt')
})

test('an open panel is read again after a turn, at most once a minute', async ($, on) => {
  const { clock, desktop } = await openedPanel($, on)
  const base = desktop.lists()
  await $.turn.complete(TURN)
  await clock.settle()
  expect(desktop.lists()).toBe(base)

  await clock.advance(61_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(desktop.lists()).toBe(base + 1)
})

test('the panel reads the sessions every minute but asks gh at most every five, unless aktualisieren is pressed', async ($, on) => {
  const { clock, desktop, ghAsks } = await openedPanel($, on)
  // Opening read two repositories, two gh readings each.
  const base = ghAsks()
  expect(base).toBe(4)

  await clock.advance(61_000)
  await $.turn.complete(TURN)
  await clock.settle()
  const lists = desktop.lists()
  expect(ghAsks()).toBe(base)

  await clock.advance(5 * 60_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(desktop.lists()).toBe(lists + 1)
  expect(ghAsks()).toBe(base + 4)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'aktualisieren' })
  await ui.unmount()
  expect(ghAsks()).toBe(base + 8)
})

test('in sleep mode a project heading shows its mark once', async ($, on) => {
  const { clock } = await openedPanel($, on)
  await $.command.run({ ...RUN, args: 'schlaf' })
  await clock.settle()
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'ansicht' })
  const whole = (await ui.find({ type: 'Box' }))?.text ?? ''
  await ui.unmount()
  expect(whole).toMatch(/\SAlpha/u)
  expect(whole).not.toMatch(/(\S)\s?\1\s?Alpha/u)
})

test('where no surface places the panel, /projektfarbe übersicht prints the status text', async ($, on) => {
  const clock = mock.clock(on)
  await clock.set(NOW)
  const desktop = panelDesktop()
  mock.store(on, { farben: { alpha: '🟦', beta: '🟩' } })
  on('mcp.call', desktop.hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: desktop.cwd }))
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'no surface' } }))
  on('process.run', () => ghList([]))

  await $.session.start({ cwd: desktop.cwd, surface: 'terminal', isInteractive: true })
  await clock.settle()
  const viaPanel = (await $.command.run({ ...RUN, args: 'uebersicht' })).text
  const viaStatus = (await $.command.run({ ...RUN, args: 'status' })).text
  expect(viaPanel).toBe(viaStatus)
  expect(viaPanel).toContain('5 offene Session(s)')
})

test('the sections put what needs the person first and what can be archived last', async () => {
  const sessions = [
    session({ sessionId: 'a', branch: 'a', lastActivityAt: new Date(NOW - 5 * DAY).toISOString() }),
    session({ sessionId: 'b', branch: 'b', prNumber: 4, prState: 'MERGED' }),
    session({ sessionId: 'c', branch: 'c', prNumber: 6, prState: 'OPEN' }),
    session({ sessionId: 'd', branch: 'd', isRunning: true }),
    session({ sessionId: 'e', branch: 'e' }),
    session({ sessionId: 'f', branch: 'f', cwd: BETA }),
  ]
  const overview = buildUebersicht({
    sessions,
    selfId: 'd',
    stand: { e: { grund: 'aborted', um: NOW } },
    // A red CI on the pull request of c makes it urgent, so it moves up with the aborted one.
    prs: new Map([['c:/users/me/repos/alpha', [pr({ number: 6, headRefName: 'c', isCiRed: true })]]]),
    markOf: () => '🟦',
    now: NOW,
  })
  const bereiche = buildBereiche(overview)
  expect(bereiche.map(b => [b.id, b.zeilen.map(z => z.sessionId)])).toEqual([
    ['dringend', ['e', 'c']],
    // A stopped session in work has finished its turn: the next move is the person's.
    ['dudran', ['f']],
    // This very session counts as running, whichever way its row says.
    ['laeuft', ['d']],
    ['aufraeumen', ['b', 'a']],
  ])
  expect(bereiche[0]!.zeilen[0]!.project).toBe('Alpha')
  expect(buildBereiche({ gruppen: [], hinweise: [] })).toEqual([])
})

test('the panel shows sections by status by default and groups by project on request', async ($, on) => {
  await openedPanel($, on)
  const byStatus = await panelText($)
  const at = (part: string) => byStatus.whole.indexOf(part)
  expect(at('Braucht dich')).toBeGreaterThan(-1)
  expect(at('Braucht dich')).toBeLessThan(at('Du bist dran'))
  expect(at('Du bist dran')).toBeLessThan(at('PR wartet'))
  expect(at('PR wartet')).toBeLessThan(at('Läuft, nichts zu tun'))
  expect(at('Läuft, nichts zu tun')).toBeLessThan(at('Aufräumen'))
  expect(byStatus.keys).toContain('ansicht')

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'ansicht' })
  await ui.unmount()
  const byProject = await panelText($)
  expect(byProject.whole).not.toContain('Braucht dich')
  expect(byProject.whole.indexOf('Beta')).toBeLessThan(byProject.whole.indexOf('Alpha'))
  expect(byProject.keys).toContain('archivieren-local_alt')
})

test('öffnen hands the session\'s claude:// address to the system, and says so when nothing opens it', async ($, on) => {
  const { toasts, opened, works } = await openedPanel($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await ui.press({ key: 'oeffnen-local_wartet' })
  expect(opened).toEqual([['rundll32', 'url.dll,FileProtocolHandler', 'claude://claude.ai/epitaxy/local_wartet']])
  expect(toasts).toEqual([])

  works.on = false
  opened.length = 0
  await ui.press({ key: 'oeffnen-local_wartet' })
  await ui.unmount()
  expect(opened.map(argv => argv[0])).toEqual(['rundll32', 'open', 'xdg-open'])
  expect(toasts).toEqual(['„Frage offen“ lässt sich von hier nicht öffnen: bitte in der Seitenleiste wählen.'])
})

test('only plain claude:// addresses count as a link to open', async () => {
  expect(session({ link: 'claude://claude.ai/epitaxy/local_a-1' }).link).toBe('claude://claude.ai/epitaxy/local_a-1')
  expect(session({ link: 'claude://x/y & calc' }).link).toBe(null)
  expect(session({ link: 'https://example.com' }).link).toBe(null)
  expect(session().link).toBe(null)
})

test('a heading folds its section, and the running ones are folded at first', async ($, on) => {
  await openedPanel($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'falten-laeuft' })
  await ui.press({ key: 'falten-aufraeumen' })
  const whole = (await ui.find({ type: 'Box' }))?.text ?? ''
  await ui.unmount()
  expect(whole).toContain('Panel bauen')
  expect(whole).toContain('diese Session')
  expect(whole).not.toContain('Alte Idee')
})
