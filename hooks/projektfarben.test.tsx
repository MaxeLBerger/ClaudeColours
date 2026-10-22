import { expect, mock, test } from 'claude-code/testing'

import {
  assignFarben,
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
  learnPicks,
  markOf,
  prCount,
  prLabel,
  projectOf,
  readPicks,
  SAETZE,
  satzOf,
  stripMark,
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
  expect(prCount('[{"number":4},{"number":9}]')).toBe(2)
  expect(prCount('[]')).toBe(0)
  expect(prCount('')).toBe(null)
  expect(prCount('{"number":4}')).toBe(null)
  expect(prCount('gh: not logged in')).toBe(null)
  expect([0, 7, 99, 100].map(prLabel)).toEqual(['0', '7', '99', '100+'])
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
    // No gh in this test, so no pull request count either.
    expect(texts.some(text => /PRs/.test(text.text))).toBe(false)
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
    asked.push([...e.argv])

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
  expect(asked).toEqual([['gh', 'pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number']])

  // A turn within five minutes does not ask again; one after them does.
  open = [1, 2, 3]
  await $.turn.complete(TURN)
  await clock.settle()
  expect(asked).toHaveLength(1)
  expect(await shown()).toBe('PRs: 2')
  await clock.advance(5 * 60_000)
  await $.turn.complete(TURN)
  await clock.settle()
  expect(asked).toHaveLength(2)
  expect(await shown()).toBe('PRs: 3')
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain('Offene PRs: 3')
})

test('the repo button asks gh to open the repository in the browser', async ($, on) => {
  const self = { sessionId: 'local_b', title: 'Neu', cwd: `${BETA}\\.claude\\worktrees\\a` }
  const asked: string[][] = []
  const clock = mock.clock(on)
  mock.store(on)
  on('mcp.call', fakeDesktop(self, []).hook)
  on('command.register', () => ({ value: { command: 'projektfarbe' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    asked.push([...e.argv])

    return ghList([1])
  })

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'repo' })).toBeDefined()
  await ui.press({ key: 'repo' })
  await ui.unmount()
  expect(asked[asked.length - 1]).toEqual(['gh', 'repo', 'view', '--web'])
})

test('without a working gh the band shows no count, and /projektfarbe says why', async ($, on) => {
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

  const hasCount = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const texts = await ui.findAll({ type: 'Text' })
    const button = await ui.find({ key: 'repo' })
    await ui.unmount()

    // Neither the count nor the button that opens the repo.
    return texts.some(text => /PRs/.test(text.text)) || button !== undefined
  }

  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await hasCount()).toBe(false)
  expect((await $.command.run({ ...RUN, args: '' })).text).toContain(
    'PR-Zahl nicht verfügbar: gh lässt sich hier nicht starten',
  )

  fails = 'exit'
  await $.session.start({ cwd: self.cwd, surface: 'desktop', isInteractive: true })
  await clock.settle()
  expect(await hasCount()).toBe(false)
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
  expect((await ui.find({ type: 'Text', text: /Alpha/ }))?.text).toBe('⬤ Alpha')
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
