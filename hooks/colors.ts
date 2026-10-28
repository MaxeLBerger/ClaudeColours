// Pure helpers: which project a folder belongs to, which color it has,
// and what a session title looks like with the color mark in front.
// No project is named here: colors live in the mod's own store, per person.

export type Farbe = { name: string; mark: string; hex: string }

/**
 * A set of colors a project can have. The bright default and the calm sleep
 * set are both data: nothing below names one, so a further set is one more entry.
 */
export type Satz = {
  id: string
  label: string
  /** Stands for the set in the color picker's mode switch; none is shared by two sets. */
  emoji: string
  /** Where the person's picks for this set live in the store. */
  storeKey: string
  farben: readonly Farbe[]
  /** The order a new project is handed a color in (names from `farben`). */
  reihenfolge: readonly string[]
  /** Marks are plain text, not emoji: one only counts when a space or the end follows it. */
  strikt: boolean
}

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

/**
 * Calm colors for the evening. A session title is plain text and cannot be tinted,
 * and emoji colors are the system's own (the moon phases and several nature emoji
 * come out vivid on Windows), so the sidebar gets a monochrome shape and only
 * the band gets the color: every hex is below 0.06 chroma (OKLCH), at least 5 apart (OKLab x100).
 */
const DAEMMERUNG_FARBEN: readonly Farbe[] = [
  { name: 'nebel', mark: '⬤', hex: '#93aeca' },
  { name: 'sand', mark: '■', hex: '#d7caa6' },
  { name: 'altrosa', mark: '▲', hex: '#c59b9e' },
  { name: 'moos', mark: '◆', hex: '#8a9974' },
  { name: 'flieder', mark: '▼', hex: '#a597b8' },
  { name: 'petrol', mark: '◐', hex: '#6e9ba1' },
  { name: 'ton', mark: '◑', hex: '#b49078' },
  { name: 'salbei', mark: '⬢', hex: '#a8c7ad' },
  { name: 'schiefer', mark: '▣', hex: '#797f99' },
  { name: 'mauve', mark: '✚', hex: '#9d7a8d' },
]

export const BUNT: Satz = {
  id: 'bunt',
  label: 'bunt',
  emoji: '🎨',
  storeKey: 'farben',
  farben: FARBEN,
  reihenfolge: REIHENFOLGE,
  strikt: false,
}

export const DAEMMERUNG: Satz = {
  id: 'daemmerung',
  label: 'Dämmerung',
  emoji: '🌙',
  storeKey: 'farben-daemmerung',
  farben: DAEMMERUNG_FARBEN,
  reihenfolge: DAEMMERUNG_FARBEN.map(f => f.name),
  strikt: true,
}

export const SAETZE: readonly Satz[] = [BUNT, DAEMMERUNG]
/** The sets sleep mode can use; the first is what `/projektfarbe schlaf` picks. */
export const SCHLAFSAETZE: readonly Satz[] = [DAEMMERUNG]

/** What the color picker's mode switch shows for a set: its emoji and its name, capitalized. */
export const modusLabel = (satz: Satz): string =>
  `${satz.emoji} ${satz.label.charAt(0).toUpperCase()}${satz.label.slice(1)}`

const PLATZHALTER = new Set(['', 'new session', 'neue session', 'untitled', 'unbenannt'])

const byName = (satz: Satz, name: string): Farbe | undefined => satz.farben.find(f => f.name === name)
const byMark = (satz: Satz, mark: string): Farbe | undefined => satz.farben.find(f => f.mark === mark)

/** A name as the person types it: lowercase, umlauts spelled out, spaces as dashes. */
const asciiName = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')

/** The color set stored under `modus`; the bright one when none is stored. */
export function satzOf(id: unknown): Satz {
  return SAETZE.find(s => s.id === id) ?? BUNT
}

/** A sleep set from what the person typed (dämmerung, Daemmerung, …). */
export function findSatz(input: string): Satz | undefined {
  const name = asciiName(input)

  return SCHLAFSAETZE.find(s => asciiName(s.label) === name || s.id === name)
}

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

/**
 * What the opinion button sends the session, as the person's own words (they would type the same). It
 * states goals, not a form: the session decides from the conversation what the opinion is about (the last
 * question, a plan to rework, the state of the project) and builds the subagent's task itself, handing
 * over the matter and only what it needs, never its own conclusion, so the view stays independent and
 * the subagent's context small. The subagent reads the rest of the repository itself.
 */
export function meinungPrompt(projekt: string): string {
  return [
    `Hol eine unabhängige zweite Meinung von Opus ein zu dem, worum es in diesem Gespräch gerade geht: meine letzte Frage, der Plan, den wir haben, oder der Stand von „${projekt}“. Du entscheidest, was gemeint ist.`,
    [
      'Starte dafür mit dem Agent-Tool einen Subagenten (subagent_type general-purpose, model opus) und baue seinen Auftrag selbst zusammen:',
      '- Gib ihm die Sache selbst mit, über die er urteilen soll: die Frage, den Plan im Wortlaut oder die Dateien und Stellen, um die es geht. Wenn ich den Plan überarbeitet haben will, gehört der Plan hinein, mit der Bitte, ihn zu verbessern.',
      '- Gib ihm nicht deine eigene Schlussfolgerung oder Empfehlung mit, sonst urteilt er nur nach; es sei denn, genau die soll er prüfen.',
      '- Nimm nur auf, was er wirklich braucht: keinen Gesprächsverlauf, keine Nebenpfade. Alles Weitere soll er selbst im Repository nachsehen (CLAUDE.md, README.md, git log, gh pr list, gh issue list). Er ändert nichts.',
      '- Er soll direkt sein, jede Aussage mit einer Stelle belegen (Datei, Commit oder Nummer) und sagen, wo er anderer Meinung ist und warum. So lang wie nötig, ohne Füllstoff.',
    ].join('\n'),
    'Gib seine Antwort danach unverändert wieder und sage darunter kurz, wo du anderer Meinung bist und was du übernimmst.',
  ].join('\n\n')
}

/**
 * What the review button sends the session, as the person's own words: check the work, commit it, open
 * the pull request. Pressing the button is the go-ahead for those three steps, and for nothing beyond
 * them (no merge, no push to the main branch, no force). Like `meinungPrompt` it states goals and leaves
 * the how to the session, which knows the repository; where a step cannot be done it stops and says why.
 */
export function reviewPrompt(projekt: string): string {
  return [
    `Bring die Änderungen in „${projekt}“ bis zum Pull Request: erst prüfen, dann committen, dann den PR öffnen.`,
    [
      '1. Review: Sieh dir an, was seit dem Abzweig vom Basis-Branch geändert ist (git status, git diff, bei Bedarf der code-review-Skill). Behebe echte Befunde, bevor es weitergeht, und lass die Tests und Prüfungen des Projekts laufen (siehe CLAUDE.md oder README). Sag mir kurz, was du gefunden und geändert hast.',
      '2. Commit: Fasse zusammen, was zusammengehört, mit Nachrichten in der Art der letzten Commits. Nimm nur Dateien dieser Arbeit mit, keine Nebenprodukte und keine Geheimnisse.',
      '3. PR: Pushe den Branch (nie auf den Basis-Branch, nie mit force) und öffne einen Pull Request dagegen, mit einer Beschreibung, die sagt, was sich ändert, warum und was geprüft ist. Mergen tust du nicht.',
    ].join('\n'),
    'Wenn einer der Schritte nicht geht (Tests rot, nichts zu committen, kein Remote, ein Befund, der meine Entscheidung braucht), halte an und sag mir, woran es liegt, statt es zu umgehen. Am Ende nennst du mir den Link zum PR.',
  ].join('\n\n')
}

/**
 * What the handoff button sends the session, as the person's own words: a message for a fresh session
 * that carries on where this one stands. It holds what the repository cannot tell, and leaves out what
 * the new session reads there itself; it is written so it can be pasted as the first message. Nothing is
 * started or changed: the person decides what to do with the text.
 */
export function handoffPrompt(projekt: string): string {
  return [
    `Schreib mir eine Übergabe für eine frische Session, die an „${projekt}“ da weitermacht, wo wir gerade stehen.`,
    'Sie soll enthalten, was die neue Session braucht und nicht aus dem Repository erfährt: das Ziel, was schon erledigt und entschieden ist (mit dem Grund), was offen ist und womit es weitergeht, wo es hakt oder riskant ist, und welche Dateien, Branches oder PRs betroffen sind. Was sie selbst lesen kann (Code, git log, CLAUDE.md), lass weg und nenne nur, wo sie nachsehen soll. Keine Gesprächsgeschichte, keine Füllsätze.',
    'Schreib sie so, dass ich sie unverändert als erste Nachricht in eine neue Session einfügen kann. Ändere nichts und starte nichts.',
  ].join('\n\n')
}

/**
 * What the merge button sends the session, as the person's own words: bring the open pull requests into
 * the main branch in a sensible order, and solve the issues that fit, merging those too. Pressing the
 * button is the go-ahead for merging; the limits keep it safe (green checks, no force, no drafts) and
 * what needs a decision stays open and is named.
 */
export function mergePrompt(projekt: string): string {
  return [
    `Bring die offenen PRs in „${projekt}“ sinnvoll in den Hauptzweig und löse passende Issues gleich mit.`,
    [
      '1. PRs: Sieh dir alle offenen PRs an (gh pr list) und lege eine sinnvolle Reihenfolge fest: erst die unabhängigen, dann die, die darauf aufbauen oder dieselben Dateien ändern. Merge jeden PR, dessen Checks grün sind und der keine offenen Befunde hat. Bei einem Konflikt: löse ihn, wenn er eindeutig ist, und lass die Checks neu laufen. Prüfe nach jedem Merge den nächsten gegen den neuen Stand.',
      '2. Issues: Suche danach die offenen Issues, die klar und klein genug sind oder die der neue Stand schon löst (gh issue list). Löse jedes in einem eigenen Branch mit eigenem PR („Closes #n“), lass die Tests laufen und merge ihn, wenn die Checks grün sind. Was der Stand ohnehin schon erledigt, schließt du mit einem Hinweis.',
    ].join('\n'),
    'Grenzen: kein Force-Push, nichts an der Historie des Hauptzweigs ändern, keine Entwürfe mergen. Was rot ist, eine Entscheidung von mir braucht oder unklar bleibt, lässt du liegen und nennst es mir mit dem Grund. Am Ende gibst du mir eine kurze Liste: was gemerged ist, was gelöst wurde und was offen blieb.',
  ].join('\n\n')
}

/**
 * What the check button sends the session, as the person's own words: static checks, then tests for the
 * change, then the real flow in a browser (Playwright), and, where there is a Docker stack, a read of its
 * health. It may write tests and set up Playwright, and nothing beyond that: no push, no merge, no tests
 * weakened. Where a step cannot be done it stops and says why.
 */
export function pruefenPrompt(projekt: string): string {
  return [
    `Prüf „${projekt}“ gründlich, bevor ich es weitergebe: erst die statische Prüfung, dann die Tests, dann der echte Ablauf im Browser.`,
    [
      '1. Qualität: Lass Lint, Typprüfung und Formatierung des Projekts über die geänderten Dateien laufen (siehe CLAUDE.md oder README) und behebe, was sie finden. Keine Regeln abschwächen, nichts mit Ausnahmen stummschalten.',
      '2. Tests: Sieh dir an, was seit dem Abzweig vom Basis-Branch geändert ist, und schreib Tests für die Pfade, die noch keiner abdeckt: Tests, die ohne die Änderung rot wären. Lass danach die ganze Suite laufen. Produktivcode änderst du dafür nicht; findest du darin einen Fehler, nenne ihn mir.',
      '3. E2E: Starte die App wirklich und geh den geänderten Ablauf mit Playwright durch. Nutze die Skills und Skripte des Projekts, falls es welche gibt (siehe CLAUDE.md und .claude/skills); fehlt Playwright, richte es minimal ein und sag mir, was du installiert hast. Mach Screenshots der wichtigen Stellen. Wo es schon Snapshots gibt, melde Abweichungen, statt sie ungefragt zu aktualisieren. Lohnt sich der Durchlauf als bleibender Test, leg ihn als Spec an.',
      '4. Stack: Läuft ein Docker-Stack dieses Projekts, sieh danach in Container-Status und Logs nach Fehlern. Das ist nur lesen.',
    ].join('\n'),
    'Grenzen: nichts pushen, nichts mergen, keine Tests löschen oder abschwächen. Lässt sich die App nicht starten oder braucht ein Schritt meine Entscheidung, halte an und sag mir, woran es liegt, statt es zu umgehen. Am Ende eine kurze Liste: was geprüft ist, was du geändert hast, was rot blieb und was du nicht prüfen konntest.',
  ].join('\n\n')
}

/**
 * What the stack button sends the session, as the person's own words: rebuild the repository's Docker
 * stack from this folder and check that it runs this state. It runs where the project has a compose file.
 * Pressing it is the go-ahead for building and starting; the limits keep a stack with real data safe (no
 * volumes removed, nothing outside the stack touched, a stop where something live is armed).
 */
export function stackPrompt(projekt: string): string {
  return [
    `Bau den Docker-Stack von „${projekt}“ auf dem Stand dieses Ordners neu, damit er läuft, was hier liegt.`,
    [
      '1. Vorher: Finde die Compose-Datei und den Projektnamen des Stacks (docker compose ls, `name:` in der Datei). Lies, ob er gegen ein Live-Konto oder mit einer Live-Freigabe läuft (Umgebungsvariablen, Konfiguration, CLAUDE.md), und nenn mir, was du gefunden hast. Ist etwas Live-Scharfes aktiv oder bleibt es unklar, halte an und frag mich.',
      '2. Bauen: Bau die Images neu und starte die Dienste mit docker compose -p <Projektname> up -d --build aus diesem Ordner.',
      '3. Danach: Warte, bis die Container gesund sind, frag den Health-Endpunkt ab und prüf, dass der laufende Stand dem dieses Ordners entspricht (Git-SHA, Version oder Build-Zeit). Lies die Logs der ersten Minuten auf Fehler.',
    ].join('\n'),
    'Grenzen: kein docker compose down mit -v, keine Volumes oder Daten löschen, keine Datenbank zurücksetzen, keine Container anfassen, die nicht zu diesem Stack gehören. Bleibt ein Dienst rot oder passt der Stand nicht, sag mir, was du siehst, statt weiterzubasteln. Am Ende: welche Container laufen, auf welchem Stand, und was dir aufgefallen ist.',
  ].join('\n\n')
}

/**
 * What a project's folder offers the band, from the names in it: a Docker stack shows the rebuild
 * button. Matches `docker-compose.yml`, `compose.yaml` and their `.override` / `.dev` forms.
 */
export function erkenneDienste(namen: readonly string[]): { hasCompose: boolean } {
  return { hasCompose: namen.some(name => /^(docker-)?compose(\.[\w-]+)*\.ya?ml$/i.test(name)) }
}

/** What each prompt button does and what a review of it checks, for `promptsMarkdown`. */
export const PROMPT_INFO = [
  {
    key: 'meinung',
    name: 'Opus-Meinung',
    does: 'Holt eine unabhängige zweite Meinung von Opus ein: zur letzten Frage, zu einem Plan oder zum Stand des Projekts.',
    checks: [
      'Der Subagent bekommt die Sache selbst, nicht die Schlussfolgerung der Session und keinen Gesprächsverlauf.',
      'Das Modell ist der Alias `opus` (eine volle Modell-ID wird vom Agent-Werkzeug abgelehnt).',
      'Keine Zeilengrenze, keine feste Gliederung, kein Leseverbot.',
    ],
    text: meinungPrompt,
  },
  {
    key: 'review',
    name: 'Review + PR',
    does: 'Prüft die Änderungen, committet sie und öffnet den Pull Request.',
    checks: [
      'Die Reihenfolge ist Review, Commit, PR.',
      'Kein Merge, kein Push auf den Basis-Branch, nie mit force.',
      'Geht ein Schritt nicht, hält die Session an und sagt, woran es liegt.',
    ],
    text: reviewPrompt,
  },
  {
    key: 'handoff',
    name: 'Handoff',
    does: 'Schreibt eine Übergabe für eine frische Session, zum Einfügen als erste Nachricht.',
    checks: [
      'Verlangt, was das Repository nicht verrät, und lässt Lesbares (Code, git log, CLAUDE.md) weg.',
      'Ändert und startet nichts.',
    ],
    text: handoffPrompt,
  },
  {
    key: 'merge',
    name: 'Merge',
    does: 'Mergt die offenen PRs in sinnvoller Reihenfolge und löst passende Issues mit, auch diese werden gemergt.',
    checks: [
      'Gemergt wird nur bei grünen Checks, auch bei den neuen Issue-PRs.',
      'Kein Force-Push, keine Änderung an der Historie des Hauptzweigs, keine Entwürfe.',
      'Was rot ist, eine Entscheidung braucht oder unklar bleibt, bleibt liegen und wird mit Grund genannt.',
    ],
    text: mergePrompt,
  },
  {
    key: 'pruefen',
    name: 'Prüfen (e2e)',
    does: 'Prüft die Änderung in vier Schritten: Qualität, Tests für den Diff, der echte Ablauf mit Playwright und, wo es einen Stack gibt, ein Blick in seine Logs.',
    checks: [
      'Die Reihenfolge ist Qualität, Tests, E2E, Stack.',
      'Playwright darf eingerichtet werden, und die Session sagt, was sie installiert hat.',
      'Kein Push, kein Merge, keine gelöschten oder abgeschwächten Tests; Snapshots werden gemeldet, nicht ungefragt erneuert.',
      'Der Stack wird nur gelesen.',
    ],
    text: pruefenPrompt,
  },
  {
    key: 'stack',
    name: 'Stack neu bauen',
    does: 'Baut den Docker-Stack des Projekts auf dem Stand des Ordners neu und prüft, dass er diesen Stand läuft. Der Knopf erscheint nur, wo eine Compose-Datei liegt.',
    checks: [
      'Vor dem Bauen wird geprüft, ob etwas Live-Scharfes aktiv ist; dann hält die Session an und fragt.',
      'Kein `down -v`, keine Volumes oder Daten gelöscht, keine fremden Container angefasst.',
      'Danach Health und Stand (SHA, Version oder Build-Zeit) geprüft.',
    ],
    text: stackPrompt,
  },
] as const

/**
 * The four prompts as one Markdown document, for a reviewer or an agent to read at a glance: what each
 * button does, what to check, and the text itself. `/projektfarbe prompts` prints it, and `docs/PROMPTS.md`
 * is its output, so the code stays the one source.
 */
export function promptsMarkdown(projekt = '{Projekt}'): string {
  const parts = PROMPT_INFO.map(info =>
    [
      `## ${info.name} (\`${info.key}\`)`,
      '',
      info.does,
      '',
      'Prüfen:',
      ...info.checks.map(check => `- ${check}`),
      '',
      '```text',
      info.text(projekt),
      '```',
    ].join('\n'),
  )

  return [
    '# Prompts hinter den Band-Knöpfen',
    '',
    'Jeder Knopf schickt der Session den Text als eigene Nachricht (`$.prompt.submit` mit `asUser`). `{Projekt}` steht für den Projektnamen. Die Texte stehen in `hooks/colors.ts`; diese Ausgabe kommt von `/projektfarbe prompts`.',
    '',
    parts.join('\n\n'),
    '',
  ].join('\n')
}

/** A color from a project's name, the same every time: used once every color of the set is taken. */
function hashFarbe(project: string, satz: Satz): Farbe {
  let hash = 0
  for (const ch of project.toLowerCase()) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  }

  return satz.farben[hash % satz.farben.length] ?? satz.farben[0]!
}

/** The color a project with none gets: the first no other project has, else one from its name. */
export function nextFarbe(
  project: string,
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): Farbe {
  const taken = new Set(Object.values(picks))
  const free = satz.reihenfolge
    .map(name => byName(satz, name))
    .find(f => f !== undefined && !taken.has(f.mark))

  return free ?? hashFarbe(project, satz)
}

/** The project's color: the stored one, else the one it would be handed now. */
export function farbeFor(
  project: string,
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): Farbe {
  const picked = picks[project.toLowerCase()]

  return (picked === undefined ? undefined : byMark(satz, picked)) ?? nextFarbe(project, picks, satz)
}

/** The picks with a color recorded for each project that has none yet, in the order given. */
export function assignFarben(
  projects: readonly string[],
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): Record<string, string> {
  const next: Record<string, string> = { ...picks }
  for (const project of projects) {
    const key = project.toLowerCase()
    if (next[key] === undefined || byMark(satz, next[key]) === undefined) {
      next[key] = nextFarbe(project, next, satz).mark
    }
  }

  return next
}

/** A color of the set from what the person typed: its name (grün, weiß and kreis-… work) or its mark. */
export function findFarbe(input: string, satz: Satz = BUNT): Farbe | undefined {
  const text = input.trim()

  return byName(satz, asciiName(text)) ?? satz.farben.find(f => text.startsWith(f.mark))
}

/** True when the title starts with this mark (a plain-text mark needs a space or the end after it). */
function carries(text: string, farbe: Farbe, satz: Satz): boolean {
  if (!text.startsWith(farbe.mark)) {
    return false
  }
  const after = text.charAt(farbe.mark.length)

  return !satz.strikt || after === '' || /\s/.test(after)
}

/** The color mark a title starts with, if any: of one set, or of any set when none is given. */
export function markOf(title: string, only?: Satz): Farbe | undefined {
  const text = title.trim()
  for (const satz of only === undefined ? SAETZE : [only]) {
    const found = satz.farben.find(f => carries(text, f, satz))
    if (found !== undefined) {
      return found
    }
  }

  return undefined
}

/** The title without color marks in front, whichever set they come from. */
export function stripMark(title: string): string {
  let text = title.trim()
  for (let farbe = markOf(text); farbe !== undefined; farbe = markOf(text)) {
    text = text.slice(farbe.mark.length).replace(/^️/, '').trim()
  }

  return text
}

/** The title with `mark` in front, or null while the app has not named the session yet. */
export function desiredTitle(title: string, mark: string): string | null {
  const bare = stripMark(title)
  if (PLATZHALTER.has(bare.toLowerCase())) {
    return null
  }

  return `${mark} ${bare}`
}

/** The person's picks for one set from the store, keeping only well-formed entries. */
export function readPicks(raw: unknown, satz: Satz = BUNT): Record<string, string> {
  const picks: Record<string, string> = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return picks
  }
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && byMark(satz, value) !== undefined) {
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
 * The colors the sidebar already shows: per project, the mark of this set most of
 * its sessions carry (the first seen on a tie). Sessions without one count for nothing.
 */
export function learnPicks(rows: readonly SessionRow[], satz: Satz = BUNT): Record<string, string> {
  const tally = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const project = projectOf(row.cwd)
    const farbe = markOf(row.title, satz)
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

export function planTitle(
  row: SessionRow,
  picks: Readonly<Record<string, string>>,
  satz: Satz = BUNT,
): TitlePlan {
  const project = projectOf(row.cwd)
  if (project === null) {
    return { kind: 'no-project' }
  }
  const wanted = desiredTitle(row.title, farbeFor(project, picks, satz).mark)
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

/** How many of the gauge's `width` cells are filled: in proportion to the percentage, at least one once there is any use. */
export function contextFill(percent: number, width: number = CONTEXT_CELLS): number {
  const cells = Math.round((percent / 100) * width)

  return Math.min(width, Math.max(percent > 0 ? 1 : 0, cells))
}

/**
 * The band's layouts, from the roomiest down. The actions are icons in all of them (what one does is
 * the hover card's to say). The one-row layouts: `icons` has the gauge with its word and full bar,
 * `kompakt` drops the word and shortens the bar, `dicht` moves the items closer together, `minimal`
 * keeps only the percentage of the gauge. `zwei` is the last resort: two rows, name and gauge above,
 * counts and icons below.
 */
export type BandStufe = 'icons' | 'kompakt' | 'dicht' | 'minimal' | 'zwei'

/** The gauge's bar in the compact layouts; the roomier ones keep the full `CONTEXT_CELLS`. */
export const COMPACT_CELLS = 4

/** What a one-row layout draws. */
export type BandForm = {
  /** The `columnGap` of its rows, in cells. */
  gap: number
  /** The gauge's bar in cells; null: the percentage alone. */
  bar: number | null
  /** The word "Kontext" before the bar. */
  hasWord: boolean
  /** A blank node before the gauge, which sets the gauge apart by a wider gap. */
  hasSpacer: boolean
}

export const BAND_FORMEN: Record<Exclude<BandStufe, 'zwei'>, BandForm> = {
  icons: { gap: 2, bar: CONTEXT_CELLS, hasWord: true, hasSpacer: true },
  kompakt: { gap: 2, bar: COMPACT_CELLS, hasWord: false, hasSpacer: true },
  dicht: { gap: 1, bar: COMPACT_CELLS, hasWord: false, hasSpacer: false },
  minimal: { gap: 1, bar: null, hasWord: false, hasSpacer: false },
}

/** What the band's width depends on, in characters. */
export type BandInhalt = {
  /** The project's name. */
  name: number
  /** What stands after `PRs:`: the blank, the number and any raised "+x" (` 12⁺¹`, ` ?`). */
  prs: number
  /** The same after `Issues:`. */
  issues: number
  /** The digits of the context percentage; null where there is no gauge. */
  percent: number | null
  /** True where the project has a Docker stack: one more action, the rebuild. */
  hasStack?: boolean
}

// The band's actions are drawn as vector icons where the surface has `Svg` (the desktop, not the
// terminal, which keeps the text glyphs). They are one family (the Docker logo is the one exception, and
// the written-out e2e has a width of its own), so they share height, weight and
// color: text glyphs next to them sat lower, smaller and darker. An `Svg` is an image and does not take
// the theme's text color, so the stroke is one mid gray that reads on the light and the dark theme alike.
// Line icons on a 24 grid.
export const ICON_SVG_COLOR = '#666c78'
/** The green of the check on the merge icon: mid-tone, like the gray, so it reads on both themes. */
export const ICON_SVG_OK = '#2ea35e'
/** Docker's own blue, for its logo: an image takes no theme color, and this one reads on both themes. */
export const DOCKER_BLUE = '#2496ED'
/** CSS pixels an icon is drawn at; the field around it is `ICON_BOX` cells. */
export const ICON_SVG_SIZE = 14
/** CSS pixels one cell of the band is wide on the desktop (a field of `ICON_BOX` cells measures about 23 px). */
export const CELL_PX = 7.75

const svgIcon = (inner: string, viewBox = '0 0 24 24'): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="${ICON_SVG_COLOR}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`

export const ICON_SVG = {
  // A doctoral cap with a spark: the independent second opinion.
  meinung: {
    alt: 'Opus-Meinung',
    source: svgIcon(
      '<path d="M2.5 11 11 7 19.5 11 11 15Z"/><path d="M6 13v4c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4"/><path d="M19.5 11v4"/><path d="M19 2.5v3.5M17.2 4.2h3.6"/>',
    ),
  },
  // A pull request under a magnifying glass: review the work, then open it.
  review: {
    alt: 'Review und Pull Request',
    source: svgIcon(
      '<circle cx="5" cy="5" r="2"/><circle cx="5" cy="14" r="2"/><path d="M5 7v5"/><path d="M13 10V8a3 3 0 0 0-3-3H8"/><path d="m9.6 3.4-1.6 1.6 1.6 1.6"/><circle cx="16" cy="16" r="4.5"/><path d="M19.3 19.3 22 22"/>',
    ),
  },
  // A letter in flight, speed lines behind it: the handoff to a fresh session.
  handoff: {
    alt: 'Handoff',
    source: svgIcon(
      '<g transform="rotate(-9 14.5 12)"><rect x="7.5" y="6.5" width="14.5" height="11" rx="2"/><path d="m8 8.5 6.8 5.2L21.5 8.5"/></g><path d="M2 9.5h3M1 12.5h4M2.5 15.5h2.5"/>',
    ),
  },
  // The Docker whale carrying its containers, with a green circular arrow: rebuild the stack. The logo is
  // the one exception to the gray line family: it is drawn as the original, filled in Docker's blue, and
  // wider than tall, so it has a size of its own. The band shows it only where a compose file lies.
  stack: {
    alt: 'Docker-Stack neu bauen',
    source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 780" fill="none">${[
      [297, 227],
      [419, 227],
      [543, 227],
      [665, 227],
      [789, 227],
      [419, 113],
      [543, 113],
      [665, 113],
      [665, 0],
    ]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="104" height="94" rx="8" fill="${DOCKER_BLUE}"/>`)
      .join(
        '',
      )}<path fill="${DOCKER_BLUE}" d="M243 340H903C925 340 955 335 978 323C955 290 950 250 960 212C968 182 980 160 996 138L1018 151C1052 170 1076 207 1082 254C1122 248 1175 250 1209 272L1216 278L1211 292C1200 325 1160 377 1060 378C1000 540 920 640 780 690C690 715 620 719 562 719C470 719 390 705 340 680C255 640 212 520 212 372C212 355 226 340 243 340Z"/><g transform="translate(1000 420) scale(14.17)" stroke="${ICON_SVG_OK}" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4.5M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4.5"/></g></svg>`,
    // The logo's own proportions (1350 by 780) at the height of the line icons' drawing.
    width: 18,
    height: 10.4,
  },
  // "e2e" written out, the 2 in the check's green: check the change, tests and the real flow in a browser.
  // Round letters with an open counter (narrow ones read as "0 2 0" at this size), so it is wider than the
  // square, as wide as its field takes: a size of its own.
  pruefen: {
    alt: 'Prüfen: Tests und e2e',
    source: svgIcon(
      `<path d="M2.125 12h10a5 5 0 1 0-1.46 3.54"/><path d="M15.275 9.6a3.6 3.6 0 1 1 6.72 1.8C21.2 14 17.8 15.8 15.275 18h7.2" stroke="${ICON_SVG_OK}"/><path d="M25.725 12h10a5 5 0 1 0-1.46 3.54"/>`,
      '0 0 37.9 24',
    ),
    // The viewBox's proportions (37.9 by 24) at the height of the drawing.
    width: 21,
    height: 13.3,
  },
  // A merge (two commits flowing into one) with a green check: the open pull requests, merged.
  merge: {
    alt: 'Offene PRs mergen',
    source: svgIcon(
      `<circle cx="5" cy="4.5" r="2"/><circle cx="5" cy="16.5" r="2"/><circle cx="14" cy="10.5" r="2"/><path d="M5 6.5v8"/><path d="M5 6.5v.5a3.5 3.5 0 0 0 3.5 3.5h3.5"/><path d="m12.5 17.5 3.2 3.2 6-6.7" stroke="${ICON_SVG_OK}" stroke-width="2.25"/>`,
    ),
  },
  // Three lines: the overview of all sessions.
  uebersicht: {
    alt: 'Übersicht',
    source: svgIcon('<path d="M3 3.5h18M3 12h18M3 20.5h18"/>'),
  },
  // A cogwheel: the settings (color, mode, hide the band).
  einstellungen: {
    alt: 'Einstellungen',
    source: svgIcon(
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    ),
  },
} as const satisfies Record<string, { alt: string; source: string; width?: number; height?: number }>

// An icon's field and the gap between two: three icons take as many cells as `ICON_BOX` and `ICON_GAP` say.
export const ICON_BOX = 3
export const ICON_GAP = 1
const BLOCK_CELLS = 2
// The band's actions: opinion, review + PR, handoff, (stack), check, merge at the left; overview, settings at the right.
export const ACTION_COUNT = 7
// The merge action also shows the number of open pull requests next to its icon: its field is this many
// cells wider.
export const MERGE_EXTRA = 1
// The overview and the settings stand at the right edge, beside the gauge; the other actions stand left.
export const SETTING_COUNT = 2
// The shortest a name is cut to before the band lets the row run over instead.
const NAME_MIN = 8

/** What the band's widths are measured in: the cells a character, a gap and a node take on a surface. */
type Metrics = {
  /** Cells per character of plain text and of the bold name. */
  text: number
  name: number
  /** Cells of the gap `columnGap: 2` and `columnGap: 1` draw, and of the gap between two icon fields. */
  gap: number
  gapTight: number
  iconGap: number
  /** The blank node before the gauge. */
  spacer: number
  /** How far the room a row really has reaches past `bodyColumns`. */
  slack: number
}

// Measured on the desktop (the one-row band, in cells of 7.75 px): the text is set in a proportional
// font, so a character takes less than a cell, the bold name a little more; the gap between the items
// is about 22 px (`gap: 2`) or 15 px (`gap: 1`), and the blank
// spacer before the gauge takes no room of its own. The gauge's bar is a run of blanks on a background:
// exact cells. The band's padding is less than the engine's marks at its right end, hence the slack.
const DESKTOP: Metrics = {
  text: 0.83,
  name: 0.89,
  gap: 2.85,
  gapTight: 1.85,
  iconGap: 1.5,
  spacer: 0,
  slack: 0.5,
}

// On the terminal a character is one cell and a gap is what `columnGap` says; the spacer is its four blanks.
const TERMINAL: Metrics = {
  text: 1,
  name: 1,
  gap: 2,
  gapTight: 1,
  iconGap: ICON_GAP,
  spacer: 4,
  slack: 0,
}

/**
 * The cells a layout takes in one row (`isMono`: on the terminal, not the desktop); `zwei` has no
 * one-row width and answers Infinity. The row has two parts, spread to its two ends: the project with
 * the counts and the gauge at the left, the actions at the right; the gap between them is the least it
 * keeps.
 */
export function bandBreite(stufe: BandStufe, inhalt: BandInhalt, isMono = false): number {
  if (stufe === 'zwei') {
    return Number.POSITIVE_INFINITY
  }
  const m = isMono ? TERMINAL : DESKTOP
  const form = BAND_FORMEN[stufe]
  const gapCells = form.gap === 1 ? m.gapTight : m.gap
  // Left part: the project, the session actions, the counts. Right part: the gauge (with the blank spacer
  // before it), the overview and the settings. Each node has a gap to the next; the two parts keep one
  // gap between them.
  const total = ACTION_COUNT + (inhalt.hasStack === true ? 1 : 0)
  const group = (n: number, extra = 0): number => n * ICON_BOX + extra + (n - 1) * m.iconGap
  const left = [
    BLOCK_CELLS + (1 + inhalt.name) * m.name,
    group(total - SETTING_COUNT, MERGE_EXTRA),
    (4 + inhalt.prs) * m.text,
    (7 + inhalt.issues) * m.text,
  ]
  const right = [group(SETTING_COUNT)]
  if (inhalt.percent !== null) {
    // " 8 %" after a bar, "8 %" alone.
    const percent = (inhalt.percent + (form.bar === null ? 2 : 3)) * m.text
    right.unshift((form.hasWord ? 8 * m.text : 0) + (form.bar ?? 0) + percent)
    // The blank spacer before the gauge is a node of its own, with a gap on each side.
    if (form.hasSpacer) {
      right.unshift(m.spacer)
    }
  }
  const nodes = [...left, ...right]

  return nodes.reduce((sum, cells) => sum + cells, 0) + (left.length - 1 + right.length - 1 + 1) * gapCells
}

// Going back to a roomier layout than the one drawn last takes this many cells more than fitting does,
// so a window settled again and again along a threshold does not flip the band back and forth. Small: a
// window at rest must show the roomiest layout that fits.
const HYSTERESIS_CELLS = 1

/** The one-row layouts, the roomiest first. */
export const EINZEILER: readonly Exclude<BandStufe, 'zwei'>[] = ['icons', 'kompakt', 'dicht', 'minimal']

const STUFEN: readonly BandStufe[] = [...EINZEILER, 'zwei']

/**
 * The roomiest layout that fits `columns` cells in one row; `zwei` when none does. `previous`, the
 * layout drawn last, holds the band in it until the room for a roomier one is clear.
 */
export function bandStufe(
  columns: number,
  inhalt: BandInhalt,
  previous: BandStufe | null = null,
  isMono = false,
): BandStufe {
  const last = previous === null ? -1 : STUFEN.indexOf(previous)
  const room = columns + (isMono ? TERMINAL : DESKTOP).slack

  return (
    EINZEILER.find((stufe, rank) => {
      const bias = last > rank ? HYSTERESIS_CELLS : 0

      return bandBreite(stufe, inhalt, isMono) <= room - bias
    }) ?? 'zwei'
  )
}

/** How many characters of the name fit the first row of `zwei`, beside the block and the gauge. */
export function nameBudget(columns: number, inhalt: BandInhalt, isMono = false): number {
  const m = isMono ? TERMINAL : DESKTOP
  const gauge = inhalt.percent === null ? 0 : m.gapTight + COMPACT_CELLS + (inhalt.percent + 3) * m.text

  // The counts stand in the first row beside the name, a tight gap apart.
  const counts = 2 * m.gapTight + (4 + inhalt.prs + 7 + inhalt.issues) * m.text

  return Math.max(NAME_MIN, Math.floor((columns - BLOCK_CELLS - m.name - gauge - counts) / m.name))
}

/** The name cut to `max` characters with an ellipsis; as it is when it fits. */
export function shortName(name: string, max: number): string {
  const chars = [...name]

  return chars.length <= max ? name : `${chars.slice(0, Math.max(1, max - 1)).join('')}…`
}

/** The band counts open pull requests up to this number; more than that shows as "100+". */
export const PR_LIMIT = 100

/** The numbers in the JSON `gh pr list` / `gh issue list --json number` prints; null when it is no list. */
export function ghNumbers(stdout: string): number[] | null {
  try {
    const list: unknown = JSON.parse(stdout)
    if (!Array.isArray(list)) {
      return null
    }

    return list
      .map(entry => (entry !== null && typeof entry === 'object' ? (entry as { number?: unknown }).number : undefined))
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  } catch {
    return null
  }
}

/** The count as the band shows it. */
export function prLabel(count: number): string {
  return count > PR_LIMIT ? `${PR_LIMIT}+` : String(count)
}

/** What the band counts for a repository: its pull requests and its issues. */
export type Art = 'pr' | 'issue'

/**
 * The highest number seen of each kind, per repository folder (`repoKeyOf`), from the store key
 * `gesehen`; entries of older versions are keyed by project name (see `seenFor`).
 */
export type Gesehen = Record<string, Partial<Record<Art, number>>>

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** How many new entries there are, as small raised digits (`⁺²`); empty for none. */
export function superscript(count: number): string {
  if (count <= 0) {
    return ''
  }
  const digits = [...String(Math.floor(count))].map(d => SUPERSCRIPT[Number(d)]).join('')

  return `⁺${digits}`
}

/** A count label (`3`, `100+`) as small raised characters (`³`, `¹⁰⁰⁺`). */
export function raised(label: string): string {
  return [...label].map(c => (c === '+' ? '⁺' : /\d/.test(c) ? SUPERSCRIPT[Number(c)] : c)).join('')
}

/** The highest seen numbers from the store; anything that is not a number is left out. */
export function readSeen(raw: unknown): Gesehen {
  const seen: Gesehen = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return seen
  }
  for (const [project, value] of Object.entries(raw)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      continue
    }
    const entry: Partial<Record<Art, number>> = {}
    for (const art of ['pr', 'issue'] as const) {
      const n = (value as Record<string, unknown>)[art]
      if (typeof n === 'number' && Number.isFinite(n)) {
        entry[art] = n
      }
    }
    seen[project.toLowerCase()] = entry
  }

  return seen
}

/** How many of these open numbers are newer than the highest one seen; none while nothing was seen. */
export function newCount(numbers: readonly number[], seenMax: number | undefined): number {
  return seenMax === undefined ? 0 : numbers.filter(n => n > seenMax).length
}

/**
 * What was seen in one repository. `key` is the repository's folder (`repoKeyOf`); `legacyKey`, its
 * project name, is where versions before it kept the entry: it still counts until the repository
 * has one of its own, so updating shows no "+x" that was already seen.
 */
export function seenFor(seen: Gesehen, key: string, legacyKey?: string): Partial<Record<Art, number>> {
  const legacy = legacyKey === undefined ? undefined : seen[legacyKey.toLowerCase()]

  return { ...legacy, ...seen[key.toLowerCase()] }
}

/**
 * Marks these open numbers as seen for a repository (`key`, see `seenFor`). With `isFirstOnly`,
 * only where nothing was seen yet: the first reading is the baseline, so it shows no "+x". The
 * highest seen never goes down. Returns the same object when nothing changed.
 */
export function markSeen(
  seen: Gesehen,
  key: string,
  art: Art,
  numbers: readonly number[],
  isFirstOnly: boolean,
  legacyKey?: string,
): Gesehen {
  const own = key.toLowerCase()
  const known = seenFor(seen, own, legacyKey)
  const before = known[art]
  if (isFirstOnly && before !== undefined) {
    return seen
  }
  const after = Math.max(before ?? 0, ...numbers)
  if (after === seen[own]?.[art]) {
    return seen
  }

  return { ...seen, [own]: { ...known, [art]: after } }
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

/** Why a session's last own turn ended, as `turn.complete` reports it. */
export type Grund = 'answer' | 'aborted' | 'refusal' | 'error'

/** A session's last own turn: why it ended and when (`$.clock.now()`), from the store key `stand`. */
export type StandEintrag = { grund: Grund; um: number }

const GRUENDE: readonly Grund[] = ['answer', 'aborted', 'refusal', 'error']
const STAND_LIMIT = 300

/** Each session's last turn, by session id, from the store; malformed entries are left out. */
export function readStand(raw: unknown): Record<string, StandEintrag> {
  const stand: Record<string, StandEintrag> = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return stand
  }
  for (const [id, value] of Object.entries(raw)) {
    if (value === null || typeof value !== 'object') {
      continue
    }
    const { grund, um } = value as Record<string, unknown>
    if (GRUENDE.includes(grund as Grund) && typeof um === 'number' && Number.isFinite(um)) {
      stand[id] = { grund: grund as Grund, um }
    }
  }

  return stand
}

/** Records one session's last turn, newest last, keeping the newest 300 sessions. */
export function rememberStand(
  stand: Readonly<Record<string, StandEintrag>>,
  sessionId: string,
  eintrag: StandEintrag,
): Record<string, StandEintrag> {
  const entries = Object.entries(stand).filter(([id]) => id !== sessionId)
  entries.push([sessionId, eintrag])

  return Object.fromEntries(entries.slice(-STAND_LIMIT))
}

export type PrState = 'OPEN' | 'MERGED' | 'CLOSED'

const isPrState = (value: unknown): value is PrState =>
  value === 'OPEN' || value === 'MERGED' || value === 'CLOSED'

/** A session as `list_sessions` lists it, with what its status is read from. */
export type ListedSession = SessionRow & {
  branch: string | null
  isRunning: boolean
  isArchived: boolean
  /** Milliseconds since the epoch; null when the app gave none. */
  lastActivityAt: number | null
  /** The pull request the app itself links to the session, when it names one (`prNumber`, `prState`). */
  appPr: { number: number; state: PrState } | null
  /** The app's `claude://` address of the session, which opens it; null when the app gave none. */
  link: string | null
}

/** One session from a list_sessions or get_session entry, or null when a needed field is missing. */
export function toListed(raw: unknown, fallbackId?: string): ListedSession | null {
  const row = toRow(raw, fallbackId)
  if (row === null) {
    return null
  }
  const entry = raw as Record<string, unknown>
  const at = typeof entry.lastActivityAt === 'string' ? Date.parse(entry.lastActivityAt) : Number.NaN

  return {
    ...row,
    branch: typeof entry.branch === 'string' && entry.branch !== '' ? entry.branch : null,
    isRunning: entry.isRunning === true,
    isArchived: entry.isArchived === true,
    lastActivityAt: Number.isFinite(at) ? at : null,
    appPr:
      typeof entry.prNumber === 'number' && isPrState(entry.prState)
        ? { number: entry.prNumber, state: entry.prState }
        : null,
    link: typeof entry.link === 'string' && /^claude:\/\/[\w.~\/-]+$/.test(entry.link) ? entry.link : null,
  }
}

/** A pull request as `gh pr list --json number,state,headRefName,isDraft,reviewDecision,statusCheckRollup` prints it. */
export type GhPr = {
  number: number
  state: PrState
  headRefName: string
  isDraft: boolean
  /** `REVIEW_REQUIRED`, `CHANGES_REQUESTED`, `APPROVED`, or null when the repository asks for none. */
  reviewDecision: string | null
  /** True when a check failed. */
  isCiRed: boolean
}

/**
 * Conclusions (check runs) and states (commit statuses) that make the CI red. Not CANCELLED: a
 * workflow that cancels its older run on a new push leaves that run in the rollup while CI is green.
 */
const CI_ROT = new Set(['FAILURE', 'ERROR', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE'])

function ciRed(rollup: unknown): boolean {
  if (!Array.isArray(rollup)) {
    return false
  }

  return rollup.some(check => {
    if (check === null || typeof check !== 'object') {
      return false
    }
    const { conclusion, state } = check as Record<string, unknown>

    return CI_ROT.has(String(conclusion ?? '')) || CI_ROT.has(String(state ?? ''))
  })
}

/** The pull requests in what `gh pr list --json …` printed; null when it is no list. */
export function ghPrs(stdout: string): GhPr[] | null {
  let list: unknown
  try {
    list = JSON.parse(stdout)
  } catch {
    return null
  }
  if (!Array.isArray(list)) {
    return null
  }
  const prs: GhPr[] = []
  for (const raw of list) {
    if (raw === null || typeof raw !== 'object') {
      continue
    }
    const entry = raw as Record<string, unknown>
    if (typeof entry.number !== 'number' || !isPrState(entry.state) || typeof entry.headRefName !== 'string') {
      continue
    }
    prs.push({
      number: entry.number,
      state: entry.state,
      headRefName: entry.headRefName,
      isDraft: entry.isDraft === true,
      reviewDecision:
        typeof entry.reviewDecision === 'string' && entry.reviewDecision !== '' ? entry.reviewDecision : null,
      isCiRed: ciRed(entry.statusCheckRollup),
    })
  }

  return prs
}

/**
 * One list from two gh readings: the open pull requests with their checks, review and draft, and
 * all pull requests with number, state and branch only (cheap). An open one's full entry wins;
 * null when neither could be read.
 */
export function mergePrs(open: readonly GhPr[] | null, all: readonly GhPr[] | null): GhPr[] | null {
  if (open === null && all === null) {
    return null
  }
  const byNumber = new Map<number, GhPr>()
  for (const pr of all ?? []) {
    byNumber.set(pr.number, pr)
  }
  for (const pr of open ?? []) {
    byNumber.set(pr.number, pr)
  }

  return [...byNumber.values()].sort((a, b) => b.number - a.number)
}

// The CI of the session's branch, the band's bottom row: the jobs of the pushed head, counted green, red,
// running and waiting, and how far the running one is. GitHub gives no log of a running job, so the
// percentage is read off the log of that job's last green run: the `[ NN%]` lines pytest prints, against
// the seconds since their step started. Without such lines it is the share of the last green run's time.

/** Where a job stands. */
export type CiArt = 'gruen' | 'rot' | 'laeuft' | 'wartet' | 'abgebrochen' | 'uebersprungen'

/** A job's place from GitHub's status and conclusion (GraphQL spells them in capitals, REST in small letters). */
export function ciArt(status: string, conclusion: string | null): CiArt {
  const s = status.toUpperCase()
  if (s !== 'COMPLETED') {
    return s === 'IN_PROGRESS' ? 'laeuft' : 'wartet'
  }
  const c = (conclusion ?? '').toUpperCase()
  if (c === 'SUCCESS') {
    return 'gruen'
  }
  if (CI_ROT.has(c)) {
    return 'rot'
  }
  // Cancelled is no red CI: a newer push cancels the older run (see `CI_ROT`).
  return c === 'CANCELLED' || c === 'STALE' ? 'abgebrochen' : 'uebersprungen'
}

/** A step of a job; times in ms, null before it started or ended. */
export type CiSchritt = { name: string; isFertig: boolean; startedAt: number | null; completedAt: number | null }

/** A job (a check run of GitHub Actions) of the head commit. */
export type CiJob = {
  name: string
  art: CiArt
  startedAt: number | null
  completedAt: number | null
  /** The workflow's id and the run's event: where the last green run of this job is looked up. */
  workflowId: number | null
  event: string
  schritte: CiSchritt[]
}

/** What the head commit's CI is, from one GraphQL query (`CI_QUERY`). */
export type CiCommit = {
  /** The commit's pull request, an open one first. */
  pr: { number: number; url: string } | null
  /** The run to open: the one with a red job, else a running one, else one that ran a job. */
  runUrl: string | null
  jobs: CiJob[]
  /** Workflow runs that started but list no job yet. */
  wartendeLaeufe: number
  /** True where the commit has a workflow run at all; without one the band shows no CI row. */
  hasLaeufe: boolean
  /** True when every run of the commit is done. */
  isFertig: boolean
}

/**
 * The query the band asks once per poll, for the pushed head (`$sha`). Only GitHub Actions' suites
 * (app 15368): other apps leave suites on a commit that stay queued forever and would hold the row at
 * "running". `LATEST` counts a re-run job once. It costs 3 points of the GraphQL budget.
 */
export const CI_QUERY = `query($owner: String!, $name: String!, $sha: GitObjectID!) {
  repository(owner: $owner, name: $name) {
    object(oid: $sha) {
      ... on Commit {
        associatedPullRequests(first: 3) { nodes { number url state } }
        checkSuites(first: 5, filterBy: { appId: 15368 }) {
          nodes {
            status
            workflowRun { event url workflow { databaseId } }
            checkRuns(first: 50, filterBy: { checkType: LATEST }) {
              nodes {
                name status conclusion startedAt completedAt
                steps(first: 60) { nodes { name status startedAt completedAt } }
              }
            }
          }
        }
      }
    }
  }
}`

const rec = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const nodesOf = (connection: unknown): Record<string, unknown>[] => {
  const list = rec(connection)?.nodes

  return Array.isArray(list) ? list.map(rec).filter((node): node is Record<string, unknown> => node !== null) : []
}

const zeitOf = (value: unknown): number | null => {
  const ms = typeof value === 'string' && value !== '' ? Date.parse(value) : Number.NaN

  return Number.isFinite(ms) ? ms : null
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The head commit's CI in what `gh api graphql` printed for `CI_QUERY`; null when it is not that. */
export function ciCommitOf(stdout: string): CiCommit | null {
  let raw: unknown
  try {
    raw = JSON.parse(stdout)
  } catch {
    return null
  }
  const repository = rec(rec(rec(raw)?.data)?.repository)
  if (repository === null) {
    return null
  }
  const commit = rec(repository.object)
  if (commit === null) {
    // The commit is not on GitHub (yet): no CI.
    return { pr: null, runUrl: null, jobs: [], wartendeLaeufe: 0, hasLaeufe: false, isFertig: true }
  }
  const prs = nodesOf(commit.associatedPullRequests).filter(pr => typeof pr.number === 'number')
  const pr = prs.find(one => one.state === 'OPEN') ?? prs[0]
  const jobs: CiJob[] = []
  const urls: { url: string; arten: CiArt[] }[] = []
  let wartendeLaeufe = 0
  let hasLaeufe = false
  let isFertig = true
  for (const suite of nodesOf(commit.checkSuites)) {
    const run = rec(suite.workflowRun)
    if (run === null) {
      continue
    }
    hasLaeufe = true
    const isSuiteFertig = suite.status === 'COMPLETED'
    isFertig &&= isSuiteFertig
    const runs = nodesOf(suite.checkRuns)
    if (runs.length === 0) {
      wartendeLaeufe += isSuiteFertig ? 0 : 1
      continue
    }
    const workflowId = rec(run.workflow)?.databaseId
    const arten: CiArt[] = []
    for (const job of runs) {
      const art = ciArt(textOf(job.status), typeof job.conclusion === 'string' ? job.conclusion : null)
      arten.push(art)
      jobs.push({
        name: textOf(job.name),
        art,
        startedAt: zeitOf(job.startedAt),
        completedAt: zeitOf(job.completedAt),
        workflowId: typeof workflowId === 'number' ? workflowId : null,
        event: textOf(run.event),
        schritte: nodesOf(job.steps).map(step => ({
          name: textOf(step.name),
          isFertig: step.status === 'COMPLETED',
          startedAt: zeitOf(step.startedAt),
          completedAt: zeitOf(step.completedAt),
        })),
      })
    }
    if (typeof run.url === 'string') {
      urls.push({ url: run.url, arten })
    }
  }
  const runUrl =
    urls.find(u => u.arten.includes('rot')) ??
    urls.find(u => u.arten.includes('laeuft')) ??
    urls.find(u => u.arten.some(art => art !== 'uebersprungen')) ??
    urls[0]

  return {
    pr: pr === undefined ? null : { number: pr.number as number, url: textOf(pr.url) },
    runUrl: runUrl?.url ?? null,
    jobs,
    wartendeLaeufe,
    hasLaeufe,
    isFertig: isFertig && wartendeLaeufe === 0,
  }
}

/** pytest's progress over a step: seconds since the step started → percent, rising. */
export type CiKurve = { schritt: string; punkte: [number, number][] }

/** What a running job is measured against: its last green run's length and, where pytest ran, its curve. */
export type CiVorlage = { dauerSek: number; kurve: CiKurve | null }

// A log line of pytest's progress: `2026-10-28T14:25:26.38Z ........ [ 35%]`.
const FORTSCHRITT = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z) .*\[\s*(\d{1,3})%\]$/

/**
 * pytest's curve in a finished job's log: the step its first `[ NN%]` line falls in, and from each line
 * of it the seconds since that step began and the percent. Null without such lines.
 */
export function ciKurve(log: string, schritte: readonly CiSchritt[]): CiKurve | null {
  let schritt: CiSchritt | undefined
  const punkte: [number, number][] = []
  for (const line of log.split('\n')) {
    const match = FORTSCHRITT.exec(line.trimEnd())
    if (match === null) {
      continue
    }
    const t = Date.parse(match[1] ?? '')
    const prozent = Number(match[2])
    // Step times are whole seconds: a line may stand up to a second past its step's end.
    const isIn = (s: CiSchritt): boolean =>
      s.startedAt !== null && s.completedAt !== null && s.startedAt <= t && t < s.completedAt + 1000
    if (schritt === undefined) {
      schritt = schritte.find(isIn)
      if (schritt === undefined) {
        return null
      }
    } else if (!isIn(schritt)) {
      break
    }
    const letzter = punkte[punkte.length - 1]
    if (letzter === undefined || prozent > letzter[1]) {
      punkte.push([Math.max(0, (t - (schritt.startedAt as number)) / 1000), prozent])
    }
  }

  return schritt === undefined || punkte.length < 2 ? null : { schritt: schritt.name, punkte }
}

/** The percent on the curve after `sek` seconds of its step, from 0 at its start, linear in between. */
export function kurveBei(kurve: CiKurve, sek: number): number {
  let [x0, y0] = [0, 0]
  for (const [x, y] of kurve.punkte) {
    if (sek <= x) {
      return x === x0 ? y : y0 + ((y - y0) * (sek - x0)) / (x - x0)
    }
    ;[x0, y0] = [x, y]
  }

  return y0
}

/** The run ids in what `gh api …/actions/workflows/<id>/runs` printed; empty when it is not that. */
export function ghLaeufe(stdout: string): number[] {
  try {
    const runs = rec(JSON.parse(stdout))?.workflow_runs

    return Array.isArray(runs)
      ? runs.map(run => rec(run)?.id).filter((id): id is number => typeof id === 'number')
      : []
  } catch {
    return []
  }
}

/**
 * The green job of this name in what `gh api …/actions/runs/<id>/jobs` printed: its id, its length and
 * its steps; null when the run has none.
 */
export function ghJobVorlage(
  stdout: string,
  name: string,
): { jobId: number; dauerSek: number; schritte: CiSchritt[] } | null {
  let raw: unknown
  try {
    raw = JSON.parse(stdout)
  } catch {
    return null
  }
  const jobs = rec(raw)?.jobs
  if (!Array.isArray(jobs)) {
    return null
  }
  for (const entry of jobs) {
    const job = rec(entry)
    if (job === null || job.name !== name || job.conclusion !== 'success' || typeof job.id !== 'number') {
      continue
    }
    const start = zeitOf(job.started_at)
    const ende = zeitOf(job.completed_at)
    const steps = Array.isArray(job.steps) ? job.steps.map(rec) : []
    if (start === null || ende === null || ende <= start || steps.length === 0) {
      continue
    }

    return {
      jobId: job.id,
      dauerSek: (ende - start) / 1000,
      schritte: steps
        .filter((step): step is Record<string, unknown> => step !== null)
        .map(step => ({
          name: textOf(step.name),
          isFertig: true,
          startedAt: zeitOf(step.started_at),
          completedAt: zeitOf(step.completed_at),
        })),
    }
  }

  return null
}

/** Where its baseline is kept: one per workflow, event and job name. */
export const vorlageKey = (job: CiJob): string => `${job.workflowId ?? '?'}|${job.event}|${job.name}`

/** How far a running job is and how long it still needs; what the percent was read from. */
export type CiFortschritt = { prozent: number | null; restSek: number | null; quelle: 'log' | 'zeit' | null }

/**
 * A running job's progress against its baseline: pytest's percent while the step of the curve runs,
 * else the share of the last green run's time; never 100 while it runs.
 */
export function jobFortschritt(job: CiJob, vorlage: CiVorlage | null, now: number): CiFortschritt {
  if (job.art !== 'laeuft' || job.startedAt === null || vorlage === null || vorlage.dauerSek <= 0) {
    return { prozent: null, restSek: null, quelle: null }
  }
  const sek = Math.max(0, (now - job.startedAt) / 1000)
  const restSek = Math.max(0, Math.round(vorlage.dauerSek - sek))
  const kurve = vorlage.kurve
  const schritt =
    kurve === null ? undefined : job.schritte.find(s => s.name === kurve.schritt && !s.isFertig && s.startedAt !== null)
  if (kurve !== null && schritt !== undefined) {
    const imSchritt = Math.max(0, (now - (schritt.startedAt as number)) / 1000)

    return { prozent: Math.min(99, Math.floor(kurveBei(kurve, imSchritt))), restSek, quelle: 'log' }
  }

  return { prozent: Math.min(99, Math.floor((sek / vorlage.dauerSek) * 100)), restSek, quelle: 'zeit' }
}

/** A job's name without what its parentheses add: "Backend (pytest + ruff)" → "Backend". */
export function ciKurzName(name: string): string {
  const cut = name.indexOf(' (')

  return cut > 0 ? name.slice(0, cut) : name
}

/** What the band's CI row shows, worked out when the CI is read, since drawing only reads. */
export type CiAnzeige = {
  gruen: number
  rot: number
  laeuft: number
  wartet: number
  abgebrochen: number
  /** The red jobs' full names. */
  rotNamen: string[]
  /** The running job that needs longest. */
  haupt: { name: string; prozent: number | null; quelle: CiFortschritt['quelle'] } | null
  /** How long the slowest running job still needs; null where no baseline says. */
  restSek: number | null
  isFertig: boolean
  /** Where the row leads: the pull request's checks, else the run. */
  url: string | null
}

/** The row's data from the head's CI and the baselines; null where the head has no workflow run. */
export function ciAnzeige(
  commit: CiCommit,
  vorlageOf: (job: CiJob) => CiVorlage | null,
  now: number,
): CiAnzeige | null {
  if (!commit.hasLaeufe) {
    return null
  }
  const zahl = (art: CiArt): number => commit.jobs.filter(job => job.art === art).length
  let haupt: CiAnzeige['haupt'] = null
  let restSek: number | null = null
  for (const job of commit.jobs.filter(one => one.art === 'laeuft')) {
    const fortschritt = jobFortschritt(job, vorlageOf(job), now)
    if (haupt === null || (fortschritt.restSek ?? -1) > (restSek ?? -1)) {
      haupt = { name: job.name, prozent: fortschritt.prozent, quelle: fortschritt.quelle }
      restSek = fortschritt.restSek
    }
  }

  return {
    gruen: zahl('gruen'),
    rot: zahl('rot'),
    laeuft: zahl('laeuft'),
    wartet: zahl('wartet') + commit.wartendeLaeufe,
    abgebrochen: zahl('abgebrochen'),
    rotNamen: commit.jobs.filter(job => job.art === 'rot').map(job => job.name),
    haupt,
    restSek,
    isFertig: commit.isFertig,
    url: commit.pr === null || commit.pr.url === '' ? commit.runUrl : `${commit.pr.url}/checks`,
  }
}

/** The row's tone: red once a job failed, running while one runs or waits, else green. */
export type CiTon = 'gruen' | 'rot' | 'laeuft' | 'leise'

/** One part of the row: its key, its text (no break inside), its tone and what its hover says. */
export type CiTeil = { key: string; text: string; ton: CiTon; hint: string | null }

/** `voll` names the jobs; `kurz` keeps symbols and numbers. */
export type CiForm = 'voll' | 'kurz'

// A blank that does not break: a part of the row never splits over two lines.
const NBSP_CI = String.fromCharCode(0xa0)
const nb = (...parts: string[]): string => parts.join(NBSP_CI)

/** "~3 Min", or "<1 Min" for the last minute. */
export function restText(sek: number): string {
  return sek < 60 ? nb('<1', 'Min') : nb(`~${Math.ceil(sek / 60)}`, 'Min')
}

/** The tone of the whole row, which the word "CI" takes. */
export function ciTon(a: CiAnzeige): CiTon {
  return a.rot > 0 ? 'rot' : a.laeuft + a.wartet > 0 || !a.isFertig ? 'laeuft' : 'gruen'
}

const QUELLE: Record<'log' | 'zeit', string> = {
  log: 'Fortschritt laut Log des letzten grünen Laufs',
  zeit: 'geschätzt aus der Dauer des letzten grünen Laufs',
}

/** The row's parts after the word "CI", in order: green, red, running, waiting, cancelled. */
export function ciTeile(a: CiAnzeige, form: CiForm): CiTeil[] {
  const isVoll = form === 'voll'
  const teile: CiTeil[] = []
  if (a.gruen > 0) {
    const isAllesGruen = a.isFertig && a.rot === 0 && a.laeuft + a.wartet === 0
    teile.push({
      key: 'ci-gruen',
      text: isAllesGruen && isVoll ? nb('✓', String(a.gruen), 'grün') : nb('✓', String(a.gruen)),
      ton: 'gruen',
      hint: null,
    })
  }
  if (a.rot > 0) {
    const namen = a.rotNamen.map(ciKurzName)
    const mehr = namen.length > 2 ? `,${NBSP_CI}+${namen.length - 2}` : ''
    teile.push({
      key: 'ci-rot',
      text: isVoll ? nb('✕', String(a.rot), `${namen.slice(0, 2).join(`,${NBSP_CI}`)}${mehr}`) : nb('✕', String(a.rot)),
      ton: 'rot',
      hint: `Rot: ${a.rotNamen.join(', ')}`,
    })
  }
  if (a.laeuft > 0 && a.haupt !== null) {
    const { haupt } = a
    const stand = haupt.prozent === null ? 'läuft' : nb(String(haupt.prozent), '%')
    const andere = a.laeuft > 1 ? [`+${a.laeuft - 1}`] : []
    const rest = a.restSek === null || a.restSek === 0 ? [] : [isVoll ? nb('·', restText(a.restSek)) : restText(a.restSek)]
    teile.push({
      key: 'ci-laeuft',
      text: isVoll
        ? nb('◔', ciKurzName(haupt.name), stand, ...andere, ...rest)
        : nb('◔', haupt.prozent === null ? String(a.laeuft) : stand, ...rest),
      ton: 'laeuft',
      hint: `${haupt.name}: ${haupt.quelle === null ? 'noch kein grüner Lauf zum Vergleich' : QUELLE[haupt.quelle]}`,
    })
  }
  if (a.wartet > 0) {
    teile.push({
      key: 'ci-wartet',
      text: isVoll ? nb('○', String(a.wartet), 'wartet') : nb('○', String(a.wartet)),
      ton: 'leise',
      hint: null,
    })
  }
  if (a.abgebrochen > 0) {
    teile.push({
      key: 'ci-abgebrochen',
      text: isVoll ? nb('⊘', String(a.abgebrochen), 'abgebrochen') : nb('⊘', String(a.abgebrochen)),
      ton: 'leise',
      hint: null,
    })
  }
  if (teile.length === 0) {
    // Runs that list no job yet, or only skipped ones.
    teile.push({ key: 'ci-wartet', text: a.isFertig ? 'nichts gelaufen' : nb('○', 'startet'), ton: 'leise', hint: null })
  }

  return teile
}

/** The cells the row takes: the word "CI" and its parts, `columnGap` 2 apart. */
export function ciBreite(teile: readonly CiTeil[], isMono = false): number {
  const m = isMono ? TERMINAL : DESKTOP
  const zeichen = teile.reduce((sum, teil) => sum + [...teil.text].length, 2)

  return zeichen * m.text + teile.length * m.gap
}

/** The fuller form where it fits the band's width, else the short one. */
export function ciForm(columns: number, a: CiAnzeige, isMono = false): CiForm {
  const m = isMono ? TERMINAL : DESKTOP

  return ciBreite(ciTeile(a, 'voll'), isMono) <= columns + m.slack ? 'voll' : 'kurz'
}

/** The row as plain text, for `/projektfarbe`. */
export function ciText(a: CiAnzeige): string {
  return `CI: ${ciTeile(a, 'voll')
    .map(teil => teil.text.split(NBSP_CI).join(' '))
    .join(' · ')}`
}

export type StatusArt =
  | 'laeuft'
  | 'abgebrochen'
  | 'fehler'
  | 'pr-offen'
  | 'pr-gemerged'
  | 'pr-geschlossen'
  | 'in-arbeit'
  | 'ruht'

/** Where a session stands: its sign, a German label, and `rang` (lower first: what needs the person). */
export type Status = {
  art: StatusArt
  mark: string
  label: string
  rang: number
  /** The pull request the status names, if any. */
  pr: number | null
  /** For a resting session: the whole days since it was last active; null otherwise. */
  tage: number | null
}

/** A session with no activity for longer than this rests: a candidate to archive. */
export const RUHT_AB_MS = 3 * 24 * 60 * 60_000
const TAG_MS = 24 * 60 * 60_000

type SessionPr = { number: number; state: PrState; zusatz: string[]; isUrgent: boolean }

/**
 * The session's pull request. The one the app names comes first, with its number and state;
 * `gh` adds what it waits for (CI, review, draft). Without one from the app, the newest
 * `gh` lists for the session's branch.
 */
function prFor(session: ListedSession, prs: readonly GhPr[] | null): SessionPr | null {
  const listed = prs ?? []
  const app = session.appPr
  const own =
    app !== null
      ? listed.find(pr => pr.number === app.number)
      : listed
          .filter(pr => session.branch !== null && pr.headRefName === session.branch)
          .sort((a, b) => b.number - a.number)[0]
  const number = app?.number ?? own?.number
  const state = app?.state ?? own?.state
  if (number === undefined || state === undefined) {
    return null
  }
  if (own === undefined || state !== 'OPEN') {
    return { number, state, zusatz: [], isUrgent: false }
  }
  const zusatz = [
    own.isCiRed ? 'CI rot' : null,
    own.reviewDecision === 'CHANGES_REQUESTED' ? 'Änderungen gewünscht' : null,
    own.reviewDecision === 'REVIEW_REQUIRED' ? 'Review wartet' : null,
    own.isDraft ? 'Entwurf' : null,
  ].filter((z): z is string => z !== null)

  return { number, state, zusatz, isUrgent: own.isCiRed || own.reviewDecision === 'CHANGES_REQUESTED' }
}

function prText(pr: SessionPr): string {
  const what = pr.state === 'OPEN' ? 'offen' : pr.state === 'MERGED' ? 'gemerged' : 'geschlossen'

  return `PR #${pr.number} ${what}${pr.zusatz.length === 0 ? '' : `, ${pr.zusatz.join(', ')}`}`
}

/**
 * Where a session stands, from its list_sessions row, its last turn (`stand`; absent for a
 * session from before this version), its repository's pull requests (null when `gh` could not
 * list them) and the time now. Running comes first; then a merged or closed pull request (the
 * work is done, whatever the last turn was); then an aborted or failed turn, but only while the
 * session is recent: one left alone for more than three days rests like any other; then an open
 * pull request; without one the session is in work or rests.
 */
export function statusOf(
  session: ListedSession,
  stand: StandEintrag | undefined,
  prs: readonly GhPr[] | null,
  now: number,
): Status {
  const pr = prFor(session, prs)
  const id = pr?.number ?? null
  const withPr = (text: string): string => (pr === null ? text : `${text} · ${prText(pr)}`)
  const status = (art: StatusArt, mark: string, label: string, rang: number): Status => ({
    art,
    mark,
    label,
    rang,
    pr: id,
    tage: null,
  })
  if (session.isRunning) {
    return status('laeuft', '▶', withPr('läuft'), 5)
  }
  if (pr !== null && pr.state !== 'OPEN') {
    return pr.state === 'MERGED'
      ? status('pr-gemerged', '✓', prText(pr), 6)
      : status('pr-geschlossen', '✖', prText(pr), 6)
  }
  const last = lastActive(session, stand)
  const rests = last !== null && now - last > RUHT_AB_MS
  const isFailed = stand?.grund === 'error' || stand?.grund === 'refusal'
  if (!rests && stand?.grund === 'aborted') {
    return status('abgebrochen', '⚠', withPr('abgebrochen'), 0)
  }
  if (!rests && isFailed) {
    return status('fehler', '⚠', withPr(stand?.grund === 'error' ? 'Fehler' : 'Fehler (Modell lehnte ab)'), 0)
  }
  if (pr !== null) {
    return status('pr-offen', '🔀', prText(pr), pr.isUrgent ? 1 : 2)
  }
  if (last !== null && rests) {
    const tage = Math.floor((now - last) / TAG_MS)
    const zuletzt = stand?.grund === 'aborted' ? ', zuletzt abgebrochen' : isFailed ? ', zuletzt Fehler' : ''

    return { ...status('ruht', '💤', `ruht seit ${tage} Tagen, kein PR${zuletzt}`, 7), tage }
  }

  return status('in-arbeit', '✎', 'in Arbeit, kein PR', 4)
}

/** When the session was last active: the later of the app's figure and its last turn; null when neither is known. */
export function lastActive(session: ListedSession, stand: StandEintrag | undefined): number | null {
  const times = [session.lastActivityAt, stand?.um].filter((t): t is number => t !== null && t !== undefined)

  return times.length === 0 ? null : Math.max(...times)
}

/** How long ago, in short German: "gerade eben", "vor 5 Min", "vor 2 Std", "vor 3 Tagen". */
export function alterText(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000)
  if (min < 1) {
    return 'gerade eben'
  }
  if (min < 60) {
    return `vor ${min} Min`
  }
  const std = Math.floor(min / 60)
  if (std < 24) {
    return `vor ${std} Std`
  }
  const tage = Math.floor(std / 24)

  return tage === 1 ? 'vor 1 Tag' : `vor ${tage} Tagen`
}

/** The folder of a session's repository, lowercased as a key: a worktree counts as its repository; null without a project. */
export function repoKeyOf(cwd: string): string | null {
  if (projectOf(cwd) === null) {
    return null
  }
  const path = cwd.replace(/\\/g, '/').replace(/\/+$/, '')
  const cut = path.search(/\/\.claude\/worktrees\//i)

  return (cut >= 0 ? path.slice(0, cut) : path).toLowerCase()
}

/** One session in the overview: its title without color mark, its status and how long ago it was active. */
export type UebersichtZeile = {
  sessionId: string
  title: string
  status: Status
  /** "vor 2 Std"; empty when the app gave no time. */
  alter: string
  /** Milliseconds since the epoch; null when unknown. */
  lastActive: number | null
  isSelf: boolean
  /** The `claude://` address that opens the session; null for this one and when the app gave none. */
  link: string | null
}

/** A project's sessions, most in need of the person first. */
export type UebersichtGruppe = {
  /** The project's name as its folder spells it; null for sessions in no project folder. */
  project: string | null
  /** The project's color mark in the set in use; null without a project. */
  mark: string | null
  zeilen: UebersichtZeile[]
}

/** Every open session by project: what `/projektfarbe status` prints and a side panel can draw. */
export type Uebersicht = {
  gruppen: UebersichtGruppe[]
  /** Why some pull requests could not be read, one line per repository. */
  hinweise: string[]
}

/** What the overview is built from: the sessions, their last turns, each repository's pull requests. */
export type UebersichtDaten = {
  sessions: readonly ListedSession[]
  selfId: string | null
  stand: Readonly<Record<string, StandEintrag>>
  /** By `repoKeyOf`; null where `gh` could not list them. */
  prs: ReadonlyMap<string, readonly GhPr[] | null>
  /** The project's color mark, for the group heading. */
  markOf: (project: string) => string
  now: number
  hinweise?: readonly string[]
}

const byRang = (a: UebersichtZeile, b: UebersichtZeile): number =>
  a.status.rang - b.status.rang || (b.lastActive ?? 0) - (a.lastActive ?? 0)

/**
 * Groups the open sessions by project (case-insensitively, like the sidebar), each group by `rang`
 * and then the most recent first; the groups by their most urgent session, then by name.
 * Sessions in no project folder come last. Archived sessions are left out.
 */
export function buildUebersicht(daten: UebersichtDaten): Uebersicht {
  const groups = new Map<string, UebersichtGruppe>()
  for (const session of daten.sessions) {
    if (session.isArchived) {
      continue
    }
    const project = projectOf(session.cwd)
    const repo = repoKeyOf(session.cwd)
    const stand = daten.stand[session.sessionId]
    const prs = repo === null ? null : (daten.prs.get(repo) ?? null)
    const last = lastActive(session, stand)
    const key = project?.toLowerCase() ?? ''
    const group = groups.get(key) ?? {
      project,
      mark: project === null ? null : daten.markOf(project),
      zeilen: [],
    }
    group.zeilen.push({
      sessionId: session.sessionId,
      title: stripMark(session.title),
      status: statusOf(session, stand, prs, daten.now),
      alter: last === null ? '' : alterText(daten.now - last),
      lastActive: last,
      isSelf: session.sessionId === daten.selfId,
      link: session.sessionId === daten.selfId ? null : session.link,
    })
    groups.set(key, group)
  }
  const gruppen = [...groups.values()]
  for (const group of gruppen) {
    group.zeilen.sort(byRang)
  }
  const best = (group: UebersichtGruppe): number => group.zeilen[0]?.status.rang ?? Infinity
  gruppen.sort((a, b) => {
    if ((a.project === null) !== (b.project === null)) {
      return a.project === null ? 1 : -1
    }

    return best(a) - best(b) || (a.project ?? '').localeCompare(b.project ?? '')
  })

  return { gruppen, hinweise: [...(daten.hinweise ?? [])] }
}

/** The overview as text: a heading per project with its mark, one line per session. */
export function uebersichtText(uebersicht: Uebersicht): string {
  const count = uebersicht.gruppen.reduce((n, group) => n + group.zeilen.length, 0)
  if (count === 0) {
    return 'Keine offenen Sessions gefunden.'
  }
  const lines = [`${count} offene Session(s), was Aufmerksamkeit braucht zuerst:`]
  for (const group of uebersicht.gruppen) {
    lines.push('', group.project === null ? 'Ohne Projekt' : `${group.mark ?? ''} ${group.project}`.trim())
    for (const zeile of group.zeilen) {
      const self = zeile.isSelf ? ' (diese)' : ''
      const alter = zeile.alter === '' ? '' : ` · ${zeile.alter}`
      lines.push(`  ${zeile.status.mark} ${zeile.title}${self} — ${zeile.status.label}${alter}`)
    }
  }
  if (uebersicht.hinweise.length > 0) {
    lines.push('', ...uebersicht.hinweise)
  }

  return lines.join('\n')
}

/** The figures of the panel's top line; the panel leaves out the ones that are zero. */
export type Zaehler = { sessions: number; dringend: number; dudran: number; pr: number; ruht: number }

export function uebersichtZaehler(uebersicht: Uebersicht): Zaehler {
  const zeilen = uebersicht.gruppen.flatMap(group => group.zeilen)
  const bereiche = buildBereiche(uebersicht)
  const size = (id: BereichId): number => bereiche.find(bereich => bereich.id === id)?.zeilen.length ?? 0
  const count = (art: StatusArt): number => zeilen.filter(z => z.status.art === art).length

  return {
    sessions: zeilen.length,
    dringend: size('dringend'),
    dudran: size('dudran'),
    pr: count('pr-offen'),
    ruht: count('ruht'),
  }
}

/**
 * Why the panel may offer to archive a session, or null when it may not: it rests, or its pull
 * request is merged or closed. The session the panel runs in is never offered (archiving ends it).
 */
export function archiveReason(zeile: UebersichtZeile): string | null {
  if (zeile.isSelf) {
    return null
  }
  const { art, pr, tage } = zeile.status
  if (art === 'ruht' && tage !== null) {
    return `ruht seit ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`
  }
  if ((art === 'pr-gemerged' || art === 'pr-geschlossen') && pr !== null) {
    return `PR #${pr} ${art === 'pr-gemerged' ? 'gemerged' : 'geschlossen'}`
  }

  return null
}

export type BereichId = 'dringend' | 'dudran' | 'review' | 'laeuft' | 'aufraeumen'

/** One session of a section, with the project it belongs to. */
export type BereichZeile = UebersichtZeile & { project: string | null; mark: string | null }

/** The overview cut by what the person should do about it, not by project. */
export type Bereich = { id: BereichId; titel: string; zeichen: string; zeilen: BereichZeile[] }

const BEREICHE: readonly { id: BereichId; titel: string; zeichen: string }[] = [
  { id: 'dringend', titel: 'Braucht dich: Problem', zeichen: '⚠' },
  { id: 'dudran', titel: 'Du bist dran: Claude wartet', zeichen: '💬' },
  { id: 'review', titel: 'PR wartet auf Review oder Merge', zeichen: '🔀' },
  { id: 'laeuft', titel: 'Läuft, nichts zu tun', zeichen: '▶' },
  { id: 'aufraeumen', titel: 'Aufräumen', zeichen: '🧹' },
]

/**
 * Where a session goes. A problem (aborted, failed, or a pull request with a red CI or changes
 * wanted) needs the person; a session that is stopped and in work has finished its turn, so the
 * next move is theirs (the app does not say whether it asked something, only that it stopped);
 * this very session counts as running. Open pull requests wait on others, running ones need nothing,
 * merged, closed and resting ones can be archived.
 */
export function bereichOf(zeile: UebersichtZeile): BereichId {
  const { art, rang } = zeile.status
  if (art === 'abgebrochen' || art === 'fehler' || (art === 'pr-offen' && rang <= 1)) {
    return 'dringend'
  }
  if (art === 'in-arbeit' && !zeile.isSelf) {
    return 'dudran'
  }
  if (art === 'pr-offen') {
    return 'review'
  }
  if (art === 'laeuft' || art === 'in-arbeit') {
    return 'laeuft'
  }

  return 'aufraeumen'
}

/**
 * The overview by status, in the order of what the person should look at first. Empty sections are
 * left out; inside one, the most urgent and then the most recent first.
 */
export function buildBereiche(uebersicht: Uebersicht): Bereich[] {
  const alle: BereichZeile[] = uebersicht.gruppen.flatMap(group =>
    group.zeilen.map(zeile => ({ ...zeile, project: group.project, mark: group.mark })),
  )
  const bereiche = BEREICHE.map(bereich => ({
    ...bereich,
    zeilen: alle
      .filter(zeile => bereichOf(zeile) === bereich.id)
      .sort(byRang),
  }))

  return bereiche.filter(bereich => bereich.zeilen.length > 0)
}

// ---------------------------------------------------------------- Bramble

/** Where the Bramble repository is when nothing else is named: under the person's own repositories. */
export const BRAMBLE_HOME = ['Documents', 'Repositories', 'LightWeightBrowser']

/** The Bramble profile links from the band open in: its own, so they never overwrite the person's saved tabs. */
export const BRAMBLE_PROFILE = 'projektfarben'

/** `LWB_ADBLOCK` for links from the band: Bramble starts without its built-in ad blocker (uBlock Origin Lite), so it stays lean. */
export const BRAMBLE_ADBLOCK = 'off'

const winPath = (...parts: string[]): string => parts.map(p => p.replace(/[\\/]+$/, '').replace(/\//g, '\\')).join('\\')

/** The repository folder: `BRAMBLE_REPO` when set, else `BRAMBLE_HOME` under the home folder; null without either. */
export function brambleRoot(own: string | undefined, home: string | undefined): string | null {
  if (own !== undefined && own.trim() !== '') {
    return winPath(own.trim())
  }

  return home === undefined || home.trim() === '' ? null : winPath(home.trim(), ...BRAMBLE_HOME)
}

/** Every place a release build may be: the repository's own and each of its worktrees'. */
export function brambleKandidaten(root: string, worktrees: readonly string[]): string[] {
  const exe = ['target', 'release', 'bramble.exe']

  return [winPath(root, ...exe), ...worktrees.map(name => winPath(root, '.claude', 'worktrees', name, ...exe))]
}

/** The newest of the builds found, by the time it was built; null when there is none. */
export function neuesterBuild(builds: readonly { path: string; mtimeMs: number }[]): string | null {
  return builds.reduce<{ path: string; mtimeMs: number } | null>(
    (best, build) => (best === null || build.mtimeMs > best.mtimeMs ? build : best),
    null,
  )?.path ?? null
}

/**
 * How to start Bramble on one address and leave it running: `Start-Process` detaches it from the call,
 * which would otherwise wait for the window to close. The path goes in a variable, not in the command,
 * so no quoting can break it; Bramble takes its start address from `LWB_URL`.
 */
export function brambleStart(exe: string, url: string): { argv: string[]; env: Record<string, string> } {
  return {
    argv: ['powershell', '-NoProfile', '-NonInteractive', '-Command', 'Start-Process -FilePath $env:BRAMBLE_EXE'],
    env: { BRAMBLE_EXE: exe, LWB_URL: url, LWB_PROFILE: BRAMBLE_PROFILE, LWB_NO_PINS: '1', LWB_ADBLOCK: BRAMBLE_ADBLOCK },
  }
}
