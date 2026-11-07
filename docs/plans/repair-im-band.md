# Plan: Reparieren im Band

Stand: 2026-11-05. Status: gebaut und in der Vorschau abgenommen (Version 0.19.0, danach 0.19.1). Die Folgearbeit an der Extension steht in `extension-politur.md`. Der Plan für fünf Knöpfe im IssueBoard liegt auf dem Branch `claude/issueboard-knoepfe-plan`, er gehört nicht zum Mod.

## Ziel

Prompts, die du immer wieder schickst, aber nie wörtlich gleich, werden zu Knöpfen im Band, die für jedes Projekt gelten. Dieser Plan ist der für **Reparieren**: ein Schraubenschlüssel im Band, der drei Einträge anbietet. Die Ein-Wort-Freigaben („Ja“, „Ja, mergen“) deckt der Mod schon mit den Ja/Nein-Knöpfen unter der Chat-Nachricht ab.

## Der Knopf

Der Schraubenschlüssel (`repair`) ist das letzte der Session-Symbole. Ein Klick macht ihn zum ✕ und klappt drei Symbole genau dort auf, wo sonst PRs und Issues stehen (`repair-leiste`): Bildschirm (UI), Pulslinie (Repo), goldener Pfeil (KI-Upgrade), gezeichnet wie die anderen Symbole, jedes mit seiner Hover-Beschreibung. Das Band bleibt in einer Zeile, wird nicht höher und nicht breiter. Geschlossen wird mit dem ✕, mit einem Eintrag, am Ende der nächsten Antwort der Session und mit dem Zahnrad. Wie es dazu kam (Menü, Karte, Overlay, Zweitmeinung) und warum es so ist, steht in `extension-politur.md`.

Jeder Eintrag schickt einen Prompt; die Session startet daraufhin eine **neue Session** im eigenen Worktree. Der Klick ist die Freigabe für genau die Stufen 1 bis 3 unten, nicht für die Umsetzung.

## Der gemeinsame Ablauf (alle drei Einträge)

1. **Audit, nur lesen.** Mehrere günstige Agenten (Sonnet oder Haiku) prüfen parallel je eine Dimension. Nichts wird geändert.
2. **Playbook.** Ein stärkeres Modell (Opus, bei großen Umbauten Fable) schreibt `docs/playbook-<name>.md`: Befunde nach Gewicht, Maßnahmen mit Prüfkriterium, Reihenfolge, Risiko, Größe je Schritt. Leitregel: nicht schlechter werden, gemessen vorher und nachher.
3. **Freigabe.** Die Session stoppt mit einer Ja/Nein-Frage, dazu die Kostenschätzung (Worker mal Modell) und die Liste dessen, was sie anfasst. Ohne dein Ja wird nichts umgesetzt.
4. **Umsetzung in Wellen.** Worker (Haiku, Sonnet, bei Bedarf Opus nach Größe) arbeiten Schritt für Schritt, ein Branch und ein PR je Schritt, mit Review und Tests. Am Ende die volle Prüfung und ein kurzer Bericht.

Grenzen, in jedem der drei Prompts: kein Push auf den Hauptzweig, kein Force-Push, keine Daten und Volumes löschen, keine Major-Updates ohne Tests, nichts mergen. Was unklar oder von dir zu entscheiden ist, wird ein Issue oder eine Frage, kein Raten. Wo Geld im Spiel ist (CapitalCombo), läuft der `risk-gate-reviewer`. Kann die Session keine neue Session starten (Terminal, Werkzeug fehlt), sagt sie es und hört auf.

## Die drei Einträge

**1. UI auf Studio-Niveau** (`repair-ui`)
- Audit: Screenshots aller Seiten bei 390 und 1440 px, Abstände und Ausrichtung, Design-Tokens und Brüche, Leer-, Lade- und Fehlerzustände, Tastatur, Barrierefreiheit (axe), Bewegung, Performance. Die Session erkennt selbst, was für das Projekt zählt (Web-App, Spiel mit HUD und Inventar, Desktop).
- Playbook: erst ein Design-System (Tokens, Komponenten), dann Seite für Seite. Für die wichtigsten Seiten vorher Mockup-Varianten A/B/C, aus denen du wählst.
- Beweis: Vorher-nachher-Screenshots in jedem PR. Vorhandene Design-Skills des Projekts zuerst nutzen.

**2. Repo wieder gesund machen** (`repair-repo`: Doctor, Code-Review, Hygiene)
- Audit: läuft es aus einem sauberen Clone, stimmen README und CLAUDE.md, Abhängigkeiten (veraltet, verwundbar, ungenutzt), toter Code und Duplikate, Struktur und Dateigrößen, Testlücken auf kritischen Pfaden und flackernde Tests, Lint, Typen, Format, CI (Dauer, Kosten, Rechte, Geheimnisse), Git (alte Branches, große Dateien, `.gitignore`, Geheimnisse in der Historie), Fehlerbehandlung, Logging, Konfiguration.
- Playbook: Quick Wins zuerst, je ein PR. Riskantes wird ein Issue. Bei gevibecodetem Code zuerst Tests, die das jetzige Verhalten festhalten, dann der Umbau.
- Ergebnis: Gesundheitsbericht mit Note je Dimension.

**3. KI-Upgrade** (`upgrade`, der Schirm über beide)
- Deckt Werkzeuge, Repo und UI ab; es gibt keinen Schalter für Teile.
- Werkzeuge auf das neue Modell: CLAUDE.md, Skills, Hooks und Agents prüfen, Behelfe für schwächere Modelle entfernen, Prompts verschlanken (Längengrenzen und feste Überschriften kosten Qualität). Ruft das Projekt selbst ein Modell auf, wird die Modell-ID nie ohne Messung umgestellt; stattdessen entsteht eine Messung (Registrierung, Budget) oder ein Issue.
- Ehrgeiz anheben: das Repo mit frischem Blick auf alles ansehen, was früher zu schwer oder zu teuer war: größere Umbauten, fehlende Tests, Architektur, Performance.
- Stempel: `docs/ai-upgrade.md` hält Datum, Modell, Umfang und Playbook fest. Beim nächsten Lauf liest die Session ihn zuerst und macht nur den Unterschied. Mit demselben Modell geht es ebenso.

## Umsetzung im Band

Dateien: `hooks/colors.ts` (die drei Prompts mit dem gemeinsamen Rahmen `repairPrompt`, `PROMPT_INFO`, `ICON_SVG.repair`, `REPAIR_MENU_SVG`, `repairBreite`, `zaehlerBreite`), `hooks/register.tsx` (Feld `repair`, `repairEntries`, `toggleRepair`), `types/index.d.ts`, `hooks/projektfarben.test.tsx`, `README.md`, `CLAUDE.md`, `docs/PROMPTS.md`, `docs/prompts.html`. `ACTION_COUNT` ist 9; die Umschaltpunkte des Bands sind um ein Feld gewandert.

## Risiken und offene Punkte

- **Kosten:** Stufe 4 kann viele Worker starten. Die Kostenschätzung vor der Freigabe ist Pflicht und steht im Prompt.
- **Qualität der Prompts:** Ob die Session wirklich das tut, was der Prompt will, prüfen die Tests nicht (nur Text und Versand). Ein echter Lauf an einem kleinen Projekt zeigt es; danach nachschärfen.
