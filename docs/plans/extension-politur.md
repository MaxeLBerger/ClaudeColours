# Plan: die Extension schön und dauerhaft vorzeigbar machen

Stand: 2026-11-05. Status: Paket 1 gebaut und in der Vorschau abgenommen (0.19.0), Paket 2 gebaut (0.19.1), Paket 4 als PR 22 (gestapelt auf PR 21). Offen: Paket 3 (Zuschnitt, wartet auf deine Entscheidung), 5 (Theme-Prüfung durch dich) und 6 (Entflechten). Anlass: Die Repair-Karte gefiel nach fünf Vorschau-Runden weiterhin nicht. Grundlage: eine unabhängige Zweitmeinung (Opus, nur gelesen, mit Pixelmessung an beiden Screenshots) und meine eigene Prüfung am Repo.

## 1. Befund

Alle fünf Runden haben an Symptomen **eines** Fehlers gedreht: Die Karte ist ein absolut positioniertes Overlay in einer Zeile, die auf ihre eigene Höhe beschnitten wird. Daraus folgt alles Sichtbare:

- Sie **verdeckt PRs und Issues** (im Screenshot x 1087 bis 1309, genau dort, wo „PRs: 1 Issues: 0“ steht). Gewünscht war ausdrücklich, dass das Band bleibt.
- Das Band **springt 11 px in der Höhe**, weil `paddingBottom: 1` ein Workaround für die Beschneidung ist. CLAUDE.md schließt genau dieses Springen beim Umbruch aus.
- Sie ist ein **Fremdkörper im Stil**: harter schwarzer Kasten ohne Rundung, weiße 18-px-Symbole neben grauen 14-px-Symbolen. Der dunkle Grund entstand nur, weil der halbtransparente Grund den Text durchscheinen ließ; das hat das Symptom versteckt, nicht die Ursache.
- Hinter jedem Symbol steht ein „…“ (der abgeschnittene Leerzeichen-Text des Buttons). Warum nur in der Karte, ist Engine-Verhalten und nicht aus dem Code belegbar.
- Das **Selbstschließen nach 30 s** nimmt dem, der die Hover-Texte liest, das Menü unter dem Zeiger weg. Es behebt nur ein Problem, das das Overlay selbst erzeugt.
- Die **Tests zementieren die Fehler** (`paddingBottom === 1`, `position: 'absolute'`, `POPUP_BG`, größere Symbole). Strukturtests sehen Überdeckung grundsätzlich nicht: `prs` und `issues` stehen im Baum, aber nicht sichtbar.

Geprüft und bestätigt am Repo: In CLAUDE.md steht in der Liste der Test-Tasten noch `upgrade-ui`, `upgrade-repo`, `upgrade-werkzeuge` (Zeile 90); `types/index.d.ts` spricht noch von „strip“; `upgradePrompt` hat einen Parameter `teile`, den keine Oberfläche mehr nutzt; PR 21 enthält Material für das IssueBoard (`docs/plans/board-icons/`). Teils überholt war die Zweitmeinung beim Rest der Doku-Abweichungen: CLAUDE.md beschreibt die Karte schon als Popup, die Schalter sind dort schon gestrichen.

## 2. Entscheidung: der Einstieg klappt in der Zeile aus

Geprüfte Alternativen: Overlay-Karte (jetzt, nicht zu retten), ein eigenes Panel „Reparieren“ (robust, aber gegen den Wunsch „nur Symbole, Beschreibung beim Hover“ und schwer für drei seltene Klicks; später als Erklärung denkbar), das Band vorübergehend ersetzen (wie die Farbwahl; wurde schon verworfen), drei dauerhafte Symbole mehr im Band (Band früher in engen Formen) und nur ein Befehl (nicht auffindbar).

**Gewählt: Ausklappen in der Zeile, an der Stelle der Zähler.**

- Ein Druck auf den Schraubenschlüssel macht aus ihm im selben Feld ein ✕ (Hover „Reparieren schließen“). Wo die Zähler stehen, erscheinen drei ganz normale Felder, vom selben `draw` gezeichnet: gleiches Feld (`ICON_BOX`), gleiche Größe (14 px), gleiches Grau (`ICON_SVG_COLOR`), der Upgrade-Pfeil in `GOLD` wie Fable, jedes mit seiner Hover-Karte. Das ist die Stelle, an der du die Symbole wolltest, nur als Teil der Zeile statt darüber gelegt.
- Solange offen ist, werden PRs und Issues nicht gezeichnet. Kein Overlay, kein dunkler Grund, kein `paddingBottom`, keine Beschneidung, kein Timer.
- **Platz:** Die drei Felder mit Abständen sind etwa 12 Zellen breit, die Zähler im Mindestfall (` ?` und ` 0`) etwa 16. Das offene Band ist in jeder einzeiligen Stufe schmaler als das geschlossene, es rechnet nicht neu und springt nicht.
- **Zweizeilige Form:** Die Zähler stehen dort in Zeile 1, die Aktionen in Zeile 2. Die drei Felder ersetzen deshalb auch dort die Zähler in Zeile 1, damit Zeile 2 unverändert bleibt.
- **Hover-Karten** öffnen zur Seite und müssen in den engsten Stufen im Band bleiben: Texte höchstens etwa 30 Zeichen („UI auf Studio-Niveau (neue Session)“, „Repo gesund machen (neue Session)“, „KI-Upgrade: UI, Repo, Werkzeuge“).
- **Schließen**, ohne Timer: das ✕ im Feld des Schlüssels, ein Eintrag, das Ende der nächsten Antwort der Session, das Öffnen des Zahnrads. Das Umschalten schreibt direkt per `update` (kein Lesen-dann-Schreiben, damit ein Doppelklick nicht beide Male „zu“ sieht).
- **Terminal:** `⚒` wird `✕`, die Einträge `▭ ⌁ ⇧`.
- **Tasten bleiben:** `repair`, `repair-ui`, `repair-repo`, `upgrade`; `abbrechen` entfällt als eigene Taste (das ✕ ist die Taste `repair`).

**Wo ich der Zweitmeinung nicht folge:** Sie rät davon ab, „größer“ über die Symbolgröße zu lösen (die Zeile ist etwa 20 px hoch, 18 px sprengen den Rhythmus). Dem stimme ich zu und setze es um: Größer wirkte die Karte nur, weil sie klein und fremd aussah; in der Zeile sind die Symbole so groß wie alle anderen und gehören dazu. Ob die Oberfläche Rahmen oder Rundung an einer Box kann, ist nirgends belegt; es gibt keinen „Pill“-Grund.

## 3. Arbeitspakete

### Paket 1: Reparieren als Ausklappen (PR 21, Version 0.19.0)

Dateien: `hooks/register.tsx`, `hooks/colors.ts`, `types/index.d.ts`, `hooks/projektfarben.test.tsx`, `CLAUDE.md`, `README.md`, `.claude-plugin/plugin.json`.

1. In `register.tsx` den Popup-Code (`repairPopup`, `toggleRepair`, `repairTimer`, `REPAIR_OPEN_MS`, `POPUP_FIELD`, `POPUP_ICON_PX`, die `paddingBottom`-Zusätze, den zweiten Parameter von `draw`) entfernen. Stattdessen: Das Feld des Schlüssels zeigt offen das ✕-Icon; die Zähler werden durch drei `draw`-Felder in einer Box mit `columnGap={ICON_GAP}` ersetzt.
2. In `colors.ts` `POPUP_BG`, `POPUP_ICON`, `POPUP_GOLD` streichen; `REPAIR_MENU_SVG` in der Bandfarbe (`ICON_SVG_COLOR`, `GOLD`) zeichnen, den Parameter `teile` und den Typ `UpgradeTeil` aus `upgradePrompt` entfernen (die Oberfläche hat keinen Schalter mehr).
3. Eine reine Funktion für die Breite der offenen Reihe (`repairBreite`) neben `bandBreite`, damit ein Test sie gegen die Zähler halten kann.
4. Tests auf **Invarianten** umstellen statt auf die Umsetzung:
   - offen gibt es keine absolute Box außer den versteckten Hover-Karten;
   - keine Höhenänderung (`paddingBottom` bleibt `undefined`);
   - offen ist die Reihe in jeder Stufe höchstens so breit wie geschlossen (`repairBreite` gegen die Zähler);
   - alle Repair-Symbole nutzen `ICON_SVG_COLOR` oder `GOLD`;
   - die Schließwege (✕, Eintrag, Ende der Antwort, Zahnrad) und ein Doppelklick;
   - Hover-Texte höchstens 30 Zeichen;
   - die Zähler fehlen im gezeichneten Text, solange offen ist, und sind danach wieder da.
   Streichen: die Zusicherungen auf `POPUP_BG`, `paddingBottom: 1`, `position: 'absolute'`, die Feldbreite und die Symbolgröße; den Test „opens under the band“ umbenennen.
5. Doku angleichen: Tastenliste in CLAUDE.md (ohne `upgrade-ui`, `upgrade-repo`, `upgrade-werkzeuge`, `abbrechen`), Abschnitt über `repair` in CLAUDE.md und README (kein Popup, keine dunkle Karte, kein 30-s-Timer), Kommentar in `types/index.d.ts` („strip“), Plan-Datei, `docs/PROMPTS.md` und `docs/prompts.html` neu erzeugen.

**Fertig, wenn:** alle Tests grün, `claude plugin validate .` besteht, und die Sichtprüfung (Abschnitt 4) in der Vorschau bestanden ist.

### Paket 2: Ausweg in den Repair-Prompts (gleicher PR)

Der Rahmen setzt voraus, dass die Session eine neue Session starten kann (Terminal oder fehlendes Werkzeug: nicht). Ein Satz in `repairPrompt` („kannst du keine neue Session starten, sag es und hör auf“), ein Test, danach `PROMPTS.md` und `prompts.html` neu.

### Paket 3: Zuschnitt von PR 21

PR 21 enthält Material, das nicht zum Mod gehört: `docs/plans/board-icons/` (Entwürfe der IssueBoard-Symbole) und den Phase-2-Teil des Plans. Beides soll in das IssueBoard-Repo oder auf einen eigenen Branch, damit PR 21 nur den Mod und seinen Plan enthält. Branch und PR-Titel danach zu „Repair im Band“ umbenennen. (Entscheidung offen, siehe Abschnitt 6.)

### Paket 4: README, Marketplace und Manifest (eigener PR)

- README: zwei Sätze Pitch, ein Bild des Bands (hell und dunkel), eine Tabelle Symbol, Name, was es tut, was es nie tut; Details darunter. Der Reparieren-Absatz (etwa 350 Wörter) wird gekürzt und verweist auf `docs/PROMPTS.md`. Der Einstieg verkauft heute nur den Farbpunkt in der Seitenleiste; Stack, Reparieren und Fable fehlen in den ersten Zeilen.
- `marketplace.json`: die Beschreibung („Farbpunkte pro Projekt für die Session-Liste“) ist veraltet.
- `plugin.json`: Umlaute statt „Aendern“ und „gedaempfte“, Schlüsselwörter.
- Die Screenshots macht die Person (nur sie sieht die echte Oberfläche); die Datei-Namen und Stellen im README lege ich vor.

### Paket 5: Dunkles Theme und Farben

Alle Symbolfarben sind feste Hexwerte (das Grau `#666c78` gilt als lesbar auf hell und dunkel), und `subtle` ist laut Notiz im Code auf hellem Theme dunkel. Es gibt nur helle Screenshots. Einmal dunkel prüfen (Teil der Sichtprüfung) und bei Bedarf Farben nachziehen. Die Schlaffarben wirken auf hellem Grund blass (bekannte Grenze in der README); eine helle Variante wäre ein weiterer `Satz`.

### Paket 6: `register.tsx` entflechten (Refactor, kein neues Verhalten)

Der `AbovePrompt`-Hook ist rund 520 Zeilen mit `defs`, `draw`, Reparieren und Layouts inline. Ein eigenes Modul für das Band (`defs`, `draw`, Layouts) und eines für die Prompt-Sender machen neue Symbole billiger und Reviews lesbarer. Erst nach Paket 1, mit den bestehenden Tests als Sicherung, in einem eigenen PR ohne Verhaltensänderung.

## 4. Sichtprüfung (feste Checkliste für jede Vorschau)

Fünf Runden ohne Abnahme haben gezeigt: Strukturtests decken das Aussehen nicht ab. Jede Vorschau eines Band- oder Panel-Changes bekommt deshalb diese Prüfung, die die Person macht:

| | |
|---|---|
| Theme | hell und dunkel |
| Breite | 100, 70, 60 und 30 Spalten |
| Zustand | Reparieren zu und offen, außerdem offen mit Hover auf jedem der drei Symbole |
| Achten auf | verdeckte Zähler, Höhensprung, Symbole auf gleicher Linie, Hover-Text im Band, Schließen mit ✕ |

Die Checkliste kommt in CLAUDE.md unter „Previewing a change“, damit sie bei jeder Vorschau gilt.

## 5. Reihenfolge

1. Paket 1 und 2 zusammen in PR 21, Vorschau mit Checkliste, dann Merge.
2. Paket 3 (Zuschnitt) vor dem Merge von PR 21.
3. Paket 4 (README und Marketplace) als eigener PR nach dem Merge.
4. Paket 5 in der Vorschau von Paket 1 mitprüfen, Korrekturen nach Bedarf.
5. Paket 6 zuletzt.

## 6. Offene Entscheidungen

- **Der Einstieg als Ausklappen in der Zeile** (Abschnitt 2): Ersetzt er dir die Zähler zu sehr, solange er offen ist? Alternative wäre das eigene Panel; das widerspricht allerdings „nur Symbole, Beschreibung beim Hover“.
- **Selbstschließen nach 30 s entfällt.** Geschlossen wird nur noch per ✕ und Schließwegen.
- **Zuschnitt von PR 21:** Soll das IssueBoard-Material in das IssueBoard-Repo umziehen oder auf einen eigenen Branch hier?
- **Screenshots fürs README:** Sie kommen von dir; wann?

## 7. Risiken

- Die Hover-Texte in den engsten Stufen (etwa 60 Spalten) sind nicht belegbar; die Checkliste prüft sie.
- Das „…“ hinter den Symbolen in der Karte ist ungeklärt. In der Zeile, wo alle Symbole gleich gezeichnet werden, soll es nicht auftreten.
- Ob die Engine ein zweites Panel mit eigener Kennung kann, ist nicht belegt (nur die Übersicht ist bewiesen).
