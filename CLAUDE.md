# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Claude Code plugin ("mod") named `projektfarben`, published through the marketplace `max-mods` defined in this repo (`.claude-plugin/marketplace.json`, manifest and version in `.claude-plugin/plugin.json`). It gives every project a color emoji, puts that emoji in front of each session title in the Claude desktop app's sidebar, draws a colored project band above the prompt, and adds the `/projektfarbe` command.

All user-facing text (command output, band labels, README) is German. Many identifiers and all persistent store keys are German too (`Farbe`, `FARBEN`, `farben`, `gelernt`, `versucht`, `bandAus`). Code comments are English. Keep this split.

## Commands

```bash
claude plugin validate .   # check manifest, marketplace and hooks
claude plugin test .       # run hooks/*.test.tsx
```

There is no `package.json`, build step or linter. The plugin runtime loads the TypeScript/TSX directly; `claude-code` (and `claude-code/testing` in tests) are provided by the runtime, not installed.

## Architecture

- `hooks/hooks.json` lists the module entry, `hooks/register.tsx`, which exports `register` and wires four engine events:
  - `session.start`: registers `/projektfarbe`, then in the background learns existing sidebar colors once, fills the band state, and recolors this session's title.
  - `turn.complete`: only for the session's own turns (`e.agentId === undefined`; subagent turns are skipped). Refreshes the band (a color may have been picked in another session) and recolors the title. If the app has not named the session yet, it retries once after 20 s via `$.clock.after`.
  - `command.run` for `projektfarbe`: show / set color / `standard` / `alle` / `band`.
  - `ui.render` for `AbovePrompt`: the band and its color picker. Passes through to `next(e)` when there's a survey, no project, or the band is hidden.
- `hooks/colors.ts` holds the pure logic with no engine dependency: project detection, color assignment, title planning, store parsing. Put new logic here when it can be tested without the engine.
- `types/index.d.ts` declares the per-session `view` atom's shape by augmenting `PluginState` in `claude-code`. Change it together with the `view` atom in `register.tsx`.

### Renaming sessions

Titles are changed through the desktop app's own MCP server `ccd_session_mgmt`: `get_session` (with `session_id: 'self'`), `list_sessions` (returns the other sessions), and `set_session_title`. Results come back as JSON in text content blocks (`callJson`). This only works in the desktop app; in a terminal session only the band shows.

Engine work in `session.start` and `turn.complete` runs fire-and-forget (`void … .catch(() => undefined)`) so a session or turn never waits on the app, or on the person answering the app's rename prompt.

### Persistent store (`$.store`, shared by all of the person's sessions)

| Key | Content |
|---|---|
| `farben` | project name, lowercased → color emoji (`mark`) |
| `gelernt` | `true` once the colors already in the sidebar were learned (`learnPicks`, majority mark per project) |
| `versucht` | session id → the title last tried, capped at 300 entries |
| `bandAus` | `true` when the band is hidden |

These keys hold existing users' data: renaming them or changing their format needs a migration. `versucht` is written *before* `set_session_title`: renaming a title the person set makes the app ask them, and a "no" must not be asked again, even after a restart.

### Rules that span both files

- Project = basename of the session's folder, compared case-insensitively. A path under `.claude/worktrees/` counts as its repository; anything under `scratch-workspaces/` and drive roots have no project.
- A new project gets the first color in `REIHENFOLGE` that no project has yet; with all 18 taken, a hash of the name decides.
- Placeholder titles (`New session`, `Untitled`, …) mean "not named yet" (`planTitle` → `unnamed`): no rename, retry later.
- Every color has a `name` (ASCII, e.g. `kreis-gruen`), an emoji `mark` and a `hex` for the band; `findFarbe` maps umlauts and spaces so `grün` and `kreis weiß` work.

## Tests

`hooks/projektfarben.test.tsx` uses `claude-code/testing`. Pure helpers are tested directly. Engine tests drive the real `register` through `$.session.start`, `$.turn.complete`, `$.command.run` and `$.ui.mount`, with:

- `fakeDesktop(self, others, { refuse })` answering `mcp.call` with in-memory titles (`refuse` simulates the person declining a rename);
- `mock.clock(on)` with `clock.settle()` / `clock.advance(ms)` for the background work and the 20 s retry;
- `mock.store(on, initial?)` for the persistent store;
- stubs for `command.register`, `session.start`, `session.cwd` and `turn.complete`.

UI tests find and press buttons by their React `key` (`farbe`, `farbe-<name>`, `abbrechen`, `ausblenden`), so keep those keys stable.

When behavior or commands change, update the German README (`Was der Mod macht`, `Befehle`, `Grenzen`).
