# Design

## Stack

- Front-end: React 19 + Vite + TypeScript + CSS
- Backend: Node.js + Express + TypeScript
- Testing: Vitest + React Testing Library + Supertest
- Icons: Lucide React

## Data Model

Capture sessions are stored as JSON objects in `data/sessions.jsonl`.

Each record includes:

- `id`
- `service`
- `mode`
- `startTime`
- `endTime`
- `samples`
- `status`
- `summary`
- `foldedPath`
- `flamegraphPath`

## UI Layout

### Frame

- Full-height app shell
- Narrow top status bar
- Three-zone content area

### Left rail

- Session list
- Health blocks
- Storage summary

### Center

- Timeline
- Selected session summary
- Flamegraph viewer

### Right rail

- Incident metadata
- Commands
- Operational checks

## Visual Language

- Background: near-black graphite
- Panels: matte charcoal with subtle borders
- Primary accent: amber
- Secondary accent: cyan
- Status colors: red, amber, green
- Fonts: IBM Plex Sans / IBM Plex Mono stack
- Motion: restrained, only for selection and reveal

## Behavior

- Empty state must seed demo data.
- Selecting a session updates the flamegraph preview and metadata.
- The dashboard should highlight the capture window most relevant to the selected time.

