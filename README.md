# ClaudeColours

Ein Mod für die Claude-Desktop-App (Code-Tab): Jedes Projekt bekommt eine Farbe, und jede Session zeigt sie als Farbpunkt vor ihrem Namen. So sieht man in der Seitenleiste sofort, welche Session zu welchem Projekt gehört.

```
🟦 Fix the login bug
🟦 Write the docs
🟩 Release notes
🟧 Plan the next version
```

*English: a Claude Code mod that gives each project a color and puts it as an emoji in front of every session title in the desktop app's sidebar, adds a colored project band above the prompt, and a `/projektfarbe` command to change the color. A sleep mode (`/projektfarbe schlaf`) swaps the bright emoji for plain shapes and muted band colors. The interface is in German.*

## Was der Mod macht

- **Farbpunkt im Session-Namen:** Nach der ersten Antwort einer Session setzt der Mod den Farbpunkt ihres Projekts vor den Namen, den die App vergeben hat.
- **Band über dem Eingabefeld:** zeigt das Projekt in seiner Farbe, mit „Farbe ändern“ (Auswahl per Klick) und „ausblenden“.
- **`/projektfarbe`:** Farbe zeigen oder ändern. Eine Änderung benennt alle offenen Sessions des Projekts sofort mit um.
- **Schlafmodus:** `/projektfarbe schlaf` ersetzt die bunten Punkte durch ruhige Formen und das Band durch gedämpfte Farben. `/projektfarbe bunt` stellt alles zurück.

Als Projekt zählt der Ordner, in dem die Session läuft; ein Worktree unter `.claude/worktrees/` zählt zu seinem Repository.

## Installieren

In einer Terminal-Session von Claude Code:

```
/plugin install projektfarben --marketplace MaxeLBerger/ClaudeColours
```

`y` bestätigt den neuen Marketplace, dann den Bereich `user` wählen.

Aus einer Shell:

```bash
claude plugin install projektfarben --marketplace MaxeLBerger/ClaudeColours
```

In der Desktop-App, wo `/plugin` nicht läuft: auf **+** neben dem Eingabefeld klicken, dann **Plugins**, **Add marketplace** mit `MaxeLBerger/ClaudeColours`, dann **Add plugin**.

Sessions, die schon laufen, laden den Mod bei ihrem nächsten Start.

## Befehle

| Befehl | Wirkung |
|---|---|
| `/projektfarbe` | zeigt die Farbe dieses Projekts und alle Farben |
| `/projektfarbe <farbe>` | setzt sie (`rot`, `grün`, `lila`, `kreis-blau`, … oder das Emoji) und färbt alle Sessions des Projekts um |
| `/projektfarbe standard` | gibt dem Projekt die nächste freie Farbe |
| `/projektfarbe alle` | färbt alle offenen Sessions neu ein |
| `/projektfarbe band` | blendet das Band ein oder aus |
| `/projektfarbe schlaf` | schaltet den Schlafmodus ein und benennt alle offenen Sessions um |
| `/projektfarbe bunt` | schaltet zurück zu den bunten Farben und benennt alle offenen Sessions um |

Im Schlafmodus gelten die Namen des Schlafmodus (`/projektfarbe moos`), im bunten Modus die bunten.

18 Farben: 🟦 🟩 🟧 🟪 🟥 🟨 🟫 ⬛ ⬜ und 🔵 🟢 🟠 🟣 🔴 🟡 🟤 ⚫ ⚪.

## Schlafmodus

Der Schlafmodus nimmt den Farben die Reizwirkung, ohne die Projekte schwerer unterscheidbar zu machen. Er nutzt den Satz „Dämmerung“ mit 10 Formen und gedämpften Farben:

| Form | Name | Form | Name |
|---|---|---|---|
| ⬤ | `nebel` | ◐ | `petrol` |
| ■ | `sand` | ◑ | `ton` |
| ▲ | `altrosa` | ⬢ | `salbei` |
| ◆ | `moos` | ▣ | `schiefer` |
| ▼ | `flieder` | ✚ | `mauve` |

- **Seitenleiste:** Ein Session-Name ist reiner Text und lässt sich nicht einfärben, und die Emoji-Farben bestimmt das Betriebssystem (Mondphasen und mehrere Natur-Emoji sind unter Windows kräftig bunt). Deshalb steht vor dem Namen eine einfarbige Form, und die Form trennt die Projekte.
- **Band und Farbwahl:** zeigen dieselbe Form in der gedämpften Farbe, ohne Fettschrift.
- Jedes Projekt merkt sich seine Farbe pro Modus. Beim Zurückschalten hat es wieder seine bunte Farbe.

## Wie die Farben vergeben werden

- Ein neues Projekt bekommt die nächste Farbe, die noch kein anderes Projekt hat (erst die hellen Quadrate, dann die hellen Kreise, dann der Rest). Sind alle 18 vergeben (im Schlafmodus alle 10), entscheidet der Projektname.
- Beim ersten Start übernimmt der Mod die Farbpunkte, die schon in der Seitenleiste stehen: Pro Projekt gilt der Punkt, den die meisten seiner Sessions tragen.
- Deine Farben speichert der Mod lokal in seinem eigenen Speicher unter deinem Claude-Code-Konfigurationsordner. Nichts verlässt deinen Rechner: Der Mod spricht nur mit den lokalen Session-Werkzeugen der Desktop-App.

## Grenzen

- Die Seitenleiste selbst färbt kein Mod: Die Projekt-Überschriften bleiben grau, die Farbe steht im Session-Namen.
- Umbenennen geht nur in der Desktop-App. In einer Terminal-Session zeigt der Mod nur das Band.
- Hast du einen Session-Namen selbst vergeben, fragt die App einmal nach, bevor der Mod den Farbpunkt davorsetzt. Sagst du nein, fragt sie für diesen Namen nicht wieder.
- Sortierst du die Seitenleiste nach Namen, ordnet sie nach Farbe (im Schlafmodus nach Form).
- Das Umschalten zwischen bunt und Schlafmodus benennt alle offenen Sessions um; bei Namen, die du selbst vergeben hast, fragt die App wieder nach.
- Im Schlafmodus gibt es 10 Plätze statt 18, weil sich gedämpfte Farben weniger weit voneinander entfernen lassen. Mit mehr Projekten wiederholen sich Formen und Farben.
- Die Bandfarben des Schlafmodus sind für dunkle Terminal-Hintergründe gewählt; auf hellem Grund wirken sie blass.
- Ein Name, der selbst mit einer dieser Formen und einem Leerzeichen beginnt (zum Beispiel `■ Aufgaben`), wird vom Mod wie eine Farbmarke behandelt.

## Entwickeln

```bash
claude plugin validate .
claude plugin test .
```

## Lizenz

MIT, siehe [LICENSE](LICENSE).
