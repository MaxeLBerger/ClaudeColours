# Prompts hinter den Band-Knöpfen

Jeder Knopf schickt der Session den Text als eigene Nachricht (`$.prompt.submit` mit `asUser`). `{Projekt}` steht für den Projektnamen. Die Texte stehen in `hooks/colors.ts`; diese Ausgabe kommt von `/projektfarbe prompts`.

## Fable fragen (`meinung`)

Fragt Fable: eine unabhängige zweite Meinung zur letzten Frage, zu einem Plan oder zum Stand des Projekts, ein Review der Änderungen oder eine offene Frage.

Prüfen:
- Der Subagent bekommt die Sache selbst, nicht die Schlussfolgerung der Session und keinen Gesprächsverlauf.
- Das Modell ist der Alias `fable` (eine volle Modell-ID wird vom Agent-Werkzeug abgelehnt).
- Ein Review hier ändert nichts: Fixes, Commit und PR bleiben beim Knopf Review + PR.
- Keine Zeilengrenze, keine feste Gliederung, kein Leseverbot.

```text
Frag Fable zu dem, worum es in diesem Gespräch gerade geht: eine unabhängige zweite Meinung zu meiner letzten Frage, zu dem Plan, den wir haben, oder zum Stand von „{Projekt}“, ein Review der Änderungen oder die Antwort auf eine Frage, die offen ist. Du entscheidest, was gemeint ist.

Starte dafür mit dem Agent-Tool einen Subagenten (subagent_type general-purpose, model fable) und baue seinen Auftrag selbst zusammen:
- Gib ihm die Sache selbst mit, über die er urteilen soll: die Frage, den Plan im Wortlaut oder die Dateien und Stellen, um die es geht; für ein Review den Branch und seinen Basis-Branch, den Diff holt er sich selbst. Wenn ich den Plan überarbeitet haben will, gehört der Plan hinein, mit der Bitte, ihn zu verbessern.
- Gib ihm nicht deine eigene Schlussfolgerung oder Empfehlung mit, sonst urteilt er nur nach; es sei denn, genau die soll er prüfen.
- Nimm nur auf, was er wirklich braucht: keinen Gesprächsverlauf, keine Nebenpfade. Alles Weitere soll er selbst im Repository nachsehen (CLAUDE.md, README.md, git log, gh pr list, gh issue list). Er ändert nichts.
- Er soll direkt sein, jede Aussage mit einer Stelle belegen (Datei, Commit oder Nummer) und sagen, wo er anderer Meinung ist und warum. So lang wie nötig, ohne Füllstoff.

Gib seine Antwort danach unverändert wieder und sage darunter kurz, wo du anderer Meinung bist und was du übernimmst.
```

## Review + PR (`review`)

Prüft die Änderungen, committet sie und öffnet den Pull Request.

Prüfen:
- Die Reihenfolge ist Review, Commit, PR.
- Kein Merge, kein Push auf den Basis-Branch, nie mit force.
- Geht ein Schritt nicht, hält die Session an und sagt, woran es liegt.

```text
Bring die Änderungen in „{Projekt}“ bis zum Pull Request: erst prüfen, dann committen, dann den PR öffnen.

1. Review: Sieh dir an, was seit dem Abzweig vom Basis-Branch geändert ist (git status, git diff, bei Bedarf der code-review-Skill). Behebe echte Befunde, bevor es weitergeht, und lass die Tests und Prüfungen des Projekts laufen (siehe CLAUDE.md oder README). Sag mir kurz, was du gefunden und geändert hast.
2. Commit: Fasse zusammen, was zusammengehört, mit Nachrichten in der Art der letzten Commits. Nimm nur Dateien dieser Arbeit mit, keine Nebenprodukte und keine Geheimnisse.
3. PR: Pushe den Branch (nie auf den Basis-Branch, nie mit force) und öffne einen Pull Request dagegen, mit einer Beschreibung, die sagt, was sich ändert, warum und was geprüft ist. Mergen tust du nicht.

Wenn einer der Schritte nicht geht (Tests rot, nichts zu committen, kein Remote, ein Befund, der meine Entscheidung braucht), halte an und sag mir, woran es liegt, statt es zu umgehen. Am Ende nennst du mir den Link zum PR.
```

## Handoff (`handoff`)

Schreibt eine Übergabe für eine frische Session, zum Einfügen als erste Nachricht.

Prüfen:
- Verlangt, was das Repository nicht verrät, und lässt Lesbares (Code, git log, CLAUDE.md) weg.
- Ändert und startet nichts.

```text
Schreib mir eine Übergabe für eine frische Session, die an „{Projekt}“ da weitermacht, wo wir gerade stehen.

Sie soll enthalten, was die neue Session braucht und nicht aus dem Repository erfährt: das Ziel, was schon erledigt und entschieden ist (mit dem Grund), was offen ist und womit es weitergeht, wo es hakt oder riskant ist, und welche Dateien, Branches oder PRs betroffen sind. Was sie selbst lesen kann (Code, git log, CLAUDE.md), lass weg und nenne nur, wo sie nachsehen soll. Keine Gesprächsgeschichte, keine Füllsätze.

Schreib sie so, dass ich sie unverändert als erste Nachricht in eine neue Session einfügen kann. Ändere nichts und starte nichts.
```

## Merge (`merge`)

Mergt die offenen PRs in sinnvoller Reihenfolge und löst passende Issues mit, auch diese werden gemergt.

Prüfen:
- Gemergt wird nur bei grünen Checks, auch bei den neuen Issue-PRs.
- Kein Force-Push, keine Änderung an der Historie des Hauptzweigs, keine Entwürfe.
- Was rot ist, eine Entscheidung braucht oder unklar bleibt, bleibt liegen und wird mit Grund genannt.

```text
Bring die offenen PRs in „{Projekt}“ sinnvoll in den Hauptzweig und löse passende Issues gleich mit.

1. PRs: Sieh dir alle offenen PRs an (gh pr list) und lege eine sinnvolle Reihenfolge fest: erst die unabhängigen, dann die, die darauf aufbauen oder dieselben Dateien ändern. Merge jeden PR, dessen Checks grün sind und der keine offenen Befunde hat. Bei einem Konflikt: löse ihn, wenn er eindeutig ist, und lass die Checks neu laufen. Prüfe nach jedem Merge den nächsten gegen den neuen Stand.
2. Issues: Suche danach die offenen Issues, die klar und klein genug sind oder die der neue Stand schon löst (gh issue list). Löse jedes in einem eigenen Branch mit eigenem PR („Closes #n“), lass die Tests laufen und merge ihn, wenn die Checks grün sind. Was der Stand ohnehin schon erledigt, schließt du mit einem Hinweis.

Grenzen: kein Force-Push, nichts an der Historie des Hauptzweigs ändern, keine Entwürfe mergen. Was rot ist, eine Entscheidung von mir braucht oder unklar bleibt, lässt du liegen und nennst es mir mit dem Grund. Am Ende gibst du mir eine kurze Liste: was gemerged ist, was gelöst wurde und was offen blieb.
```

## Prüfen (e2e) (`pruefen`)

Prüft die Änderung in vier Schritten: Qualität, Tests für den Diff, der echte Ablauf mit Playwright und, wo es einen Stack gibt, ein Blick in seine Logs.

Prüfen:
- Die Reihenfolge ist Qualität, Tests, E2E, Stack.
- Playwright darf eingerichtet werden, und die Session sagt, was sie installiert hat.
- Kein Push, kein Merge, keine gelöschten oder abgeschwächten Tests; Snapshots werden gemeldet, nicht ungefragt erneuert.
- Der Stack wird nur gelesen.

```text
Prüf „{Projekt}“ gründlich, bevor ich es weitergebe: erst die statische Prüfung, dann die Tests, dann der echte Ablauf im Browser.

1. Qualität: Lass Lint, Typprüfung und Formatierung des Projekts über die geänderten Dateien laufen (siehe CLAUDE.md oder README) und behebe, was sie finden. Keine Regeln abschwächen, nichts mit Ausnahmen stummschalten.
2. Tests: Sieh dir an, was seit dem Abzweig vom Basis-Branch geändert ist, und schreib Tests für die Pfade, die noch keiner abdeckt: Tests, die ohne die Änderung rot wären. Lass danach die ganze Suite laufen. Produktivcode änderst du dafür nicht; findest du darin einen Fehler, nenne ihn mir.
3. E2E: Starte die App wirklich und geh den geänderten Ablauf mit Playwright durch. Nutze die Skills und Skripte des Projekts, falls es welche gibt (siehe CLAUDE.md und .claude/skills); fehlt Playwright, richte es minimal ein und sag mir, was du installiert hast. Mach Screenshots der wichtigen Stellen. Wo es schon Snapshots gibt, melde Abweichungen, statt sie ungefragt zu aktualisieren. Lohnt sich der Durchlauf als bleibender Test, leg ihn als Spec an.
4. Stack: Läuft ein Docker-Stack dieses Projekts, sieh danach in Container-Status und Logs nach Fehlern. Das ist nur lesen.

Grenzen: nichts pushen, nichts mergen, keine Tests löschen oder abschwächen. Lässt sich die App nicht starten oder braucht ein Schritt meine Entscheidung, halte an und sag mir, woran es liegt, statt es zu umgehen. Am Ende eine kurze Liste: was geprüft ist, was du geändert hast, was rot blieb und was du nicht prüfen konntest.
```

## Stack neu bauen (`stack`)

Baut den Docker-Stack des Projekts auf dem Stand des Ordners neu und prüft, dass er diesen Stand läuft. Der Knopf erscheint nur, wo eine Compose-Datei liegt.

Prüfen:
- Vor dem Bauen wird geprüft, ob etwas Live-Scharfes aktiv ist; dann hält die Session an und fragt.
- Kein `down -v`, keine Volumes oder Daten gelöscht, keine fremden Container angefasst.
- Danach Health und Stand (SHA, Version oder Build-Zeit) geprüft.

```text
Bau den Docker-Stack von „{Projekt}“ auf dem Stand dieses Ordners neu, damit er läuft, was hier liegt.

1. Vorher: Finde die Compose-Datei und den Projektnamen des Stacks (docker compose ls, `name:` in der Datei). Lies, ob er gegen ein Live-Konto oder mit einer Live-Freigabe läuft (Umgebungsvariablen, Konfiguration, CLAUDE.md), und nenn mir, was du gefunden hast. Ist etwas Live-Scharfes aktiv oder bleibt es unklar, halte an und frag mich.
2. Bauen: Bau die Images neu und starte die Dienste mit docker compose -p <Projektname> up -d --build aus diesem Ordner.
3. Danach: Warte, bis die Container gesund sind, frag den Health-Endpunkt ab und prüf, dass der laufende Stand dem dieses Ordners entspricht (Git-SHA, Version oder Build-Zeit). Lies die Logs der ersten Minuten auf Fehler.

Grenzen: kein docker compose down mit -v, keine Volumes oder Daten löschen, keine Datenbank zurücksetzen, keine Container anfassen, die nicht zu diesem Stack gehören. Bleibt ein Dienst rot oder passt der Stand nicht, sag mir, was du siehst, statt weiterzubasteln. Am Ende: welche Container laufen, auf welchem Stand, und was dir aufgefallen ist.
```
