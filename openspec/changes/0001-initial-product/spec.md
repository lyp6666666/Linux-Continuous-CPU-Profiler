# Specification

## Scope

The first implementation slice must provide:

- a CLI with `doctor`, `record`, `list`, `flamegraph`, and `serve`
- a persistent session index
- mock capture data for local use
- a production-styled web console
- baseline tests

## Functional Requirements

### CLI

- `doctor` checks dependencies and writable storage.
- `record` creates a capture session.
- `record --mock` generates synthetic slices when perf is unavailable.
- `list` prints capture sessions.
- `flamegraph` renders an SVG for a selected session.
- `serve` starts the web console and JSON API.

### API

- `GET /api/health`
- `GET /api/sessions`
- `GET /api/sessions/:id`
- `GET /api/sessions/:id/flamegraph`

### Web Console

- Show a left rail session list.
- Show an incident timeline with timestamps and states.
- Show a detail panel for the selected capture.
- Show the flamegraph preview inline.
- Show operational badges for health, retention, and sample mode.

## Non-Functional Requirements

- Works without privileged perf access in mock mode.
- Avoids heavyweight dependencies.
- Must remain readable on a 1440px desktop and usable on smaller laptop widths.
- Must use a restrained, operational aesthetic rather than a marketing layout.

## Acceptance Criteria

- `npm test` passes.
- `npm run build` passes.
- `npm start` launches the console.
- A fresh clone can run in mock mode and view example capture data.
- The UI must not be empty on first load.

