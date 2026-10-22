import { expect, mock, test } from 'claude-code/testing'

import {
  alterText,
  assignFarben,
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
  modusLabel,
  newCount,
  prLabel,
  projectOf,
  readPicks,
  SAETZE,
  readSeen,
  readStand,
  rememberStand,
  satzOf,
  statusOf,
  stripMark,
  superscript,
  toListed,
  uebersichtText,
  type GhPr,
  type Grund,
} from './colors'

const ALPHA = 'C:\\Users\\me\\Repos\\Alpha'
const BETA = 'C:\\Users\\me\\Repos\\Beta'

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
  expect([0, 3, 7, 50, 100].map(contextFill)).toEqual([0, 1, 1, 4, 8])
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
    // No gh in this test: the counts show 0 rather than leave a gap.
    expect(texts.some(text => text.text === 'PRs: 0')).toBe(true)
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
    await ui.unmount()

    // The label, then the number in bold.
    const number = texts.find(text => text.props.bold === true && /^\d+\+?$/.test(text.text))?.text

    return texts.some(text => /^PRs:/.test(text.text)) && number !== undefined
      ? `PRs: ${number}`
      : undefined
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
  expect(await shown()).toBe('PRs: 3')
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

test('without a working gh the band shows 0, and /projektfarbe says why', async ($, on) => {
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
  // The band keeps its shape: 0 for what could not be read; /projektfarbe says why.
  expect(await counts($)).toEqual({ prs: 'PRs: 0', issues: 'Issues: 0', raised: [] })
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain(
    'PR-Zahl nicht verfügbar: gh lässt sich hier nicht starten',
  )

  fails = 'exit'
  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await counts($)).toEqual({ prs: 'PRs: 0', issues: 'Issues: 0', raised: [] })
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
  expect((await counts($)).prs).toBe('PRs: 0')
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
async function counts($: Tested) {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const texts = await ui.findAll({ type: 'Text' })
  await ui.unmount()
  const label = (prefix: string) => texts.find(text => text.text.startsWith(prefix))?.text

  return {
    prs: label('PRs: '),
    issues: label('Issues: '),
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
  expect(kept.get('gesehen')).toEqual({ beta: { pr: 3, issue: 5 } })

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
  expect(kept.get('gesehen')).toEqual({ beta: { pr: 3, issue: 9 } })

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
  expect(await counts($)).toEqual({ prs: 'PRs: 1', issues: 'Issues: 0', raised: [] })
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain(
    'Issue-Zahl nicht verfügbar: gh meldet: the repository has disabled issues',
  )
  // Only the pull requests got a baseline.
  expect(kept.get('gesehen')).toEqual({ beta: { pr: 1 } })
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
  const texts = (await ui.findAll({ type: 'Text' })).map(text => text.text)
  await ui.unmount()
  const at = (pattern: RegExp) => texts.findIndex(text => pattern.test(text))

  expect(at(/Beta$/)).toBeGreaterThan(-1)
  expect(at(/Beta$/)).toBeLessThan(at(/^PRs: /))
  expect(at(/^PRs: /)).toBeLessThan(at(/^Issues: /))
  expect(at(/^Issues: /)).toBeLessThan(at(/^Kontext/))
  // No separate repo button any more: the project name links to the repository.
  expect(at(/^Repo/)).toBe(-1)
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
    if (e.argv.includes('--state') && e.argv.includes('all')) {
      if (e.init?.cwd?.includes('Beta') === true) {
        return ghFails('could not resolve to a Repository')
      }

      return {
        value: {
          exitCode: 0,
          stdout: JSON.stringify([
            { number: 11, state: 'OPEN', headRefName: 'claude/login', isDraft: false, reviewDecision: 'REVIEW_REQUIRED', statusCheckRollup: [] },
            { number: 10, state: 'CLOSED', headRefName: 'claude/login', isDraft: false, reviewDecision: null, statusCheckRollup: [] },
          ]),
          stderr: '',
          isStdoutTruncated: false,
          isStderrTruncated: false,
        },
      }
    }

    return ghList([])
  })

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  asked.length = 0
  const text = (await $.command.run({ ...RUN, args: 'status' })).text

  expect(asked).toHaveLength(2)
  expect(asked[0]?.argv).toEqual([
    'gh', 'pr', 'list', '--state', 'all', '--limit', '200',
    '--json', 'number,state,headRefName,isDraft,reviewDecision,statusCheckRollup',
  ])
  expect(asked.map(one => one.cwd)).toEqual([self.cwd, others[1]!.cwd])
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
