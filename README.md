# ClaudeColours

Ein Mod für die Claude-Desktop-App (Code-Tab): Jedes Projekt bekommt eine Farbe, und jede Session zeigt sie als Farbpunkt vor ihrem Namen. So sieht man in der Seitenleiste sofort, welche Session zu welchem Projekt gehört.

```
🟦 Fix the login bug
🟦 Write the docs
🟩 Release notes
🟧 Plan the next version
```

*English: a Claude Code mod that gives each project a color and puts it as an emoji in front of every session title in the desktop app's sidebar, adds a colored project band above the prompt, and a `/projektfarbe` command to change the color. The interface is in German.*

## Was der Mod macht

- **Farbpunkt im Session-Namen:** Nach der ersten Antwort einer Session setzt der Mod den Farbpunkt ihres Projekts vor den Namen, den die App vergeben hat.
- **Band über dem Eingabefeld:** zeigt das Projekt mit einem Farbblock in seiner Farbe und dem Namen in der Schrift deines Themes. Dazu „Farbe ändern“ (Auswahl per Klick) und „ausblenden“.
- **Kontext-Anzeige im Band:** ein Balken mit Prozentwert zeigt, wie voll das Kontextfenster nach der letzten Antwort ist: grau unter 70 %, in der Warnfarbe deines Themes ab 70 %, in der Fehlerfarbe und mit fettem Prozentwert ab 85 % (dann ist `/compact` fällig). Der Mod liest dafür nur die Werte, die Claude Code ohnehin hat; es entstehen keine Modellaufrufe und keine Kosten.
- **Farbpunkt am Spinner:** Während Claude arbeitet, steht der Farbpunkt des Projekts vor der Statuszeile („🟦 Sauteing…“).
- **Offene PRs im Band:** Rechts neben der Kontext-Anzeige steht `PRs: 2`, die Zahl der offenen Pull Requests des Repositories dieses Projekts (ab 100 als `100+`). Der Mod fragt dafür im Hintergrund `gh pr list` ab: beim Start der Session und danach höchstens alle 5 Minuten nach einer Antwort. Ohne angemeldetes `gh` oder ohne GitHub-Repository bleibt die Zahl weg; `/projektfarbe` sagt dann, woran es liegt.
- **Repo-Button:** Der kleine Button „Repo ↗“ neben der PR-Zahl öffnet das Repository auf GitHub im Standardbrowser deines Systems (über `gh repo view --web`), nicht im Browser der App.
- **`/projektfarbe`:** Farbe zeigen oder ändern. Eine Änderung benennt alle offenen Sessions des Projekts sofort mit um.

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
| `/projektfarbe` | zeigt die Farbe dieses Projekts, die offenen PRs (oder warum die Zahl fehlt) und alle Farben |
| `/projektfarbe <farbe>` | setzt sie (`rot`, `grün`, `lila`, `kreis-blau`, … oder das Emoji) und färbt alle Sessions des Projekts um |
| `/projektfarbe standard` | gibt dem Projekt die nächste freie Farbe |
| `/projektfarbe alle` | färbt alle offenen Sessions neu ein |
| `/projektfarbe band` | blendet Band, Kontext-Anzeige, PR-Zahl und den Farbpunkt am Spinner ein oder aus |

18 Farben: 🟦 🟩 🟧 🟪 🟥 🟨 🟫 ⬛ ⬜ und 🔵 🟢 🟠 🟣 🔴 🟡 🟤 ⚫ ⚪.

## Wie die Farben vergeben werden

- Ein neues Projekt bekommt die nächste Farbe, die noch kein anderes Projekt hat (erst die hellen Quadrate, dann die hellen Kreise, dann der Rest). Sind alle 18 vergeben, entscheidet der Projektname.
- Beim ersten Start übernimmt der Mod die Farbpunkte, die schon in der Seitenleiste stehen: Pro Projekt gilt der Punkt, den die meisten seiner Sessions tragen.
- Deine Farben speichert der Mod lokal in seinem eigenen Speicher unter deinem Claude-Code-Konfigurationsordner. Der Mod selbst spricht nur mit den lokalen Session-Werkzeugen der Desktop-App und startet `gh`; nur `gh` redet dabei mit GitHub, mit deiner eigenen Anmeldung.

## Grenzen

- Die Seitenleiste selbst färbt kein Mod: Die Projekt-Überschriften bleiben grau, die Farbe steht im Session-Namen.
- Umbenennen geht nur in der Desktop-App. In einer Terminal-Session zeigen sich nur Band, Kontext-Anzeige und Spinner-Punkt.
- Die Kontext-Anzeige aktualisiert sich nach jeder Antwort, nach `/compact` also erst mit der nächsten. Vor der ersten Antwort einer Session zeigt sie nichts. In einem Ordner ohne Projekt erscheint das Band und damit die Anzeige nicht.
- Die PR-Zahl zählt alle offenen Pull Requests des Repositories, nicht nur die dieser Session. Läuft `gh` in der Desktop-App nicht, bleibt sie weg.
- Der Prozentwert ist der von Claude Code gemeldete Füllstand des Fensters; er kann von der Zahl in `/context` leicht abweichen.
- Hast du einen Session-Namen selbst vergeben, fragt die App einmal nach, bevor der Mod den Farbpunkt davorsetzt. Sagst du nein, fragt sie für diesen Namen nicht wieder.
- Sortierst du die Seitenleiste nach Namen, ordnet sie nach Farbe.

## Entwickeln

```bash
claude plugin validate .
claude plugin test .
```

## Lizenz

MIT, siehe [LICENSE](LICENSE).
