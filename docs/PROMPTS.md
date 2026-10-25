# Prompts hinter den Band-Knöpfen

Jeder Knopf schickt der Session den Text als eigene Nachricht (`$.prompt.submit` mit `asUser`). `{Projekt}` steht für den Projektnamen. Die Texte stehen in `hooks/colors.ts`; diese Ausgabe kommt von `/projektfarbe prompts`.

## Opus-Meinung (`meinung`)

Holt eine unabhängige zweite Meinung von Opus ein: zur letzten Frage, zu einem Plan oder zum Stand des Projekts.

Prüfen:
- Der Subagent bekommt die Sache selbst, nicht die Schlussfolgerung der Session und keinen Gesprächsverlauf.
- Das Modell ist der Alias `opus` (eine volle Modell-ID wird vom Agent-Werkzeug abgelehnt).
- Keine Zeilengrenze, keine feste Gliederung, kein Leseverbot.

```text
Hol eine unabhängige zweite Meinung von Opus ein zu dem, worum es in diesem Gespräch gerade geht: meine letzte Frage, der Plan, den wir haben, oder der Stand von „{Projekt}“. Du entscheidest, was gemeint ist.

Starte dafür mit dem Agent-Tool einen Subagenten (subagent_type general-purpose, model opus) und baue seinen Auftrag selbst zusammen:
- Gib ihm die Sache selbst mit, über die er urteilen soll: die Frage, den Plan im Wortlaut oder die Dateien und Stellen, um die es geht. Wenn ich den Plan überarbeitet haben will, gehört der Plan hinein, mit der Bitte, ihn zu verbessern.
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
