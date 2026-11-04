# Plan: Repair-Menü im Band, danach fünf Knöpfe im IssueBoard

Stand: 2026-11-04. Status: Plan, noch nichts gebaut. Quelle: die Auswertung von rund 530 getippten Prompts aus den CapitalCombo-Sessions und die Rückmeldungen dazu.

## Ziel

Prompts, die du immer wieder schickst, aber nie wörtlich gleich, werden zu Knöpfen, die den Kontext selbst mitbringen. Zwei Orte:

- **Band** (dieses Repo, `projektfarben`): alles, was für jedes Projekt gilt. Dort kommt das Repair-Menü hin.
- **IssueBoard** (eigenes Repo): alles, was an einer Karte oder einem Plan hängt.

Nicht gebaut werden: Merge-Zug, Halten und Live schalten (gestrichen). Die Ein-Wort-Freigaben („Ja“, „Ja, mergen“) deckt der Entwurf `claude/chat-button-simple-questions-593f80` ab (Ja/Nein-Knöpfe unter der Chat-Nachricht).

## Phase 1: Repair-Menü im Band

> Nach der Vorschau geändert: Das Menü ersetzte das Band und wirkte nicht passend. Der Schraubenschlüssel öffnet stattdessen eine kleine Leiste unter dem Band (`repair-leiste`); das Band bleibt sichtbar. Wo unten „Menü“ steht, ist diese Leiste gemeint.

Ein Knopf (Schraubenschlüssel) öffnet eine kleine Auswahl mit drei Einträgen. Jeder Eintrag schickt einen Prompt; die Session startet daraufhin eine **neue Session** im eigenen Worktree (`start_session`, `user_asked`, `fresh`). Der Klick ist die Freigabe für genau die Stufen 1 und 2 unten.

### Der gemeinsame Ablauf (alle drei Einträge)

1. **Audit, nur lesen.** Mehrere günstige Agenten (Sonnet oder Haiku) prüfen parallel je eine Dimension. Nichts wird geändert.
2. **Playbook.** Ein stärkeres Modell (Opus, bei großen Umbauten Fable) schreibt `docs/playbook-<name>.md`: Befunde nach Gewicht, Maßnahmen mit Prüfkriterium, Reihenfolge, Risiko, Größe je Schritt. Leitregel: nicht schlechter werden, gemessen vorher und nachher.
3. **Freigabe.** Die Session stoppt mit einer Ja/Nein-Frage, dazu die Kostenschätzung (Worker mal Modell) und die Liste dessen, was sie anfasst. Ohne dein Ja wird nichts umgesetzt.
4. **Umsetzung in Wellen.** Worker (Haiku, Sonnet, bei Bedarf Opus nach Größe) arbeiten Schritt für Schritt, ein Branch und ein PR je Schritt, mit Review und Tests. Am Ende die volle Prüfung und ein kurzer Bericht.

Grenzen, in jedem der drei Prompts: kein Push auf den Hauptzweig, kein Force-Push, keine Daten und Volumes löschen, keine Major-Updates ohne Tests, nichts mergen. Was unklar oder von dir zu entscheiden ist, wird ein Issue oder eine Frage, kein Raten. Wo Geld im Spiel ist (CapitalCombo), läuft der `risk-gate-reviewer`.

### Die drei Einträge

**1. UI auf Studio-Niveau** (`repair-ui`)
- Audit: Screenshots aller Seiten bei 390 und 1440 px, Abstände und Ausrichtung, Design-Tokens und Brüche, Leer-, Lade- und Fehlerzustände, Tastatur, Barrierefreiheit (axe), Bewegung, Performance. Die Session erkennt selbst, was für das Projekt zählt (Web-App, Spiel mit HUD und Inventar, Desktop).
- Playbook: erst ein Design-System (Tokens, Komponenten), dann Seite für Seite. Für die wichtigsten Seiten vorher Mockup-Varianten A/B/C, aus denen du wählst.
- Beweis: Vorher-nachher-Screenshots in jedem PR. Vorhandene Design-Skills des Projekts zuerst nutzen.

**2. Repo wieder gesund machen** (`repair-repo`, Doctor, Code-Review, Hygiene)
- Audit: läuft es aus einem sauberen Clone, stimmen README und CLAUDE.md, Abhängigkeiten (veraltet, verwundbar, ungenutzt), toter Code und Duplikate, Struktur und Dateigrößen, Testlücken auf kritischen Pfaden und flackernde Tests, Lint, Typen, Format, CI (Dauer, Kosten, Rechte, Geheimnisse), Git (alte Branches, große Dateien, `.gitignore`, Geheimnisse in der Historie), Fehlerbehandlung, Logging, Konfiguration.
- Playbook: Quick Wins zuerst, je ein PR. Riskantes wird ein Issue. Bei gevibecodetem Code zuerst Tests, die das jetzige Verhalten festhalten, dann der Umbau.
- Ergebnis: Gesundheitsbericht mit Note je Dimension.

**3. KI-Upgrade** (`upgrade`, der Schirm über beide)
- Umfang als Auswahl im Menü: UI (`upgrade-ui`), Repo (`upgrade-repo`), Werkzeuge. Voreinstellung: alles.
- Werkzeuge auf das neue Modell: CLAUDE.md, Skills, Hooks und Agents prüfen, Behelfe für schwächere Modelle entfernen, Prompts verschlanken (Längengrenzen und feste Überschriften kosten Qualität). Ruft das Projekt selbst ein Modell auf, wird die Modell-ID nie ohne Messung umgestellt; stattdessen entsteht eine Messung (Registrierung, Budget) oder ein Issue.
- Ehrgeiz anheben: das Repo mit frischem Blick auf alles ansehen, was früher zu schwer oder zu teuer war: größere Umbauten, fehlende Tests, Architektur, Performance.
- Stempel: `docs/ai-upgrade.md` hält Datum, Modell, Umfang und Playbook fest. Beim nächsten Lauf liest die Session ihn zuerst und macht nur den Unterschied. Mit demselben Modell geht es ebenso.

### Umsetzung im Band

Dateien: `hooks/colors.ts`, `hooks/register.tsx`, `types/index.d.ts`, `hooks/projektfarben.test.tsx`, `README.md`, `CLAUDE.md`, `docs/PROMPTS.md`, `docs/prompts.html`, `.claude-plugin/plugin.json`.

1. **Prompts** in `colors.ts`: `repairUiPrompt(projekt)`, `repairRepoPrompt(projekt)`, `upgradePrompt(projekt, umfang)`. Ein gemeinsamer Baustein für den Ablauf und die Grenzen hält die drei gleich. Ziele statt Formular, keine Zeilengrenze, keine feste Gliederung, kein Leseverbot (wie die vorhandenen Prompts; ein Test hält sie davon frei).
2. **`PROMPT_INFO`**: drei Einträge mit `does` und `checks`, damit `/projektfarbe prompts` und `docs/PROMPTS.md` sie führen.
3. **Icons** in `ICON_SVG`: `repair` (Schlüssel), `repairUi`, `repairRepo`, `upgrade` (Entwürfe siehe Vorschlag in der Sitzung; 24er-Raster, Linienstil). Test hält jedes Icon in sein Feld. Der Upgrade-Eintrag bekommt wie `fable` den goldenen Strich.
4. **Menü**: ein Band-Feld `repair` (Eintrag in `defs`, `ACTION_COUNT` 8 → 9). Das Menü öffnet sich nach demselben Muster wie die Auswahl des Zahnrads; wie genau, wird im Code festgelegt (Zustand im `view`-Atom, dann `types/index.d.ts` mitziehen). Tasten: `repair`, `repair-ui`, `repair-repo`, `upgrade`, `upgrade-ui`, `upgrade-repo`. Auf dem Terminal das Textzeichen `⚒`.
5. **Senden** über `bitteSenden` (sofortiger Toast, Sperre bis zur Antwort, Doppelklick wird abgefangen).
6. **Breite**: `bandBreite` zählt ein Feld mehr; die Umschaltpunkte in `BAND_FORMEN` neu messen (`/projektfarbe breite`) und den Test anpassen.
7. **Tests**: Prompts (Ziele statt Formular, Grenzen vorhanden, Umfang des Upgrades wirkt), Menü öffnet und schließt, jeder Eintrag sendet genau einmal, Breiten-Umschaltpunkte, Icon im Feld.
8. **Doku**: README (Was der Mod macht, Befehle, Grenzen), CLAUDE.md (Architektur, Tastenliste), `docs/PROMPTS.md` und `docs/prompts.html` neu erzeugen.

### Vorschau und Abnahme (nach CLAUDE.md)

Lokal committen, `version` in `.claude-plugin/plugin.json` anheben, Branch in den Marketplace-Ordner holen, `claude plugin marketplace update max-mods`, `claude plugin update projektfarben@max-mods`, Session `vorschau-<n>` mit der einen Antwort „Vorschau bereit.“. Du siehst Band, Menü und Breiten; erst danach PR und Merge.

### Fertig, wenn

- Das Menü zeigt drei Einträge, jeder startet genau eine neue Session, und ein zweiter Klick wird abgefangen.
- Kein Prompt enthält eine Längengrenze, feste Überschriften oder ein Leseverbot; die Grenzen stehen drin.
- Das Band schaltet in jeder Breite sauber um (Test), das Terminal zeigt die Textfassung.
- `docs/PROMPTS.md` entspricht dem Befehl `/projektfarbe prompts`.

## Phase 2: Fünf Knöpfe im IssueBoard

Eigenes Repo, eigene Vorschau. Die Aktionen sind eine reine Tabelle (`public/aktionen.mjs`: Schlüssel, Ort, Sichtbarkeit, Icon, Prompt aus dem Kartenkontext), die Icons liegen im vorhandenen SVG-Sprite. Der Server rendert den Prompt aus der Karte, der Browser kopiert ihn und zeigt einen Toast; eine Session startet weiterhin die Session, in die du ihn einfügst.

| Knopf | Ort | Inhalt |
|---|---|---|
| **Starten und Welle** | Karte in „bereit“, Spaltenkopf | Eigene Session mit Branch und PR je Issue. Modell nach `## Größe` (klein Haiku, mittel Sonnet, groß oder riskant Opus). Welle nach „Hängt ab von“, die nächste erst bei grüner CI auf main. |
| **Trader fragen** | Kopfzeile, Plan, Abnahme | Fable als erfahrener Trader. (a) Check des Ganzen: läuft das, was wir tun, gut, was würde er nicht trauen, was fehlt. (b) In der Abnahme ein Vorschlag je Punkt („Ja, Nein, Frage, weil …“ mit Beleg) und ein Knopf „Vorschlag übernehmen“. Er setzt keine Haken selbst; bei Geldpfaden bleibt es bei deinem Klick, pro Plan abschaltbar. Das Urteil bewertet Plausibilität und Belege, keine Rendite. |
| **Fertig?** | Karte, Plan, Kopfzeile | Prüft Issues, PRs, CI, Branches, Subsessions und ob eine andere Session dasselbe tut. Reste werden Issues (nach Dublettenprüfung), Erledigtes wird mit Beleg geschlossen. Löschen und Archivieren zeigt es zuerst als Liste. |
| **Überblick** | Karte, Plan, Session | Neue günstige Session (Sonnet oder Haiku) füllt einen kleinen JSON-Block (`issueboard/uebersicht/v1`: was passiert ist, entschieden, offene Entscheidungen einfach erklärt mit Empfehlung, was zu tun ist). `public/uebersicht.mjs` rendert daraus eine selbständige HTML-Seite im Look des Boards mit Inline-SVGs, ohne Netzwerk, lokal unter `.cache/uebersicht/`. Als Artefakt veröffentlichen nur auf Wunsch. |
| **Plan gegenprüfen** | Plan-Chip | Frische Session sieht nur die Plan-Datei und das Repo, prüft ohne Vorwissen (Machbarkeit, messbares „nicht schlechter“, Überschneidung mit anderen Plänen, Lücken, Kosten) und hängt die Befunde als Abschnitt an die Plan-Datei, ohne Code zu ändern. Opus, bei Geldpfaden Fable. |

Tests: Aktionstabelle und Sichtbarkeit, `traderVorschlag` (kein Haken ohne Klick), Renderer des Überblicks gegen ein festes JSON, Plan-Erkennung. README und CLAUDE.md des Boards nachziehen.

## Risiken und offene Punkte

- **Kosten**: Stufe 4 der Repair-Einträge kann viele Worker starten. Die Kostenschätzung vor der Freigabe ist Pflicht und steht im Prompt.
- **Qualität der Prompts**: Ob die Session wirklich das tut, was der Prompt will, prüfen die Tests nicht (nur Text und Versand). Die Vorschau-Session und der erste echte Lauf an einem kleinen Projekt zeigen es; danach nachschärfen.
- **Menü-Mechanik** im Band ist noch nicht gelesen (Muster des Zahnrads). Falls sie nicht trägt, bleibt Rückfall: drei Einzel-Icons statt Menü, was das Band deutlich breiter macht.
- **Abhängigkeit**: Die Ja/Nein-Knöpfe sind noch ein Entwurf. Ohne sie tippst du das Ja an der Freigabe selbst.
- **Gestrichen**: Merge-Zug, Halten, Live schalten. Wer sie später doch braucht, kann sie nachziehen; die Aktionstabelle macht das zu einem Eintrag.
