import { expect, mock, test } from 'claude-code/testing'

import {
  alterText,
  archiveReason,
  assignFarben,
  bandBreite,
  bandStufe,
  brambleKandidaten,
  brambleRoot,
  brambleStart,
  buildBereiche,
  buildUebersicht,
  BUNT,
  ciAnzeige,
  ciArt,
  ciCommitOf,
  ciForm,
  ciKurve,
  ciTeile,
  ciText,
  ciTon,
  jobFortschritt,
  kurveBei,
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
  neuesterBuild,
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
  DOCKER_BLUE,
  fablePrompt,
  GOLD,
  erkenneDienste,
  CELL_PX,
  ICON_SVG,
  ICON_SVG_COLOR,
  ICON_BOX,
  ICON_SVG_OK,
  ICON_SVG_SIZE,
  handoffPrompt,
  meinungPrompt,
  mergePrompt,
  PROMPT_INFO,
  promptsMarkdown,
  pruefenPrompt,
  raised,
  reviewPrompt,
  stackPrompt,
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
    bodyColumns: 100,
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
// The Button of blanks over an icon drawn as Svg: one `ICON_BOX` of cells.
const BLANK = NBSP.repeat(3)
// The merge field is a cell wider: its icon carries the number of open pull requests.
const BLANK_MERGE = NBSP.repeat(4)
// The keys of the band's actions, in the order the band draws them (the stack only beside a compose file).
const ACTION_KEYS = ['meinung', 'fable', 'review', 'handoff', 'stack', 'pruefen', 'merge', 'uebersicht', 'einstellungen']
// The seven fields drawBand reads, in its own order: overview, settings, opinion, review, handoff, check, merge.
const ICON_FIELDS = [BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK, BLANK_MERGE]

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
  expect(bandStufe(140, ZIEL)).toBe('icons')
  expect(bandStufe(100, ZIEL)).toBe('icons')
  expect(bandStufe(99, ZIEL)).toBe('kompakt')
  expect(bandStufe(90, ZIEL)).toBe('kompakt')
  expect(bandStufe(89, ZIEL)).toBe('dicht')
  expect(bandStufe(82, ZIEL)).toBe('dicht')
  expect(bandStufe(81, ZIEL)).toBe('minimal')
  expect(bandStufe(77, ZIEL)).toBe('minimal')
  expect(bandStufe(76, ZIEL)).toBe('zwei')
  expect(bandStufe(50, ZIEL)).toBe('zwei')

  const order = ['zwei', 'minimal', 'dicht', 'kompakt', 'icons']
  const steps = Array.from({ length: 160 }, (_, i) => order.indexOf(bandStufe(i + 1, ZIEL)))
  expect(steps).toEqual([...steps].sort((a, b) => a - b))

  // A longer name or more digits need more room; a missing gauge needs less.
  expect(bandStufe(100, ZIEL)).toBe('icons')
  expect(bandStufe(100, { ...ZIEL, name: 28 })).not.toBe('icons')
  expect(bandStufe(100, { ...ZIEL, prs: 6, issues: 6 })).not.toBe('icons')
  expect(bandBreite('icons', { ...ZIEL, percent: null })).toBeLessThan(bandBreite('icons', ZIEL))
  expect(bandBreite('zwei', ZIEL)).toBe(Number.POSITIVE_INFINITY)
  // Each layout takes less room than the one before it.
  const widths = (['icons', 'kompakt', 'dicht', 'minimal'] as const).map(stufe => bandBreite(stufe, ZIEL))
  expect(widths).toEqual([...widths].sort((a, b) => b - a))
})

test('the layouts switch where the metrics of the desktop screenshots put them', async () => {
  // ClaudeColours (13 characters, counts 0). The screenshots measured the metrics with three written-out
  // actions; the actions are eight icon fields now (the merge field a cell wider; one more beside a compose
  // file, see `hasStack`), so the switch points
  // are those of the same metrics, with the actions split in two groups (the session actions before the
  // counts, the overview and settings beside the gauge: two more gaps): the icons with the gauge's word from
  // 96 cells, the short bar from 85, closer together from 77, only the percentage from 73. The margin stays
  // one cell: a row a little too tight broke the gauge in two.
  const claude = { name: 13, prs: 2, issues: 2, percent: 1 }
  expect([120, 100, 90, 80, 74, 60, 34].map(columns => bandStufe(columns, claude))).toEqual([
    'icons',
    'icons',
    'kompakt',
    'dicht',
    'minimal',
    'zwei',
    'zwei',
  ])
  // The edges: one cell less and the roomier layout does not fit.
  expect([96, 95, 85, 84, 77, 76, 73, 72].map(columns => bandStufe(columns, claude))).toEqual([
    'icons',
    'kompakt',
    'kompakt',
    'dicht',
    'dicht',
    'minimal',
    'minimal',
    'zwei',
  ])
})

test('the band stays in its layout until the room for a roomier one is clear', async () => {
  const claude = { name: 13, prs: 2, issues: 2, percent: 1 }
  // At 85 cells the compact row fits ...
  expect(bandStufe(85, claude)).toBe('kompakt')
  // ... but a band that was in a tighter layout stays there until it has a cell to spare, and so on up.
  expect(bandStufe(85, claude, 'dicht')).toBe('dicht')
  expect(bandStufe(86, claude, 'dicht')).toBe('kompakt')
  expect(bandStufe(73, claude)).toBe('minimal')
  expect(bandStufe(73, claude, 'zwei')).toBe('zwei')
  expect(bandStufe(74, claude, 'zwei')).toBe('minimal')
  expect(bandStufe(96, claude)).toBe('icons')
  expect(bandStufe(96, claude, 'kompakt')).toBe('kompakt')
  expect(bandStufe(97, claude, 'kompakt')).toBe('icons')
  // Getting less room is never held back: the old layout would not fit.
  expect(bandStufe(74, claude, 'icons')).toBe('minimal')
  expect(bandStufe(30, claude, 'icons')).toBe('zwei')
})

test('a name too long for the first row of the two-row band is cut with an ellipsis', async () => {
  expect(shortName('LightWeightBrowser', 18)).toBe('LightWeightBrowser')
  expect(shortName('LightWeightBrowser', 10)).toBe('LightWeig…')
  expect(shortName('Beta', 4)).toBe('Beta')
  expect(shortName('Beta', 1)).toBe('B…')
  // The first row holds the block, the name, the counts and the short gauge: at 60 cells the whole name
  // still fits; at 24 it has to give way, but never below eight characters.
  expect(nameBudget(60, ZIEL)).toBeGreaterThanOrEqual(18)
  expect(nameBudget(24, ZIEL)).toBeLessThan(18)
  expect(nameBudget(10, ZIEL)).toBe(8)
  // Without a gauge the name has the whole row.
  expect(nameBudget(50, { ...ZIEL, percent: null })).toBeGreaterThan(nameBudget(50, ZIEL))
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
    await ui.press({ key: 'einstellungen' })
    expect(await ui.find({ key: 'farbe-lila' })).toBeDefined()
    await ui.press({ key: 'abbrechen' })
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'einstellungen' })
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
      percent: texts.find(text => /\d+\s%$/.test(text.text) && Object.keys(text.props).length > 0),
    }
  }

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const calm = await gauge()
  expect(calm.fill?.props).toMatchObject({ backgroundColor: 'inactive' })
  expect(calm.fill?.children).toEqual([NBSP.repeat(3)])
  expect(calm.track?.children).toEqual([NBSP.repeat(5)])
  expect(calm.percent?.text.trim().replace(NBSP, ' ')).toBe('41 %')
  expect(calm.percent?.props).toMatchObject({ dimColor: true })

  percent = 72
  await $.turn.complete(TURN)
  await clock.settle()
  const warn = await gauge()
  expect(warn.fill?.props).toMatchObject({ backgroundColor: 'warning' })
  expect(warn.fill?.children).toEqual([NBSP.repeat(6)])
  expect(warn.percent?.text.trim().replace(NBSP, ' ')).toBe('72 %')
  expect(warn.percent?.props).toMatchObject({ color: 'warning' })

  percent = 90
  await $.turn.complete(TURN)
  await clock.settle()
  const full = await gauge()
  expect(full.fill?.props).toMatchObject({ backgroundColor: 'error' })
  expect(full.fill?.children).toEqual([NBSP.repeat(7)])
  expect(full.percent?.text.trim().replace(NBSP, ' ')).toBe('90 %')
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

/** The CI row's own calls: the pushed head (`git rev-parse @{u}`) and `gh api`. Tests of other gh calls leave them out. */
const isCiCall = (argv: readonly string[]): boolean => argv[0] === 'git' || (argv[0] === 'gh' && argv[1] === 'api')

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
    if (e.argv[1] !== 'repo' && !isCiCall(e.argv)) {
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
    if (!isCiCall(e.argv)) {
      asked.push([...e.argv])
    }

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
  await ui.press({ key: 'einstellungen' })
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
  await ui.press({ key: 'einstellungen' })
  expect(await modes()).toEqual(['an: 🎨 Bunt', 'aus: 🌙 Dämmerung'])

  await ui.press({ key: 'modus-daemmerung' })
  expect(desk.all.map(row => row.title)).toEqual(['⬤ Fix the login bug', '⬤ Write the docs'])
  // The switch closed the picker; opened again it shows the new mode, and its colors.
  await ui.press({ key: 'einstellungen' })
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
  await ui.press({ key: 'einstellungen' })
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
      if (!isCiCall(e.argv)) {
        asked.push([...e.argv])
      }
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
async function drawBand($: Tested, bodyColumns: number, surface: 'desktop' | 'terminal' = 'desktop') {
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface })
  const texts = await ui.findAll({ type: 'Text' })
  const shown = {
    isStacked: (await ui.find({ type: 'Box' }))?.props.flexDirection === 'column',
    actions: [
      (await ui.find({ key: 'uebersicht' }))?.text,
      (await ui.find({ key: 'einstellungen' }))?.text,
      (await ui.find({ key: 'meinung' }))?.text,
      (await ui.find({ key: 'fable' }))?.text,
      (await ui.find({ key: 'review' }))?.text,
      (await ui.find({ key: 'handoff' }))?.text,
      (await ui.find({ key: 'pruefen' }))?.text,
      (await ui.find({ key: 'merge' }))?.text,
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

test('the band lays itself out by its cells: icons, a short bar, closer together, then two rows', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  // The gauge with its word and the full bar; the actions are icon fields, in every layout.
  const wide = await drawBand($, 100)
  expect(wide).toMatchObject({ isStacked: false, actions: ICON_FIELDS, hasWord: true, barCells: 8 })

  // No word and a bar of four cells; still one row.
  const compact = await drawBand($, 80)
  expect(compact).toMatchObject({ isStacked: false, actions: ICON_FIELDS, hasWord: false, barCells: 4 })

  // The items closer together, the same bar.
  const dense = await drawBand($, 72)
  expect(dense).toMatchObject({ isStacked: false, actions: ICON_FIELDS, hasWord: false, barCells: 4 })

  // Only the percentage of the gauge is left, in the same row.
  const minimal = await drawBand($, 66)
  expect(minimal).toMatchObject({ isStacked: false, actions: ICON_FIELDS, hasWord: false, barCells: 0 })

  // Two rows: the gauge stays above, with the name.
  const narrow = await drawBand($, 30)
  expect(narrow).toMatchObject({ isStacked: true, actions: ICON_FIELDS, hasWord: false, barCells: 4, name: ' Beta' })

  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toBe(
    'Das Band hat 30 Zellen und ist im Layout „zwei“ gezeichnet (Name: 4 Zeichen). In einer Zeile braucht es: icons 88, kompakt 77, dicht 69, minimal 65 Zellen. Keine CI-Zeile.',
  )
})

test('the one-row layouts never wrap, so a stale tree in a narrower window does not jump to two rows', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  for (const bodyColumns of [100, 80, 66]) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
    const root = await ui.find({ type: 'Box' })
    await ui.unmount()
    expect(root?.props).toMatchObject({ flexWrap: 'nowrap', overflow: 'hidden' })
  }
})

test('the one-row band spreads to its ends: the actions flush right, and the percent sign never breaks away', async ($, on) => {
  await startBand($, on, `${BETA}${String.fromCharCode(92).repeat(2)}.claude${String.fromCharCode(92).repeat(2)}worktrees${String.fromCharCode(92).repeat(2)}a`)

  for (const bodyColumns of [100, 80, 70]) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
    const root = await ui.find({ type: 'Box' })
    const texts = await ui.findAll({ type: 'Text' })
    await ui.unmount()
    // Two parts at the ends of the row: project, counts and gauge, then the three actions.
    expect(root?.props.justifyContent).toBe('space-between')
    expect(root?.children).toHaveLength(2)
    // A gauge's percentage keeps its sign: a no-break blank, so the row cannot split "8" and "%".
    expect(texts.some(text => text.text === ` 8${NBSP}%`)).toBe(true)
  }
})

test('the band keeps its layout over a narrow stretch while the window is dragged wider', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  // Beta's smallest one-row layout needs about 65 cells: it fits at 65, but the band came from two rows.
  expect((await drawBand($, 30)).isStacked).toBe(true)
  expect((await drawBand($, 65)).isStacked).toBe(true)
  expect((await drawBand($, 66)).isStacked).toBe(false)
  // Narrowing again is not held back.
  expect((await drawBand($, 30)).isStacked).toBe(true)
})

test('/projektfarbe breite says so when the band is hidden, and when it was not drawn yet', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toBe('Das Band wurde in dieser Session noch nicht gezeichnet.')

  await $.command.run({ ...RUN, args: 'band' })
  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toBe(
    'Das Band ist ausgeblendet; /projektfarbe band blendet es wieder ein.',
  )

  await $.command.run({ ...RUN, args: 'band' })
  await drawBand($, 100)
  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toMatch(/^Das Band hat 100 Zellen und ist im Layout „icons“/)
})

test('the two-row band keeps name, counts and gauge in its first row, and the icons in the second', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  const rowsOf = async (view: { agentId?: string }) => {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 30, view }, surface: 'desktop' })
    const boxes = await ui.findAll({ type: 'Box' })
    await ui.unmount()

    return boxes.filter(box => box.props.justifyContent === 'space-between').map(box => box.text)
  }

  const [first, second] = await rowsOf({})
  expect(first).toContain('Beta')
  expect(first).toMatch(/8\s%/)
  expect(first).toContain('PRs:')
  expect(first).toContain('Issues:')
  // The second row holds only the icons (here their hover cards): no counts, no gauge.
  expect(second).toContain('Übersicht')
  expect(second).not.toMatch(/PRs:|%/)

  // A subagent's view has no gauge: the number is the main session's.
  const [alone] = await rowsOf({ agentId: 'a1' })
  expect(alone).toContain('Beta')
  expect(alone).not.toMatch(/%/)
})

test('the icons press what they say, in every layout', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  for (const bodyColumns of [100, 70, 56, 30]) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
    await ui.press({ key: 'einstellungen' })
    expect(await ui.find({ key: 'farbe-lila' })).toBeDefined()
    await ui.press({ key: 'abbrechen' })
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 30 }, surface: 'desktop' })
  await ui.press({ key: 'einstellungen' })
  await ui.press({ key: 'ausblenden' })
  expect(await ui.find({ type: 'Text', text: /Beta/ })).toBe(undefined)
  await ui.unmount()
})

test('the actions stand in this order: the session actions with merge last of them, the overview and settings at the right edge', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  for (const bodyColumns of [100, 70]) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
    const keys = (await ui.findAll({ type: 'Button' })).map(button => String(button.key))
    await ui.unmount()
    expect(keys.filter(key => ACTION_KEYS.includes(key))).toEqual(['fable', 'meinung', 'review', 'handoff', 'pruefen', 'merge', 'uebersicht', 'einstellungen'])
  }
})

test('the session actions stand before the counts, the overview and settings after them, beside the gauge', async ($, on) => {
  await startBand($, on, `${BETA}\.claude\worktrees\a`)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 100 }, surface: 'desktop' })
  const keys = (await ui.findAll({ type: 'Button' })).map(button => String(button.key))
  await ui.unmount()
  expect(keys).toEqual(['fable', 'meinung', 'review', 'handoff', 'pruefen', 'merge', 'prs', 'issues', 'uebersicht', 'einstellungen'])
})

test('each icon has a hover card saying what it does', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  const cardsAt = async (bodyColumns: number) => {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
    const boxes = await ui.findAll({ type: 'Box' })
    await ui.unmount()

    return boxes.filter(box => box.props.position === 'absolute' && box.props.display === 'none')
  }

  for (const bodyColumns of [100, 70, 56, 48, 42, 30]) {
    const cards = await cardsAt(bodyColumns)
    expect(cards.map(card => card.text)).toEqual([
      'Fable fragen, wenn es wichtig ist',
      'Opus-Meinung im Chat anfordern',
      'Review, Commit und Pull Request anfordern',
      'Übergabe für eine frische Session schreiben lassen',
      'Prüfen: Qualität, Tests und e2e mit Playwright',
      'Offene PRs mergen und passende Issues lösen',
      'Übersicht',
      'Einstellungen: Farbe, Modus, Band ausblenden',
    ])
    // Hidden until the pointer is on the icon's field (its `hover` reveals it), and out of the flow, so
    // showing it moves nothing. The session actions open it to the right of the icon's field, the overview
    // and the settings to the left, so none reaches past the band's edge; the merge field is a cell wider.
    for (const card of cards) {
      const width = card.text.includes('mergen') ? 4 : 3
      const isRight = card.text === 'Übersicht' || card.text.startsWith('Einstellungen')
      expect(card.props).toMatchObject({ display: 'none', position: 'absolute', top: 0, ...(isRight ? { right: width } : { left: width }) })
    }
  }
})

test('on the terminal a character is a whole cell: the roomy layouts need more columns than on the desktop', async () => {
  const claude = { name: 13, prs: 2, issues: 2, percent: 1 }
  expect(bandBreite('icons', claude, true)).toBeGreaterThan(bandBreite('icons', claude))
  expect([98, 97, 86, 85, 75, 74, 70, 69].map(columns => bandStufe(columns, claude, null, true))).toEqual([
    'icons',
    'kompakt',
    'kompakt',
    'dicht',
    'dicht',
    'minimal',
    'minimal',
    'zwei',
  ])
  // The same 96 columns fit the full gauge on the desktop but not on the terminal.
  expect(bandStufe(96, claude)).toBe('icons')
  expect(bandStufe(96, claude, null, true)).toBe('kompakt')
  expect(nameBudget(40, claude, true)).toBeGreaterThan(0)
})

test('the band on the terminal switches layouts by whole cells, and keeps its text glyphs', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  // Beta needs 89 columns for the gauge's word on the terminal; at 88 the word is gone.
  // The terminal has no Svg: its icons stay text glyphs.
  const roomy = await drawBand($, 89, 'terminal')
  expect(roomy.hasWord).toBe(true)
  expect(roomy.actions).toEqual(['☰', '⚙', '✦', '✧', '↑', '✉', '✓', '⇉'])
  expect((await drawBand($, 88, 'terminal')).hasWord).toBe(false)
})

test('a project name with blanks never breaks inside the band', async ($, on) => {
  await startBand($, on, 'C:\\Users\\me\\Repos\\My Project')

  expect((await drawBand($, 200)).name).toBe(` My${NBSP}Project`)
})

test('a surface that does not say how wide the band is gets the roomy one-row band', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  const ui = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, bodyColumns: undefined as unknown as number },
    surface: 'desktop',
  })
  const root = await ui.find({ type: 'Box' })
  await ui.unmount()
  expect(root?.props.flexDirection).toBeUndefined()
})

test('a subagent view neither sets nor reads the layout the band was drawn in last', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  const ui = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, bodyColumns: 140, view: { agentId: 'a1' } },
    surface: 'desktop',
  })
  await ui.unmount()
  expect((await $.command.run({ ...RUN, args: 'breite' })).text).toBe('Das Band wurde in dieser Session noch nicht gezeichnet.')
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
    if (e.argv[0] === 'gh' || isCiCall(e.argv)) {
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

test('Bramble is looked for in its repository and every worktree; the newest build wins', () => {
  expect(brambleRoot(undefined, 'C:\\Users\\me')).toBe('C:\\Users\\me\\Documents\\Repositories\\LightWeightBrowser')
  expect(brambleRoot(' D:/src/Bramble/ ', 'C:\\Users\\me')).toBe('D:\\src\\Bramble')
  expect(brambleRoot(undefined, undefined)).toBe(null)
  expect(brambleKandidaten('D:\\Bramble', ['a'])).toEqual([
    'D:\\Bramble\\target\\release\\bramble.exe',
    'D:\\Bramble\\.claude\\worktrees\\a\\target\\release\\bramble.exe',
  ])
  expect(neuesterBuild([])).toBe(null)
  expect(neuesterBuild([{ path: 'alt', mtimeMs: 1 }, { path: 'neu', mtimeMs: 3 }, { path: 'mitte', mtimeMs: 2 }])).toBe('neu')
  // Its own profile, so a link never overwrites the tabs the person saved in Bramble; no ad blocker, so it stays lean.
  expect(brambleStart('D:\\b.exe', 'https://github.com/me/beta').env).toEqual({
    BRAMBLE_EXE: 'D:\\b.exe',
    LWB_URL: 'https://github.com/me/beta',
    LWB_PROFILE: 'projektfarben',
    LWB_NO_PINS: '1',
    LWB_ADBLOCK: 'off',
  })
})

test('with a Bramble build the name, PRs and Issues open their pages in the newest one', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const root = 'C:\\Users\\me\\Documents\\Repositories\\LightWeightBrowser'
  const builds: Record<string, number> = {
    [`${root}\\target\\release\\bramble.exe`]: 100,
    [`${root}\\.claude\\worktrees\\neu\\target\\release\\bramble.exe`]: 200,
  }
  const started: { url: string | undefined; exe: string | undefined }[] = []
  const gh = fakeGh({ pr: [1], issue: [2] })
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'C:\\Users\\me' : undefined }))
  on('fs.list', () => ({
    value: ['neu', 'ohne-build'].map(name => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })),
  }))
  on('fs.stat', (_, e) => {
    const mtimeMs = builds[e.path]
    if (mtimeMs === undefined) {
      throw new Error('ENOENT')
    }

    return { value: { kind: 'file', size: 1, mtimeMs, isLink: false } }
  })
  on('process.run', (_, e) => {
    if (e.argv[0] === 'powershell') {
      started.push({ url: e.init?.env?.LWB_URL, exe: e.init?.env?.BRAMBLE_EXE })

      return ghList([])
    }

    return e.argv[1] === 'repo' ? ghUrl('https://github.com/me/beta') : gh.hook(undefined, e)
  })

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  // No Link: the surface would open that in the system's browser.
  expect(await ui.findAll({ type: 'Link' })).toEqual([])
  // The color block stays beside the name.
  expect((await ui.findAll({ type: 'Text' })).some(text => text.props.backgroundColor === '#3b82f6')).toBe(true)
  await ui.press({ key: 'repo' })
  await ui.press({ key: 'prs' })
  await ui.press({ key: 'issues' })
  await ui.unmount()

  const exe = `${root}\\.claude\\worktrees\\neu\\target\\release\\bramble.exe`
  expect(started).toEqual([
    { url: 'https://github.com/me/beta', exe },
    { url: 'https://github.com/me/beta/pulls', exe },
    { url: 'https://github.com/me/beta/issues', exe },
  ])
  // gh opens no browser of its own.
  expect(gh.asked.some(argv => argv.includes('--web'))).toBe(false)
})

// The independent Opus opinion: the band's button sends the session a prompt of the person's own.

/** A session in Beta whose submitted prompts are recorded and answered by `answer`; toasts are recorded too. */
let sessionClock: ReturnType<typeof mock.clock> | null = null

/** A sent action stays locked until the session's turn ends; the tests that press one repeatedly end one first. */
async function afterCooldown($: TestEngine) {
  await $.turn.complete(TURN)
  await sessionClock?.settle()
}

async function meinungSession($: TestEngine, on: TestOn, answer: (text: string) => unknown = text => ({ text })) {
  const clock = mock.clock(on)
  sessionClock = clock
  await clock.set(NOW)
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  const sent: { text: string; origin: unknown }[] = []
  const toasts: string[] = []
  const progress: string[] = []
  on('prompt.submit', (_, e) => {
    sent.push({ text: e.text, origin: e.origin })

    return answer(e.text) as never
  })
  on('ui.toast', (_, e) => {
    // The progress toasts of a press are in `progress`; `toasts` holds what went wrong.
    ;(/wird gesendet|gesendet, die|schon/.test(e.text) ? progress : toasts).push(e.text)

    return { value: undefined }
  })
  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()

  return { sent, toasts, progress }
}

async function pressMeinung($: TestEngine, bodyColumns = 120) {
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  await afterCooldown($)
  await band.press({ key: 'meinung' })
  await band.unmount()
}

test('the question has the session build the task: the matter itself, no own conclusion, no bloat', async () => {
  const prompt = meinungPrompt('Beta')
  expect(prompt).toContain('„Beta“')
  expect(prompt).toContain('subagent_type general-purpose, model opus')
  // The session decides what is meant: the last question, a plan to rework or the state of the project.
  expect(prompt).toContain('meine letzte Frage, der Plan, den wir haben, oder der Stand von „Beta“')
  expect(prompt).toContain('Wenn ich den Plan überarbeitet haben will, gehört der Plan hinein')
  expect(prompt).toContain('nicht deine eigene Schlussfolgerung')
  expect(prompt).toContain('keinen Gesprächsverlauf')
  expect(prompt).toContain('Er ändert nichts')
  expect(prompt).toContain('mit einer Stelle belegen')
  expect(prompt).toContain('unverändert wieder')
  // Goals, not a form: no length cap, no fixed headings, no ban on looking things up.
  expect(prompt).not.toMatch(/Höchstens|\d+ Zeilen|zusätzlich lesen|Nächstes ansteht/)
})

test('the opinion button submits the question as the person\'s own words, in a wide and a narrow band', async ($, on) => {
  const { sent, toasts } = await meinungSession($, on)

  await pressMeinung($, 120)
  await pressMeinung($, 70)
  expect(sent.map(prompt => prompt.text)).toEqual([meinungPrompt('Beta'), meinungPrompt('Beta')])
  expect(sent[0].origin).toMatchObject({ asUser: true })
  expect(toasts).toEqual([])
})

test('a press is answered at once, and a repeated press does not send the prompt again', async ($, on) => {
  const { sent, progress } = await meinungSession($, on)
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 120 }, surface: 'desktop' })

  await Promise.all([band.press({ key: 'meinung' }), band.press({ key: 'meinung' })])
  await band.press({ key: 'meinung' })
  expect(sent).toHaveLength(1)
  expect(progress).toContain('Opus-Meinung: wird gesendet …')
  expect(progress).toContain('Opus-Meinung: gesendet, die Antwort kommt im Chat.')
  expect(progress.filter(text => text.includes('schon'))).toHaveLength(2)

  // Once the answer's turn has ended the button works again.
  await afterCooldown($)
  await band.press({ key: 'meinung' })
  expect(sent).toHaveLength(2)
  await band.unmount()
})

test('a refused press does not lock the button: it can be tried again at once', async ($, on) => {
  let isRefused = true
  const { sent } = await meinungSession($, on, text => (isRefused ? { drop: 'Stop-Hook' } : { text }))
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 120 }, surface: 'desktop' })

  await band.press({ key: 'review' })
  isRefused = false
  await band.press({ key: 'review' })
  expect(sent).toHaveLength(2)
  await band.unmount()
})

test('a refused or failing submission says so in a toast', async ($, on) => {
  let mode: 'drop' | 'throw' = 'drop'
  const { toasts } = await meinungSession($, on, () => {
    if (mode === 'throw') {
      throw new Error('boom\nsecond line')
    }

    return { drop: 'Stop-Hook' }
  })

  await pressMeinung($)
  expect(toasts).toEqual(['Die Opus-Meinung wurde nicht angefordert: Stop-Hook'])

  mode = 'throw'
  await pressMeinung($)
  expect(toasts).toHaveLength(2)
  expect(toasts[1]).toMatch(/^Die Opus-Meinung wurde nicht angefordert: /)
  expect(toasts[1]).not.toContain('second line')
})

// Fable, for when it matters: a button of its own beside the Opus opinion, which stays as it is.

async function pressFable($: TestEngine, bodyColumns = 120) {
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  await afterCooldown($)
  await band.press({ key: 'fable' })
  await band.unmount()
}

test('the Fable prompt is for what matters: the matter and why it matters, no own conclusion, nothing changed', async () => {
  const prompt = fablePrompt('Beta')
  expect(prompt).toContain('„Beta“')
  expect(prompt).toContain('Das hier ist wichtig, hol Fable dazu')
  expect(prompt).toContain('subagent_type general-purpose, model fable')
  expect(prompt).not.toMatch(/opus/i)
  // A second opinion, a thorough review or a question the work is stuck on; the session decides which.
  expect(prompt).toContain('einer Entscheidung, die schwer rückgängig zu machen ist')
  expect(prompt).toContain('gründliches Review der Änderungen')
  expect(prompt).toContain('eine Frage, an der wir hängen')
  expect(prompt).toContain('Du entscheidest, was gemeint ist')
  expect(prompt).toContain('den Diff holt er sich selbst')
  expect(prompt).toContain('warum es wichtig ist und was davon abhängt')
  expect(prompt).toContain('nicht deine eigene Schlussfolgerung')
  expect(prompt).toContain('keinen Gesprächsverlauf')
  expect(prompt).toContain('Er ändert nichts')
  expect(prompt).toContain('der Sache auf den Grund gehen')
  expect(prompt).toContain('unverändert wieder')
  expect(prompt).not.toMatch(/Höchstens|\d+ Zeilen|zusätzlich lesen|Nächstes ansteht/)
  // The Opus opinion stays the everyday button.
  expect(meinungPrompt('Beta')).toContain('model opus')
})

test('the Fable button submits its prompt as the person\'s own words, and a refusal is a toast', async ($, on) => {
  let isRefused = false
  const { sent, toasts } = await meinungSession($, on, text => (isRefused ? { drop: 'Stop-Hook' } : { text }))

  await pressFable($, 120)
  await pressFable($, 70)
  expect(sent.map(prompt => prompt.text)).toEqual([fablePrompt('Beta'), fablePrompt('Beta')])
  expect(sent[0].origin).toMatchObject({ asUser: true })
  expect(toasts).toEqual([])

  isRefused = true
  await pressFable($)
  expect(toasts).toEqual(['Fable wurde nicht gefragt: Stop-Hook'])
})

async function pressReview($: TestEngine, bodyColumns = 120) {
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  await afterCooldown($)
  await band.press({ key: 'review' })
  await band.unmount()
}

test('the review prompt takes the work to the pull request and stops short of merging', async () => {
  const prompt = reviewPrompt('Beta')
  expect(prompt).toContain('„Beta“')
  // Review first, then commit, then the pull request.
  expect(prompt.indexOf('1. Review')).toBeLessThan(prompt.indexOf('2. Commit'))
  expect(prompt.indexOf('2. Commit')).toBeLessThan(prompt.indexOf('3. PR'))
  expect(prompt).toContain('Behebe echte Befunde')
  expect(prompt).toContain('nie mit force')
  expect(prompt).toContain('Mergen tust du nicht')
  // Where a step does not work it stops and says why, rather than working around it.
  expect(prompt).toContain('halte an und sag mir, woran es liegt')
  expect(prompt).toContain('Link zum PR')
})

test('the review button submits the prompt as the person\'s own words, in a wide and a narrow band', async ($, on) => {
  const { sent, toasts } = await meinungSession($, on)

  await pressReview($, 120)
  await pressReview($, 75)
  expect(sent.map(prompt => prompt.text)).toEqual([reviewPrompt('Beta'), reviewPrompt('Beta')])
  expect(sent[0].origin).toMatchObject({ asUser: true })
  expect(toasts).toEqual([])
})

test('a refused review request says so in a toast', async ($, on) => {
  const { toasts } = await meinungSession($, on, () => ({ drop: 'Stop-Hook' }))

  await pressReview($)
  expect(toasts).toEqual(['Review und PR wurden nicht gestartet: Stop-Hook'])
})

test('the action icons are vector line icons of one family in one gray that reads on both themes, bar the Docker logo and the golden teacher', async () => {
  for (const [key, icon] of Object.entries(ICON_SVG)) {
    expect(icon.source.startsWith('<svg ')).toBe(true)
    expect(icon.source.endsWith('</svg>')).toBe(true)
    expect(icon.source).not.toMatch(/<script|on\w+=|currentColor/)
    expect(icon.source.length).toBeLessThan(131072)
    expect(icon.alt).not.toBe('')
    // The logo and the written-out e2e have a size of their own; the line icons stand on the 24 grid.
    if (key !== 'stack' && key !== 'pruefen') {
      expect(icon.source).toContain('viewBox="0 0 24 24"')
    }
    if (key !== 'stack' && key !== 'fable') {
      expect(icon.source).toContain(`stroke="${ICON_SVG_COLOR}"`)
    }
  }
  // An image takes no theme color: the one gray has to be mid-tone, neither near white nor near black.
  const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(ICON_SVG_COLOR.slice(i, i + 2), 16))
  expect(Math.min(r, g, b)).toBeGreaterThan(90)
  expect(Math.max(r, g, b)).toBeLessThan(190)
})

test('the Fable button is the golden teacher: the opinion icon drawn the same, in a gold that reads on both themes', async () => {
  const { fable, meinung } = ICON_SVG
  expect(fable.alt).toBe('Fable fragen')
  expect(fable.source).toBe(meinung.source.replace(`stroke="${ICON_SVG_COLOR}"`, `stroke="${GOLD}"`))
  expect(fable.source).not.toContain(ICON_SVG_COLOR)
  // Gold, not gray: red above green above blue, neither near white nor near black, since an image takes
  // no theme color.
  const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(GOLD.slice(i, i + 2), 16))
  expect(r).toBeGreaterThan(g)
  expect(g).toBeGreaterThan(b + 40)
  expect(Math.max(r, g, b)).toBeLessThan(240)
  expect(Math.min(r, g, b)).toBeLessThan(90)
})

test('the Docker logo is the original in its blue with a green rebuild arrow, drawn in its own proportions', async () => {
  const { stack } = ICON_SVG
  expect(stack.source).toContain('viewBox="0 0 1350 780"')
  // Nine containers and the whale in Docker's blue, the arrow in the family's green.
  expect(stack.source.match(new RegExp(`<rect [^>]*fill="${DOCKER_BLUE}"`, 'g'))).toHaveLength(9)
  expect(stack.source).toContain(`<path fill="${DOCKER_BLUE}"`)
  expect(stack.source).toContain(`stroke="${ICON_SVG_OK}"`)
  // The logo's proportions, at the height of the line icons' drawing.
  expect(Math.abs(stack.width / stack.height - 1350 / 780)).toBeLessThan(0.02)
  expect(stack.height).toBeLessThan(ICON_SVG_SIZE)
})

test('the e2e icon is wider than the square but fits its field, in its own proportions', async () => {
  const { pruefen } = ICON_SVG
  expect(pruefen.source).toContain('viewBox="0 0 37.9 24"')
  expect(Math.abs(pruefen.width / pruefen.height - 37.9 / 24)).toBeLessThan(0.02)
  // A field is `ICON_BOX` cells of about 7.75 px on the desktop; the icon stays inside it.
  expect(pruefen.width).toBeLessThanOrEqual(ICON_BOX * 7.75)
  expect(pruefen.height).toBeLessThanOrEqual(ICON_SVG_SIZE)
})

test('every icon, present and future, fits its field: a viewBox, and a drawing no wider than the field', async () => {
  // The band draws each icon as wide as its field and as tall as its `height` (or `ICON_SVG_SIZE`), so the
  // viewBox centers the glyph under the Button's hover patch. A new icon only has to satisfy this.
  for (const [key, icon] of Object.entries(ICON_SVG) as [string, { source: string; height?: number }][]) {
    const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(icon.source)
    expect(box, key).not.toBeNull()
    const height = icon.height ?? ICON_SVG_SIZE
    const drawnWidth = (height * Number(box?.[1])) / Number(box?.[2])
    expect(drawnWidth, key).toBeLessThanOrEqual(ICON_BOX * CELL_PX)
    expect(height, key).toBeLessThanOrEqual(ICON_SVG_SIZE)
  }
})

test('a compose file in the folder is a Docker stack, in its usual names', async () => {
  for (const name of ['docker-compose.yml', 'docker-compose.override.yml', 'compose.yaml', 'compose.dev.yml', 'Docker-Compose.YML']) {
    expect(erkenneDienste([name]).hasCompose).toBe(true)
  }
  for (const name of ['Dockerfile', 'compose.md', 'docker-compose.ts', 'my-compose.yml', 'docker-compose']) {
    expect(erkenneDienste([name]).hasCompose).toBe(false)
  }
  expect(erkenneDienste([]).hasCompose).toBe(false)
})

test('on the desktop every action is drawn as Svg, centered in the row, with a Button over each; on the terminal there is none', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  const svgsAt = async (bodyColumns: number, surface: 'desktop' | 'terminal') => {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface })
    const svgs = await ui.findAll({ type: 'Svg' })
    const keys = (await ui.findAll({ type: 'Button' })).map(button => String(button.key))
    const fields = (await ui.findAll({ type: 'Box' })).filter(box => String(box.key).endsWith('-feld'))
    await ui.unmount()

    return { svgs, keys, fields }
  }

  // No compose file here, so no stack: the other eight, in the band's order.
  const icons = Object.entries(ICON_SVG).filter(([key]) => key !== 'stack')
  for (const bodyColumns of [100, 75, 64, 30]) {
    const { svgs, keys, fields } = await svgsAt(bodyColumns, 'desktop')
    expect(svgs.map(svg => svg.props.alt)).toEqual(icons.map(([, icon]) => icon.alt))
    // Every image is as wide as its field and as tall as its drawing, so the viewBox centers the glyph in
    // the field the Button's hover patch covers.
    expect(svgs.map(svg => [svg.props.width, svg.props.height])).toEqual(
      icons.map(([, icon]) => [ICON_BOX * CELL_PX, 'height' in icon ? icon.height : ICON_SVG_SIZE]),
    )
    // The Buttons that take the press are still there, in the order of the icons.
    expect(keys.filter(key => ACTION_KEYS.includes(key))).toEqual(['fable', 'meinung', 'review', 'handoff', 'pruefen', 'merge', 'uebersicht', 'einstellungen'])
    // Each field centers its icon in the row, so all stand on one line.
    expect(fields).toHaveLength(8)
    expect(fields.every(box => box.props.alignItems === 'center')).toBe(true)
  }
  expect((await svgsAt(75, 'terminal')).svgs).toEqual([])
})

test('beside a compose file the band offers the stack rebuild, before the check, in the logo\'s own size', async ($, on) => {
  const cwd = `${BETA}\\.claude\\worktrees\\a`
  on('fs.list', () => ({
    value: ['docker-compose.yml', 'README.md'].map(name => ({ name, kind: 'file', size: 0, mtimeMs: 0, isLink: false })),
  }))
  await startBand($, on, cwd)

  for (const bodyColumns of [100, 70, 30]) {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
    const keys = (await ui.findAll({ type: 'Button' })).map(button => String(button.key))
    const svgs = await ui.findAll({ type: 'Svg' })
    await ui.unmount()
    expect(keys.filter(key => ACTION_KEYS.includes(key))).toEqual(['fable', 'meinung', 'review', 'handoff', 'stack', 'pruefen', 'merge', 'uebersicht', 'einstellungen'])
    expect(svgs.map(svg => svg.props.alt)).toEqual(Object.values(ICON_SVG).map(icon => icon.alt))
    const logo = svgs.find(svg => svg.props.alt === ICON_SVG.stack.alt)
    expect(logo?.props).toMatchObject({ width: ICON_BOX * CELL_PX, height: ICON_SVG.stack.height })
  }
  // One more action takes more room than the eight.
  expect(bandBreite('icons', { ...ZIEL, hasStack: true })).toBeGreaterThan(bandBreite('icons', ZIEL))
})

async function pressHandoff($: TestEngine, bodyColumns = 100) {
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  await afterCooldown($)
  await band.press({ key: 'handoff' })
  await band.unmount()
}

test('the handoff prompt asks for a message a fresh session can start from, and changes and starts nothing', async () => {
  const prompt = handoffPrompt('Beta')
  expect(prompt).toContain('„Beta“')
  // What the repository cannot tell goes in; what the new session reads there itself stays out.
  expect(prompt).toContain('was schon erledigt und entschieden ist (mit dem Grund)')
  expect(prompt).toContain('was offen ist und womit es weitergeht')
  expect(prompt).toContain('lass weg und nenne nur, wo sie nachsehen soll')
  expect(prompt).toContain('Keine Gesprächsgeschichte')
  // Ready to paste as the first message; nothing is started or changed.
  expect(prompt).toContain('unverändert als erste Nachricht')
  expect(prompt).toContain('Ändere nichts und starte nichts')
  // Goals, not a form: no length cap and no fixed headings.
  expect(prompt).not.toMatch(/Höchstens|\d+ Zeilen|Überschrift/)
})

test('the handoff button submits the prompt as the person\'s own words, in a wide and a narrow band, and a refusal is a toast', async ($, on) => {
  let isRefused = false
  const { sent, toasts } = await meinungSession($, on, text => (isRefused ? { drop: 'Stop-Hook' } : { text }))

  await pressHandoff($, 100)
  await pressHandoff($, 70)
  expect(sent.map(prompt => prompt.text)).toEqual([handoffPrompt('Beta'), handoffPrompt('Beta')])
  expect(sent[0].origin).toMatchObject({ asUser: true })
  expect(toasts).toEqual([])

  isRefused = true
  await pressHandoff($)
  expect(toasts).toEqual(['Die Übergabe wurde nicht angefordert: Stop-Hook'])
})

async function pressMerge($: TestEngine, bodyColumns = 100) {
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  await afterCooldown($)
  await band.press({ key: 'merge' })
  await band.unmount()
}

test('the merge prompt merges the open pull requests in order, solves and merges the fitting issues, and keeps its limits', async () => {
  const prompt = mergePrompt('Beta')
  expect(prompt).toContain('„Beta“')
  expect(prompt.indexOf('1. PRs')).toBeLessThan(prompt.indexOf('2. Issues'))
  // A sensible order, merged only on green checks.
  expect(prompt).toContain('erst die unabhängigen, dann die, die darauf aufbauen')
  expect(prompt).toContain('dessen Checks grün sind')
  // The issues are solved in their own pull requests and merged too, again on green checks.
  expect(prompt).toContain('eigenen Branch mit eigenem PR („Closes #n“)')
  expect(prompt).toContain('merge ihn, wenn die Checks grün sind')
  // The limits that keep one click safe, and what stays open is named.
  expect(prompt).toContain('kein Force-Push')
  expect(prompt).toContain('keine Entwürfe mergen')
  expect(prompt).toContain('lässt du liegen und nennst es mir mit dem Grund')
})

test('the merge button submits the prompt as the person\'s own words, in a wide and a narrow band, and a refusal is a toast', async ($, on) => {
  let isRefused = false
  const { sent, toasts } = await meinungSession($, on, text => (isRefused ? { drop: 'Stop-Hook' } : { text }))

  await pressMerge($, 100)
  await pressMerge($, 70)
  expect(sent.map(prompt => prompt.text)).toEqual([mergePrompt('Beta'), mergePrompt('Beta')])
  expect(sent[0].origin).toMatchObject({ asUser: true })
  expect(toasts).toEqual([])

  isRefused = true
  await pressMerge($)
  expect(toasts).toEqual(['Merge und Issues wurden nicht gestartet: Stop-Hook'])
})

test('a count label is raised as small digits, the plus included', async () => {
  expect(raised('3')).toBe('³')
  expect(raised('12')).toBe('¹²')
  expect(raised('100+')).toBe('¹⁰⁰⁺')
  expect(raised('')).toBe('')
})

test('the merge icon carries the number of open pull requests as raised digits, on the desktop and the terminal', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: self.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', () => ghList([1, 2, 3]))
  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()

  const badges = async (surface: 'desktop' | 'terminal') => {
    const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 100 }, surface })
    const texts = await ui.findAll({ type: 'Text' })
    await ui.unmount()

    return texts.map(text => text.text).filter(text => /^[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(text))
  }
  expect(await badges('desktop')).toEqual(['³'])
  expect(await badges('terminal')).toEqual(['³'])
})

async function pressKey($: TestEngine, key: string, bodyColumns = 100) {
  const band = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  await afterCooldown($)
  await band.press({ key })
  await band.unmount()
}

test('the check prompt goes from quality to tests to the real flow, may set up Playwright, and keeps its limits', async () => {
  const prompt = pruefenPrompt('Beta')
  expect(prompt).toContain('„Beta“')
  const order = ['1. Qualität', '2. Tests', '3. E2E', '4. Stack'].map(step => prompt.indexOf(step))
  expect(order.every(at => at >= 0)).toBe(true)
  expect(order).toEqual([...order].sort((a, b) => a - b))
  // Tests that would be red without the change; production code is left alone.
  expect(prompt).toContain('Tests, die ohne die Änderung rot wären')
  expect(prompt).toContain('Produktivcode änderst du dafür nicht')
  // The real flow: Playwright, set up if missing and said so; the project's own skills first; snapshots reported.
  expect(prompt).toContain('mit Playwright')
  expect(prompt).toContain('richte es minimal ein und sag mir, was du installiert hast')
  expect(prompt).toContain('Nutze die Skills und Skripte des Projekts')
  expect(prompt).toContain('melde Abweichungen, statt sie ungefragt zu aktualisieren')
  expect(prompt).toContain('Das ist nur lesen')
  // Limits.
  expect(prompt).toContain('nichts pushen, nichts mergen, keine Tests löschen oder abschwächen')
  expect(prompt).toContain('halte an und sag mir, woran es liegt')
})

test('the stack prompt looks before it builds, builds without touching data, and checks the running state', async () => {
  const prompt = stackPrompt('Beta')
  expect(prompt).toContain('„Beta“')
  const order = ['1. Vorher', '2. Bauen', '3. Danach'].map(step => prompt.indexOf(step))
  expect(order.every(at => at >= 0)).toBe(true)
  expect(order).toEqual([...order].sort((a, b) => a - b))
  // Something live and armed stops it.
  expect(prompt).toContain('Live-Konto')
  expect(prompt).toContain('halte an und frag mich')
  expect(prompt).toContain('docker compose -p <Projektname> up -d --build')
  // The running state is the folder's: health and a state marker.
  expect(prompt).toContain('Health-Endpunkt')
  expect(prompt).toContain('Git-SHA, Version oder Build-Zeit')
  // Limits that keep a stack with data safe.
  expect(prompt).toContain('kein docker compose down mit -v')
  expect(prompt).toContain('keine Volumes oder Daten löschen')
  expect(prompt).toContain('keine Container anfassen, die nicht zu diesem Stack gehören')
})

test('the check and stack buttons submit their prompts as the person\'s own words, and a refusal is a toast', async ($, on) => {
  on('fs.list', () => ({
    value: [{ name: 'compose.yaml', kind: 'file', size: 0, mtimeMs: 0, isLink: false }],
  }))
  let isRefused = false
  const { sent, toasts } = await meinungSession($, on, text => (isRefused ? { drop: 'Stop-Hook' } : { text }))

  await pressKey($, 'pruefen', 100)
  await pressKey($, 'stack', 70)
  expect(sent.map(prompt => prompt.text)).toEqual([pruefenPrompt('Beta'), stackPrompt('Beta')])
  expect(sent[0].origin).toMatchObject({ asUser: true })
  expect(toasts).toEqual([])

  isRefused = true
  await pressKey($, 'pruefen')
  await pressKey($, 'stack')
  expect(toasts).toEqual(['Die Prüfung wurde nicht gestartet: Stop-Hook', 'Der Stack wurde nicht neu gebaut: Stop-Hook'])
})

test('the settings icon opens the color picker with the mode switch and the hide button', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'ausblenden' })).toBe(undefined)
  await ui.press({ key: 'einstellungen' })
  expect(await ui.find({ key: 'farbe-lila' })).toBeDefined()
  expect(await ui.find({ key: 'modus-daemmerung' })).toBeDefined()
  expect(await ui.find({ key: 'ausblenden' })).toBeDefined()
  await ui.unmount()
})

test('the prompts document shows what each button does, what to check, and the text itself', async () => {
  const doc = promptsMarkdown()
  expect(doc.startsWith('# Prompts hinter den Band-Knöpfen')).toBe(true)
  expect(PROMPT_INFO.map(info => info.key)).toEqual(['fable', 'meinung', 'review', 'handoff', 'merge', 'pruefen', 'stack'])
  for (const info of PROMPT_INFO) {
    expect(doc).toContain(`## ${info.name} (\`${info.key}\`)`)
    expect(doc).toContain(info.does)
    for (const check of info.checks) {
      expect(doc).toContain(`- ${check}`)
    }
    // The text stands verbatim in a fence, with the project left as a slot.
    expect(doc).toContain(`\`\`\`text\n${info.text('{Projekt}')}\n\`\`\``)
  }
  expect(doc.endsWith('\n')).toBe(true)
  expect(promptsMarkdown('Beta')).toContain(meinungPrompt('Beta'))
})

test('/projektfarbe prompts prints that document', async ($, on) => {
  await startBand($, on, `${BETA}\\.claude\\worktrees\\a`)

  expect((await $.command.run({ ...RUN, args: 'prompts' })).text).toBe(promptsMarkdown())
})

// The CI row: the pushed head's jobs, from one GraphQL query, and how far the running one is.

const iso = (ms: number): string => new Date(ms).toISOString()

/** A check suite of GitHub Actions as `CI_QUERY` answers it; `run` false: another app's suite. */
const suite = (status: string, jobs: unknown[], run = true) => ({
  status,
  workflowRun: run
    ? { event: 'pull_request', url: 'https://github.com/me/beta/actions/runs/9', workflow: { databaseId: 7 } }
    : null,
  checkRuns: { nodes: jobs },
})

/** A job (check run) with its steps. */
const ciJob = (
  name: string,
  status: string,
  conclusion: string | null,
  startedAt: number | null,
  steps: { name: string; status: string; startedAt: number | null }[] = [],
) => ({
  name,
  status,
  conclusion,
  startedAt: startedAt === null ? null : iso(startedAt),
  completedAt: status === 'COMPLETED' && startedAt !== null ? iso(startedAt + 60_000) : null,
  steps: {
    nodes: steps.map(step => ({ ...step, startedAt: step.startedAt === null ? null : iso(step.startedAt), completedAt: null })),
  },
})

/** What `gh api graphql` prints for `CI_QUERY`. */
const ciAnswer = (suites: unknown[], pr: { number: number; url: string; state: string } | null = null): string =>
  JSON.stringify({
    data: {
      repository: {
        object: { associatedPullRequests: { nodes: pr === null ? [] : [pr] }, checkSuites: { nodes: suites } },
      },
    },
  })

const T0 = Date.parse('2026-10-28T15:00:00Z')
// When the CI sessions start: an hour after the baseline run.
const CI_START = T0 + 60 * 60_000

test('a job stands green, red, running, waiting, cancelled or skipped; cancelled is not red', () => {
  expect(ciArt('COMPLETED', 'SUCCESS')).toBe('gruen')
  expect(ciArt('completed', 'failure')).toBe('rot')
  expect(ciArt('COMPLETED', 'TIMED_OUT')).toBe('rot')
  expect(ciArt('COMPLETED', 'CANCELLED')).toBe('abgebrochen')
  expect(ciArt('COMPLETED', 'SKIPPED')).toBe('uebersprungen')
  expect(ciArt('IN_PROGRESS', null)).toBe('laeuft')
  expect(ciArt('QUEUED', null)).toBe('wartet')
  expect(ciArt('WAITING', null)).toBe('wartet')
})

test('the head\'s CI leaves out suites without a workflow run, and a run without jobs yet waits', () => {
  const commit = ciCommitOf(
    ciAnswer(
      [
        // Another app's suite: queued for ever, no run. It must not hold the row at "running".
        suite('QUEUED', [], false),
        suite('IN_PROGRESS', [
          ciJob('Backend (pytest + ruff)', 'COMPLETED', 'FAILURE', T0),
          ciJob('Checks', 'COMPLETED', 'SUCCESS', T0),
          ciJob('Frontend', 'IN_PROGRESS', null, T0),
          ciJob('Nightly', 'COMPLETED', 'SKIPPED', T0),
        ]),
        suite('QUEUED', []),
      ],
      { number: 331, url: 'https://github.com/me/beta/pull/331', state: 'OPEN' },
    ),
  )!
  expect(commit.jobs.map(job => job.art)).toEqual(['rot', 'gruen', 'laeuft', 'uebersprungen'])
  expect(commit).toMatchObject({ wartendeLaeufe: 1, hasLaeufe: true, isFertig: false, pr: { number: 331 } })
  expect(commit.runUrl).toBe('https://github.com/me/beta/actions/runs/9')
  expect(commit.jobs[0]).toMatchObject({ workflowId: 7, event: 'pull_request', startedAt: T0 })

  // Only other apps' suites, or none: no CI. Not JSON or not this shape: null.
  expect(ciCommitOf(ciAnswer([suite('QUEUED', [], false)]))).toMatchObject({ hasLaeufe: false })
  expect(ciCommitOf('nope')).toBeNull()
  expect(ciCommitOf('{"data":{}}')).toBeNull()
  // A commit GitHub does not know (not pushed yet) has no CI either.
  expect(ciCommitOf('{"data":{"repository":{"object":null}}}')).toMatchObject({ hasLaeufe: false, jobs: [] })
})

test('pytest\'s curve is read from a finished log, against the seconds since its step began', () => {
  const step = (name: string, from: number, to: number) => ({
    name,
    isFertig: true,
    startedAt: T0 + from * 1000,
    completedAt: T0 + to * 1000,
  })
  const schritte = [step('Set up job', 0, 20), step('Run tests', 20, 380), step('Coverage', 380, 400)]
  const line = (sek: number, text: string) => `${iso(T0 + sek * 1000).replace('.000Z', '.1234567Z')} ${text}\r`
  const log = [
    line(5, 'Run actions/checkout'),
    line(60, '....................... [ 10%]'),
    line(100, '....F.................. [ 10%]'),
    line(220, '....................... [ 50%]'),
    line(320, '..s.................... [ 90%]'),
    line(379, '....................... [100%]'),
    // A later step with its own percentages is not the curve.
    line(390, 'coverage .............. [ 12%]'),
  ].join('\n')

  const kurve = ciKurve(log, schritte)!
  expect(kurve.schritt).toBe('Run tests')
  // Each percent once, at the first time it shows, in seconds since the step began.
  expect(kurve.punkte.map(([sek, prozent]) => [Math.round(sek), prozent])).toEqual([
    [40, 10],
    [200, 50],
    [300, 90],
    [359, 100],
  ])
  // Linear in between, from 0 at the step's start; the last value past the end.
  expect(Math.round(kurveBei(kurve, 20))).toBe(5)
  expect(Math.round(kurveBei(kurve, 120))).toBe(30)
  expect(kurveBei(kurve, 500)).toBe(100)

  expect(ciKurve('no progress here', schritte)).toBeNull()
})

test('a running job\'s percent is pytest\'s while its step runs, else the share of the last green run\'s time', () => {
  const vorlage = {
    dauerSek: 400,
    kurve: { schritt: 'Run tests', punkte: [[40, 10], [200, 50], [300, 90]] as [number, number][] },
  }
  const job = (stepRuns: boolean) => ({
    name: 'Backend',
    art: 'laeuft' as const,
    startedAt: T0,
    completedAt: null,
    workflowId: 7,
    event: 'pull_request',
    schritte: [
      { name: 'Set up job', isFertig: true, startedAt: T0, completedAt: T0 + 20_000 },
      { name: 'Run tests', isFertig: !stepRuns, startedAt: stepRuns ? T0 + 20_000 : null, completedAt: null },
    ],
  })

  // 100 s in: the step runs 80 s, 20 % on the curve; 300 s to go.
  expect(jobFortschritt(job(true), vorlage, T0 + 100_000)).toEqual({ prozent: 20, restSek: 300, quelle: 'log' })
  // Before the step: a quarter of the time.
  expect(jobFortschritt(job(false), vorlage, T0 + 100_000)).toEqual({ prozent: 25, restSek: 300, quelle: 'zeit' })
  // Past the baseline it stays below 100 while it runs.
  expect(jobFortschritt(job(false), vorlage, T0 + 900_000)).toEqual({ prozent: 99, restSek: 0, quelle: 'zeit' })
  // No baseline: no percent.
  expect(jobFortschritt(job(true), null, T0)).toEqual({ prozent: null, restSek: null, quelle: null })
})

test('the CI row counts green, names the red, shows the slowest running job and fits its width', () => {
  const commit = ciCommitOf(
    ciAnswer(
      [
        suite('IN_PROGRESS', [
          ciJob('Changes', 'COMPLETED', 'SUCCESS', T0),
          ciJob('Checks (ratchets, gitleaks)', 'COMPLETED', 'SUCCESS', T0),
          ciJob('Backend (pytest + ruff + persistence)', 'COMPLETED', 'FAILURE', T0),
          ciJob('Frontend (domain checks)', 'IN_PROGRESS', null, T0),
          ciJob('Diff coverage', 'QUEUED', null, null),
        ]),
      ],
      { number: 331, url: 'https://github.com/me/beta/pull/331', state: 'OPEN' },
    ),
  )!
  const anzeige = ciAnzeige(commit, () => ({ dauerSek: 300, kurve: null }), T0 + 213_000)!
  expect(anzeige).toMatchObject({ gruen: 2, rot: 1, laeuft: 1, wartet: 1, restSek: 87, isFertig: false })
  // The row leads to the pull request's checks.
  expect(anzeige.url).toBe('https://github.com/me/beta/pull/331/checks')
  const plain = (form: 'voll' | 'kurz') => ciTeile(anzeige, form).map(teil => teil.text)
  expect(plain('voll')).toEqual([
    `✓${NBSP}2`,
    `✕${NBSP}1${NBSP}Backend`,
    `◔${NBSP}Frontend${NBSP}71${NBSP}%${NBSP}·${NBSP}~2${NBSP}Min`,
    `○${NBSP}1${NBSP}wartet`,
  ])
  expect(plain('kurz')).toEqual([`✓${NBSP}2`, `✕${NBSP}1`, `◔${NBSP}71${NBSP}%${NBSP}~2${NBSP}Min`, `○${NBSP}1`])
  expect(ciTeile(anzeige, 'voll').map(teil => teil.ton)).toEqual(['gruen', 'rot', 'laeuft', 'leise'])
  // The red part's card names the job in full; the running one says where its percent comes from.
  expect(ciTeile(anzeige, 'voll')[1]?.hint).toBe('Rot: Backend (pytest + ruff + persistence)')
  expect(ciTeile(anzeige, 'voll')[2]?.hint).toContain('geschätzt aus der Dauer des letzten grünen Laufs')
  expect(ciTon(anzeige)).toBe('rot')
  expect(ciText(anzeige)).toBe('CI: ✓ 2 · ✕ 1 Backend · ◔ Frontend 71 % · ~2 Min · ○ 1 wartet')

  // Wide enough: the names; narrow: symbols and numbers.
  expect(ciForm(80, anzeige)).toBe('voll')
  expect(ciForm(30, anzeige)).toBe('kurz')
  expect(ciForm(40, anzeige, true)).toBe('kurz')

  // Done and green: the count says so, the row is green.
  const gruen = ciAnzeige(
    ciCommitOf(ciAnswer([suite('COMPLETED', [ciJob('A', 'COMPLETED', 'SUCCESS', T0), ciJob('B', 'COMPLETED', 'SUCCESS', T0)])]))!,
    () => null,
    T0,
  )!
  expect(ciTeile(gruen, 'voll').map(teil => teil.text)).toEqual([`✓${NBSP}2${NBSP}grün`])
  expect(ciTon(gruen)).toBe('gruen')
  // A head without workflow runs has no row.
  expect(ciAnzeige(ciCommitOf(ciAnswer([]))!, () => null, T0)).toBeNull()
})

/** A desktop session of Beta whose pushed head is `sha`, with gh answering the CI from `ci()`. */
async function ciSession(
  $: Tested,
  on: Parameters<typeof mock.store>[0],
  ci: () => string,
  head: () => string | null = () => 'a'.repeat(40),
) {
  const cwd = `${BETA}\\.claude\\worktrees\\a`
  const self = { sessionId: 'local_b', title: 'Neu', cwd }
  const clock = mock.clock(on, { now: CI_START })
  mock.store(on)
  const graphql: number[] = []
  const ok = (stdout: string) => ({
    value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  })
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('process.run', (_, e) => {
    const argv = e.argv
    if (argv[0] === 'git') {
      const sha = head()

      return sha === null ? ghFails('fatal: no upstream configured') : ok(`${sha}\n`)
    }
    if (argv[1] === 'api' && argv[2] === 'graphql') {
      graphql.push(clock.now())

      return ok(ci())
    }
    const path = argv.find(arg => arg.startsWith('repos/')) ?? ''
    // The baseline: the workflow's last green run, its jobs, and the Backend job's log.
    if (path.includes('/workflows/7/runs?status=success&event=pull_request')) {
      return ok(JSON.stringify({ workflow_runs: [{ id: 5 }] }))
    }
    if (path.endsWith('/runs/5/jobs?per_page=100')) {
      const step = (name: string, from: number, to: number) => ({
        name,
        status: 'completed',
        started_at: iso(T0 + from * 1000),
        completed_at: iso(T0 + to * 1000),
      })

      return ok(
        JSON.stringify({
          jobs: [
            {
              id: 77,
              name: 'Backend',
              conclusion: 'success',
              started_at: iso(T0),
              completed_at: iso(T0 + 400_000),
              steps: [step('Set up job', 0, 20), step('Run tests', 20, 380), step('Report', 380, 400)],
            },
          ],
        }),
      )
    }
    if (path.endsWith('/jobs/77/logs')) {
      const line = (sek: number, pct: number) => `${iso(T0 + sek * 1000)} ........ [${String(pct).padStart(3)}%]`

      return ok([line(60, 10), line(220, 50), line(320, 90)].join('\n'))
    }

    return argv[0] === 'gh' && argv[1] !== 'api' ? ghList([]) : ghFails('not here')
  })
  await $.session.start({ cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()

  return { clock, graphql }
}

/** The CI row's texts as the band draws them, blanks plain; empty without a row. */
async function ciRowOf($: Tested, bodyColumns = 120): Promise<string[]> {
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns }, surface: 'desktop' })
  const row = await ui.find({ key: 'ci-zeile' })
  // The word and the parts, which start with their symbol; the hover cards are left out.
  const texts = row === undefined ? [] : await ui.findAll({ type: 'Text' })
  const ci = await ui.find({ key: 'ci' })
  await ui.unmount()
  const parts = texts.map(text => text.text.split(NBSP).join(' ')).filter(text => /^[✓✕◔○⊘] /.test(text))

  return row === undefined ? [] : [ci?.text ?? 'CI', ...parts]
}

test('the band\'s CI row shows the pushed head\'s jobs, with pytest\'s percent from the last green log', async ($, on) => {
  let stand: 'laeuft' | 'fertig' = 'laeuft'
  const now = CI_START
  const answer = () =>
    ciAnswer([
      suite(stand === 'laeuft' ? 'IN_PROGRESS' : 'COMPLETED', [
        ciJob('Checks', 'COMPLETED', 'SUCCESS', now - 200_000),
        stand === 'laeuft'
          ? ciJob('Backend', 'IN_PROGRESS', null, now - 100_000, [
              { name: 'Set up job', status: 'COMPLETED', startedAt: now - 100_000 },
              { name: 'Run tests', status: 'IN_PROGRESS', startedAt: now - 80_000 },
            ])
          : ciJob('Backend', 'COMPLETED', 'SUCCESS', now - 400_000),
      ]),
    ])
  const { clock, graphql } = await ciSession($, on, () => answer())

  // 80 s into the tests: 20 % on the last green run's curve, 300 s of its 400 to go.
  expect(await ciRowOf($)).toEqual(['CI', '✓ 1', '◔ Backend 20 % · ~5 Min'])
  const asked = graphql.length

  // While it runs gh is asked every 30 s, and the row follows the clock in between.
  await clock.advance(30_000)
  await clock.settle()
  expect(graphql.length).toBe(asked + 1)
  expect((await ciRowOf($))[2]).toBe('◔ Backend 27 % · ~5 Min')

  // Done: green, and no more questions.
  stand = 'fertig'
  await clock.advance(30_000)
  await clock.settle()
  expect(await ciRowOf($)).toEqual(['CI', '✓ 2 grün'])
  const done = graphql.length
  await clock.advance(10 * 60_000)
  await clock.settle()
  expect(graphql.length).toBe(done)
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain('CI: ✓ 2 grün')
})

test('without an upstream the band has no CI row and gh is not asked', async ($, on) => {
  const { graphql } = await ciSession($, on, () => ciAnswer([]), () => null)
  expect(graphql).toEqual([])
  expect(await ciRowOf($)).toEqual([])
  // The band itself is as it was: one row.
  expect((await drawBand($, 100)).isStacked).toBe(false)
})

test('a head without runs is asked once; one pushed while the session watches waits a few minutes', async ($, on) => {
  let sha = 'a'.repeat(40)
  const { clock, graphql } = await ciSession($, on, () => ciAnswer([]), () => sha)
  expect(graphql).toHaveLength(1)
  await clock.advance(5 * 60_000)
  await clock.settle()
  expect(graphql).toHaveLength(1)

  // A push: the new head's runs may take a while to show.
  sha = 'b'.repeat(40)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(graphql).toHaveLength(2)
  await clock.advance(2 * 60_000)
  await clock.settle()
  // Asked every 30 s while the runs may still come.
  expect(graphql.length).toBeGreaterThan(3)
  const asked = graphql.length
  await clock.advance(10 * 60_000)
  await clock.settle()
  expect(graphql.length).toBeLessThanOrEqual(asked + 2)
  expect(await ciRowOf($)).toEqual([])
})
