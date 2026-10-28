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
- **Band über dem Eingabefeld:** zeigt das Projekt mit einem Farbblock in seiner Farbe und dem Namen in der Schrift deines Themes. Dazu die Aktionen als Symbole (Opus-Meinung, Review + PR, Handoff, Prüfen, Merge) und rechts außen die Übersicht und das Zahnrad für die Einstellungen (Farbe wählen per Klick, Modus, Band ausblenden).
- **Unabhängige Opus-Meinung:** Der Knopf „Opus-Meinung“ (im Band `✦`, das erste Symbol links) schickt der Session sofort die Bitte, die du sonst selbst tippst. Die Session entscheidet aus dem Gespräch, was gemeint ist (deine letzte Frage, ein Plan, den du überarbeitet haben willst, oder der Stand des Projekts), und startet einen Opus-Subagenten, dem sie nur die Sache selbst mitgibt, nicht ihre eigene Schlussfolgerung und keinen Gesprächsverlauf. Den Rest liest er selbst im Repository nach. Die Antwort steht unverändert im Chat, darunter sagt die Session kurz, wo sie anderer Meinung ist. Das kostet einen Opus-Lauf und dauert einige Minuten.
- **Review + PR:** Der Knopf „Review + PR“ (im Band `↑`) schickt der Session sofort die Bitte, die Änderungen bis zum Pull Request zu bringen: erst prüfen (Diff seit dem Basis-Branch, echte Befunde beheben, Tests laufen lassen), dann sinnvoll committen, dann den Branch pushen und den PR mit Beschreibung öffnen; am Ende nennt sie den Link. Der Druck auf den Knopf gilt als Freigabe für genau diese drei Schritte: gemergt wird nicht, auf den Basis-Branch wird nicht gepusht, nie mit force. Geht ein Schritt nicht (Tests rot, nichts zu committen, ein Befund, der deine Entscheidung braucht), hält die Session an und sagt, woran es liegt.
- **Handoff:** Der Knopf „Handoff“ (im Band der fliegende Brief, im Terminal `✉`) schickt der Session sofort die Bitte, eine Übergabe für eine frische Session zu schreiben: Ziel, was erledigt und entschieden ist (mit Grund), was offen ist und womit es weitergeht, Risiken und die betroffenen Dateien, Branches oder PRs. Was die neue Session im Repository selbst lesen kann, lässt sie weg. Der Text ist so geschrieben, dass du ihn unverändert als erste Nachricht in eine neue Session einfügen kannst; die Session ändert und startet dabei nichts.
- **Merge:** Der Knopf „Merge“ (im Band das Merge-Zeichen mit grünem Haken, daneben klein hochgestellt die Zahl der offenen PRs) schickt der Session sofort die Bitte, die offenen PRs sinnvoll in den Hauptzweig zu bringen und passende Issues gleich mit zu lösen: erst die unabhängigen PRs, dann die, die darauf aufbauen; gemergt wird, was grüne Checks hat, ein eindeutiger Konflikt wird gelöst. Danach löst sie die Issues, die klar und klein genug sind oder die der neue Stand schon erledigt, jedes in einem eigenen PR, und mergt auch diese bei grünen Checks. Die Grenzen sind fest: kein Force-Push, keine Änderung an der Historie des Hauptzweigs, keine Entwürfe. Was rot ist oder deine Entscheidung braucht, bleibt liegen und wird mit dem Grund genannt; am Ende steht eine kurze Liste.
- **Prüfen (e2e):** Der Knopf „Prüfen“ (im Band der Schriftzug „e2e“ mit grüner 2, im Terminal `✓`) schickt der Session sofort die Bitte, die Änderung in vier Schritten zu prüfen: Lint, Typprüfung und Format der geänderten Dateien, dann Tests für die Pfade des Diffs, die noch keiner abdeckt (Tests, die ohne die Änderung rot wären), dann der echte Ablauf im Browser mit Playwright und zuletzt, wo ein Docker-Stack läuft, ein Blick in seine Container und Logs. Fehlt Playwright, richtet die Session es minimal ein und sagt, was sie installiert hat; was das Projekt an Skills und Skripten dafür hat, nutzt sie zuerst. Bestehende Snapshots werden bei Abweichungen gemeldet, nicht erneuert. Die Grenzen sind fest: kein Push, kein Merge, keine gelöschten oder abgeschwächten Tests.
- **Stack neu bauen:** Wo im Projektordner eine Compose-Datei liegt (`docker-compose.yml`, `compose.yaml` und ihre `override`-Formen), erscheint links vor „Prüfen“ der Knopf „Stack neu bauen“ (im Band das Docker-Logo mit grünem Kreispfeil, im Terminal `▣`). Er schickt der Session die Bitte, den Docker-Stack auf dem Stand dieses Ordners neu zu bauen: erst nachsehen, ob der Stack gegen ein Live-Konto oder mit einer Live-Freigabe läuft (dann hält sie an und fragt), dann `docker compose -p <Projektname> up -d --build`, danach Health und Stand prüfen. Die Grenzen sind fest: kein `down -v`, keine Volumes oder Daten gelöscht, keine fremden Container angefasst.
- **Das Band passt sich der Breite an:** Wo der Platz reicht, steht alles in einer Zeile: links Name, dann die Aktionen als Symbole, dann PRs und Issues; rechts der Kontext-Ring mit Übersicht und Zahnrad. Die Symbole links in dieser Reihenfolge: Opus-Meinung (Doktorhut), Review + PR (Pull Request mit Lupe), Handoff (fliegender Brief), Stack neu bauen (Docker-Logo, nur mit Compose-Datei), Prüfen („e2e“), Merge (Merge-Zeichen mit grünem Haken und der Zahl offener PRs). Rechts neben dem Kontext-Ring stehen Übersicht (drei Linien) und Einstellungen (Zahnrad: Farbe wählen, Modus wechseln, Band ausblenden). Mit Compose-Datei sind es acht Symbole statt sieben, das Band braucht dann entsprechend mehr Platz. Was ein Symbol tut, steht in der Karte, die beim Darüberfahren erscheint. Wird es enger, rücken zuerst die Elemente enger zusammen, und zuletzt bleibt vom Kontext nur der Ring ohne Prozentwert. Alles bleibt dabei in einer Zeile und der Kontext-Ring in der ersten. Reicht auch das nicht, gibt es zwei Zeilen: oben Name, PRs und Issues mit dem Kontext-Ring rechts, darunter links die Aktionen und rechts Übersicht und Zahnrad; ein zu langer Projektname wird dann mit „…“ gekürzt. Das Band hat nie mehr als zwei Zeilen. `/projektfarbe breite` sagt, wie breit das Band gerade ist und in welchem Layout es gezeichnet wird.
- **Kontext-Ring im Band:** ein Ring mit Prozentwert zeigt, wie voll das Kontextfenster nach der letzten Antwort ist: grau unter 70 %, bernsteinfarben ab 70 %, rot und mit fettem Prozentwert ab 85 %. Der Ring ist ein Symbol wie die anderen und anklickbar: ein Klick komprimiert den Kontext, genau wie `/compact` (derselbe Aufruf der Engine, kein Prompt an das Modell). Die Karte beim Darüberfahren nennt die Tokens („Kontext 126k von 1M“). Der Klick meldet in einer Benachrichtigung, was gespart wurde, oder warum nichts passiert ist. Der Mod liest die Anzeige aus den Werten, die Claude Code ohnehin hat; nur das Komprimieren selbst kostet eine Zusammenfassung wie `/compact`.
- **Farbpunkt am Spinner:** Während Claude arbeitet, steht der Farbpunkt des Projekts vor der Statuszeile („🟦 Sauteing…“).
- **Offene PRs und Issues im Band:** Direkt hinter dem Projektnamen, vor der Kontext-Anzeige, steht `PRs: 2  Issues: 7`, die Zahl der offenen Pull Requests und Issues des Repositories dieses Projekts (ab 100 als `100+`). Der Mod fragt dafür im Hintergrund `gh pr list` und `gh issue list` ab: beim Start der Session und danach höchstens alle 5 Minuten nach einer Antwort. Ohne angemeldetes `gh`, ohne GitHub-Repository oder ohne eingeschaltete Issues zeigt das Band dort ein graues `?` (unbekannt, nicht „keine“), damit es immer gleich aussieht; `/projektfarbe` sagt dann, woran es liegt.
- **Neue Einträge als „+x“:** Sind seit deinem letzten Blick neue PRs oder Issues dazugekommen, steht ihre Zahl klein und farbig hochgestellt hinter der Zahl, etwa `PRs: 4⁺²`. Neu ist, was eine höhere Nummer hat als die höchste, die du schon gesehen hast. Beim ersten Mal gilt alles Offene als gesehen. Ein Klick auf `PRs` oder `Issues` öffnet die Liste (in Bramble, siehe unten, sonst im Standardbrowser über `gh pr list --web` / `gh issue list --web`) und nimmt das „+x“ weg, in allen Sessions desselben Repositorys. Was du gesehen hast, merkt sich der Mod pro Repository-Ordner; zwei Repositorys mit gleichem Ordnernamen kommen sich also nicht in die Quere.
- **Klick auf den Projektnamen:** Farbblock und Name sind ein Link auf das Repository bei GitHub. Die Adresse liest der Mod einmal pro Ordner mit `gh repo view`; kennt `gh` sie nicht, bleibt der Name ein normaler Text.
- **Links in Bramble:** Gibt es einen Release-Build von Bramble (`target\release\bramble.exe`), öffnen Projektname, `PRs` und `Issues` ihre GitHub-Seite dort statt im Standardbrowser. Der Mod sucht bei jedem Klick den neuesten Build, nach Änderungsdatum, im Bramble-Repository und in allen seinen Worktrees (`.claude\worktrees\*`). Das Repository liegt unter `Dokumente\Repositories\LightWeightBrowser`; woanders zeigt die Umgebungsvariable `BRAMBLE_REPO` darauf. Bramble läuft dafür mit einem eigenen Profil `projektfarben`, damit ein Link nie deine gespeicherten Tabs überschreibt; dort musst du dich bei GitHub einmal eigens anmelden. Links aus dem Band starten Bramble ohne den eingebauten Werbeblocker (uBlock Origin Lite), damit es schlank bleibt. Ohne Build bleibt alles wie oben.
- **`/projektfarbe`:** Farbe zeigen oder ändern. Eine Änderung benennt alle offenen Sessions des Projekts sofort mit um.
- **Stand aller Sessions (`/projektfarbe status`):** listet alle offenen Sessions, nach Projekt gruppiert (mit Projektfarbe), das Dringendste zuerst. Pro Zeile: Zeichen, Name ohne Farbpunkt, Stand und wann zuletzt etwas passiert ist:

  ```
  🟦 Alpha
    ⚠ Login — abgebrochen · PR #11 offen, Review wartet · vor 2 Std
    🔀 Suche — PR #9 offen, CI rot · vor 20 Min
    ▶ Status bauen (diese) — läuft · gerade eben
    💤 Alte Idee — ruht seit 5 Tagen, kein PR · vor 5 Tagen
  ```

  | Zeichen | Stand |
  |---|---|
  | ⚠ | letzte Antwort abgebrochen oder mit Fehler beendet (eine neue Antwort hebt das auf; nach 3 Tagen ohne Aktivität ruht die Session stattdessen, und ein gemergter oder geschlossener PR geht vor) |
  | 🔀 | PR offen, mit „CI rot“ (ein abgebrochener Lauf zählt nicht dazu), „Änderungen gewünscht“, „Review wartet“ oder „Entwurf“, wenn zutreffend |
  | ✎ | in Arbeit, noch kein PR |
  | ▶ | läuft gerade |
  | ✓ / ✖ | PR gemerged / geschlossen (selten: die App archiviert solche Sessions meist selbst) |
  | 💤 | seit mehr als 3 Tagen nichts passiert und kein PR: Kandidat zum Archivieren |

  Den PR nimmt der Mod zuerst von der App, die ihn der Session selbst zuordnet. `gh pr list` liefert dazu CI, Review und Entwurf und findet den PR über den Branch, wenn die App keinen kennt. Pro Repository sind das zwei Abfragen: die offenen PRs mit ihren Checks und alle PRs nur mit Nummer, Stand und Branch, damit GitHub die teuren Checks nur für die offenen liefern muss. Bei mehreren PRs auf einem Branch zählt der neueste. Jede Session merkt sich dafür nach jeder eigenen Antwort, wie sie endete (Antwort, abgebrochen, Fehler).
- **Übersicht als Seitenpanel (`/projektfarbe übersicht`, auch `uebersicht`, oder der Knopf `Übersicht ☰` im Band):** dieselben Daten wie `/projektfarbe status`, rechts neben dem Chat. Standardmäßig nach Status in fünf Bereichen: **⚠ Braucht dich: Problem** (rot; abgebrochen, Fehler, PR mit roter CI oder gewünschten Änderungen), **💬 Du bist dran: Claude wartet** (gelb; die Session steht, Claude ist mit seiner Antwort fertig), **🔀 PR wartet auf Review oder Merge**, **▶ Läuft, nichts zu tun** und **🧹 Aufräumen** (gemergte oder geschlossene PRs, ruhende Sessions); leere Bereiche fehlen. Die beiden ersten sind das, was deine Hilfe braucht, und stehen oben; die Zusammenfassung zählt sie als „dringend“ und „warten auf dich“. Jede Session hat zwei Zeilen und links eine Leiste in der Farbe ihres Bereichs (rot, gelb): oben Zeichen, Projektfarbe, Name und Projekt, rechts die Knöpfe `öffnen ↗` (öffnet die Session in der App) und `archivieren`; darunter der Stand in seiner Farbe (rot Problem, gelb du bist dran, grün läuft, violett gemergt) und das Alter. Ein Klick auf das Dreieck vor einer Überschrift klappt den Bereich zu oder auf; „Läuft, nichts zu tun“ ist zu Beginn zugeklappt. Oben stehen die Knöpfe (die Ansicht steht fett daneben) und die Zusammenfassung als farbige Zählmarken, etwa „12 Sessions · 2 dringend · 3 warten auf dich · 4 mit offenem PR · 2 ruhen“. Der Knopf `nach Projekt` gruppiert stattdessen je Projekt (Kopfzeile mit Farbblock, Emoji, Name, Anzahl; Projekte mit Dringendem zuerst). Weitere Knöpfe: `aktualisieren`, `schließen` und bei 💤 ruht sowie ✓ / ✖ (PR gemerged oder geschlossen) `archivieren`: Die App fragt dich dann selbst; sagst du nein, bleibt die Zeile und eine Meldung sagt es. Die Session, in der das Panel läuft, lässt sich nicht archivieren. Das Panel lädt beim Öffnen, per Knopf und, solange es offen ist, nach einer Antwort höchstens einmal pro Minute neu; `gh` fragt es dabei höchstens alle 5 Minuten pro Repository, nur `aktualisieren` fragt sofort. Im Schlafmodus steht in der Projekt-Kopfzeile nur die Form, denn sie ist dort schon der Farbblock. Wo kein Panel Platz hat (Terminal), druckt der Befehl stattdessen den Text von `/projektfarbe status`.
- **Schlafmodus:** `/projektfarbe schlaf` ersetzt die bunten Punkte durch ruhige Formen und das Band durch gedämpfte Farben. `/projektfarbe bunt` stellt alles zurück.
- **Wechsel in der Farbwahl:** Unter den Farben der Einstellungen (Zahnrad) steht, mit etwas Abstand, die Zeile „Modus“: ein Emoji und der Name je Modus (`🎨 Bunt`, `🌙 Dämmerung`). Der aktive Modus ist fett, die anderen sind gedimmt; jeder weitere Modus bekommt ein eigenes Emoji und reiht sich in die Zeile ein. Ein Klick auf den anderen Modus schaltet um und benennt alle offenen Sessions um; ein Klick auf den aktiven Modus tut nichts.

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
| `/projektfarbe` | zeigt die Farbe dieses Projekts, die offenen PRs und Issues mit den neuen (oder warum eine Zahl fehlt) und alle Farben |
| `/projektfarbe <farbe>` | setzt sie (`rot`, `grün`, `lila`, `kreis-blau`, … oder das Emoji) und färbt alle Sessions des Projekts um |
| `/projektfarbe standard` | gibt dem Projekt die nächste freie Farbe |
| `/projektfarbe alle` | färbt alle offenen Sessions neu ein |
| `/projektfarbe status` | zeigt den Stand aller offenen Sessions nach Projekt: läuft, abgebrochen, PR offen, in Arbeit, ruht … |
| `/projektfarbe übersicht` | öffnet die Übersicht aller Sessions als Seitenpanel (ohne Platz dafür: dieselbe Auskunft als Text) |
| `/projektfarbe band` | blendet Band, Kontext-Anzeige, PR- und Issue-Zahl und den Farbpunkt am Spinner ein oder aus |
| `/projektfarbe breite` | zeigt, wie viele Zellen das Band hat, in welchem Layout es gezeichnet wird (`icons`, `dicht`, `minimal`, `zwei`) und wie viele Zellen die Layouts in einer Zeile brauchen; ist das Band ausgeblendet, sagt der Befehl das und nennt `/projektfarbe band` zum Einblenden |
| `/projektfarbe prompts` | gibt die Prompts hinter den Band-Knöpfen (Opus-Meinung, Review + PR, Handoff, Merge, Prüfen, Stack neu bauen) als Text aus, mit je einer Zeile, was der Knopf tut, und den Punkten, die ein Review prüft; dieselbe Ausgabe steht in `docs/PROMPTS.md`, eine lesbare Seite dazu in `docs/prompts.html` |
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
- Deine Farben speichert der Mod lokal in seinem eigenen Speicher unter deinem Claude-Code-Konfigurationsordner. Der Mod selbst spricht nur mit den lokalen Session-Werkzeugen der Desktop-App und startet `gh`; nur `gh` redet dabei mit GitHub, mit deiner eigenen Anmeldung.

## Grenzen

- Die Seitenleiste selbst färbt kein Mod: Die Projekt-Überschriften bleiben grau, die Farbe steht im Session-Namen.
- Umbenennen geht nur in der Desktop-App. In einer Terminal-Session zeigen sich nur Band, Kontext-Anzeige und Spinner-Punkt.
- Der Kontext-Ring aktualisiert sich nach jeder Antwort. Nach dem Komprimieren zeigt er „–“, bis die nächste Antwort wieder einen Wert liefert. Komprimieren geht nur zwischen zwei Antworten: läuft gerade eine, sagt die Benachrichtigung das. Vor der ersten Antwort einer Session zeigt der Ring nichts. In einem Ordner ohne Projekt erscheint das Band und damit die Anzeige nicht.
- Zieht man das Fenster schmaler oder breiter, zeichnet die App das Band erst nach einer kurzen Pause neu; bis dahin ist sein rechter Rand kurz abgeschnitten, statt dass es in zwei Zeilen umbricht. Wer einmal in einem engeren Layout ist, geht erst ein paar Zeichen später zum weiteren zurück, damit es an einer Schwelle nicht hin- und herspringt.
- Die Breite des Bandes ist eine Schätzung: Die Schrift der Desktop-App hat keine feste Zeichenbreite, der Mod rechnet mit gemessenen Näherungswerten (im Terminal ist ein Zeichen genau eine Zelle, dort rechnet er entsprechend). Springt das Band zu früh oder zu spät auf das nächste Layout, zeigt `/projektfarbe breite` die Zellenzahl, mit der er rechnet. Die Symbole im Band zeigen beim Überfahren eine kleine Karte mit ihrem Namen neben sich (bei den Aktionen links rechts vom Symbol, bei Übersicht und Zahnrad links davon) (die App zeichnet Karten nur innerhalb des Bandes); wo ein Zeiger fehlt, steht ihre Bedeutung in `/projektfarbe`.
- PR- und Issue-Zahl zählen alle offenen Einträge des Repositories, nicht nur die dieser Session. Läuft `gh` in der Desktop-App nicht, steht dort `0`; ob es wirklich keine gibt, zeigt `/projektfarbe`.
- Das „+x“ zählt auch PRs und Issues, die du selbst angelegt hast. Es verschwindet nur über den Klick auf die Zahl; die Liste nur im Browser zu öffnen reicht nicht. In anderen Sessions geht es mit deren nächster Antwort weg.
- `/projektfarbe status` sieht nicht, ob eine Session auf deine Eingabe wartet (eine Rückfrage, eine Freigabe): Die App verrät das dem Mod nicht. Eine solche Session erscheint als „in Arbeit“ oder mit ihrem PR.
- Ob eine Antwort abgebrochen wurde, weiß der Mod erst für Antworten nach diesem Update; ältere Sessions zeigen ihren Stand ohne diese Angabe. Sessions, die gerade nicht geladen sind (etwa nach einem Neustart der App), merken sich ihren Stand erst mit ihrer nächsten Antwort.
- `/projektfarbe status` geht nur in der Desktop-App. Ohne angemeldetes `gh` fehlen CI- und Review-Angaben; die Ausgabe sagt dann, für welches Projekt.
- Bramble nimmt eine Adresse nur beim Start an: Jeder Klick öffnet ein neues Bramble-Fenster, kein Tab im offenen. Mit Bramble ist der Projektname ein Knopf, den die Desktop-App ohne Fettdruck zeichnet; der Farbblock steht davor und ist selbst nicht anklickbar.
- `öffnen ↗` im Panel übergibt die `claude://`-Adresse der Session an das Betriebssystem (Windows `rundll32`, sonst `open` oder `xdg-open`), weil `open_session_in` der App nur für die eigene und selbst gestartete Sessions wirkt und das Panel keine anderen Links als `https:` zeigt. Klappt das nicht, sagt eine Meldung es; dann bleibt die Seitenleiste.
- „Du bist dran“ heißt nur: Die Session steht und ist in Arbeit. Ob Claude etwas gefragt hat oder einfach fertig ist, verrät die App dem Mod nicht.
- Das Panel braucht eine Oberfläche, die Panels platziert (Desktop-App). Im Terminal gibt `/projektfarbe übersicht` den Text aus. Archivieren fragt die App bei jedem Aufruf selbst; im Modus „Bypass“ oder „Auto“ geht es dort ohne Nachfrage durch.
- Der Speicher des Mods schreibt nicht atomar: Beenden zwei Sessions im selben Moment eine Antwort, kann der Stand der einen verloren gehen (sie meldet ihn mit der nächsten Antwort wieder). Dasselbe gilt für das „+x“.
- Der Prozentwert ist der von Claude Code gemeldete Füllstand des Fensters; er kann von der Zahl in `/context` leicht abweichen.
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
