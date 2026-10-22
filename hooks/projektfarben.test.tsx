import { expect, mock, test } from 'claude-code/testing'

import {
  assignFarben,
  BUNT,
  DAEMMERUNG,
  desiredTitle,
  farbeFor,
  FARBEN,
  findFarbe,
  findSatz,
  learnPicks,
  markOf,
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
  expect((await ui.find({ type: 'Text', text: /Beta/ }))?.text).toBe('🟪 Beta')
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
    expect((await ui.find({ type: 'Text', text: /Beta/ }))?.text).toBe('🟦 Beta')
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
