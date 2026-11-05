# Plan: fünf Knöpfe für das IssueBoard

Stand: 2026-11-05. Status: Plan, noch nichts gebaut. Er gehört zum IssueBoard-Repo und liegt vorerst hier, weil er aus der Arbeit am Band entstanden ist (siehe `repair-im-band.md` und `extension-politur.md` im Branch `claude/capitalcombo-board-skills-36ced0`). Quelle: die Auswertung von rund 530 getippten Prompts aus den CapitalCombo-Sessions und die Rückmeldungen dazu.

## Ziel

Prompts, die du immer wieder schickst, aber nie wörtlich gleich, werden zu Knöpfen, die den Kontext selbst mitbringen. Das Band im Mod `projektfarben` deckt alles ab, was für jedes Projekt gilt (Review + PR, Merge, Prüfen, Reparieren, Zweitmeinung). Das **IssueBoard** deckt, was an einer Karte oder einem Plan hängt.

Nicht gebaut werden: Merge-Zug, Halten und Live schalten (gestrichen). Die Ein-Wort-Freigaben („Ja“, „Ja, mergen“) decken die Ja/Nein-Knöpfe unter der Chat-Nachricht ab (im Mod, PR 20).

## Fünf Knöpfe im IssueBoard


Eigenes Repo (IssueBoard), eigene Vorschau. Die Icons liegen als Entwürfe in `docs/plans/board-icons/` (je eine SVG-Datei, dazu `index.html` zum Ansehen: nur die Symbole, die Beschreibung beim Darüberfahren). Die Aktionen sind eine reine Tabelle (`public/aktionen.mjs`: Schlüssel, Ort, Sichtbarkeit, Icon, Prompt aus dem Kartenkontext), die Icons liegen im vorhandenen SVG-Sprite. Der Server rendert den Prompt aus der Karte, der Browser kopiert ihn und zeigt einen Toast; eine Session startet weiterhin die Session, in die du ihn einfügst.

| Knopf | Ort | Inhalt |
|---|---|---|
| **Starten und Welle** | Karte in „bereit“, Spaltenkopf | Eigene Session mit Branch und PR je Issue. Modell nach `## Größe` (klein Haiku, mittel Sonnet, groß oder riskant Opus). Welle nach „Hängt ab von“, die nächste erst bei grüner CI auf main. |
| **Trader fragen** | Kopfzeile, Plan, Abnahme | Fable als erfahrener Trader. (a) Check des Ganzen: läuft das, was wir tun, gut, was würde er nicht trauen, was fehlt. (b) In der Abnahme ein Vorschlag je Punkt („Ja, Nein, Frage, weil …“ mit Beleg) und ein Knopf „Vorschlag übernehmen“. Er setzt keine Haken selbst; bei Geldpfaden bleibt es bei deinem Klick, pro Plan abschaltbar. Das Urteil bewertet Plausibilität und Belege, keine Rendite. |
| **Fertig?** | Karte, Plan, Kopfzeile | Prüft Issues, PRs, CI, Branches, Subsessions und ob eine andere Session dasselbe tut. Reste werden Issues (nach Dublettenprüfung), Erledigtes wird mit Beleg geschlossen. Löschen und Archivieren zeigt es zuerst als Liste. |
| **Überblick** | Karte, Plan, Session | Neue günstige Session (Sonnet oder Haiku) füllt einen kleinen JSON-Block (`issueboard/uebersicht/v1`: was passiert ist, entschieden, offene Entscheidungen einfach erklärt mit Empfehlung, was zu tun ist). `public/uebersicht.mjs` rendert daraus eine selbständige HTML-Seite im Look des Boards mit Inline-SVGs, ohne Netzwerk, lokal unter `.cache/uebersicht/`. Als Artefakt veröffentlichen nur auf Wunsch. |
| **Plan gegenprüfen** | Plan-Chip | Frische Session sieht nur die Plan-Datei und das Repo, prüft ohne Vorwissen (Machbarkeit, messbares „nicht schlechter“, Überschneidung mit anderen Plänen, Lücken, Kosten) und hängt die Befunde als Abschnitt an die Plan-Datei, ohne Code zu ändern. Opus, bei Geldpfaden Fable. |

Tests: Aktionstabelle und Sichtbarkeit, `traderVorschlag` (kein Haken ohne Klick), Renderer des Überblicks gegen ein festes JSON, Plan-Erkennung. README und CLAUDE.md des Boards nachziehen.

## Risiken und offene Punkte

- **Zustellung:** Der Browser kann Claude nicht direkt anstoßen. Die Prompt-Knöpfe kopieren den Text, eine Session muss ihn aufnehmen; eine neue Session kann nur Claude selbst starten. Schreibaktionen über `gh` (Label, Kommentar) gehen ohne Dienst.
- **Qualität der Prompts:** Ob die Session wirklich das tut, was der Prompt will, prüfen Tests nicht (nur Text und Versand). Ein echter Lauf an einem kleinen Projekt zeigt es.
- **Trader fragen:** Ein Modell als Trader beurteilt Plausibilität und Belege, keine Rendite. Einen echten Vorteil belegt nur eine registrierte Messung.
- **Gestrichen:** Merge-Zug, Halten, Live schalten. Wer sie später braucht, kann sie nachziehen; die Aktionstabelle macht das zu einem Eintrag.
