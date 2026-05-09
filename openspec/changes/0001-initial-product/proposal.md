# Proposal

## Summary

Implement a TypeScript-based Linux profiling toolkit with a React web console and a lightweight Node backend. The first slice should be runnable without privileged kernel setup by using mock capture data, while still supporting real `perf` invocation on Linux when available.

## Why this approach

- The repository currently has no implementation.
- Node + TypeScript can ship CLI, backend, and front-end in one stack.
- The environment already has Node installed.
- The product needs a usable UI quickly, and React is a good fit for dense operational dashboards.

## Core decisions

### Runtime

- Node.js 20+
- TypeScript 5.x

### Front-end

- React 19
- Vite
- CSS variables and custom layouts instead of a component library
- Lucide icons for actions

### Backend

- Express 5
- Native `child_process` for `perf` and file rotation
- JSONL as the capture index format

### Testing

- Vitest for unit tests
- React Testing Library for UI tests
- Supertest for API tests

### Distribution

- `npm run dev` for local development
- `npm run test` for validation
- `npm run build` for production bundle
- `npm run seed` or `profiler record --mock` to create usable demo data

## Front-end direction

The UI should feel like a production incident console:

- dark charcoal base
- warm paper-like panels
- amber and cyan accents
- dense information hierarchy
- compact typography
- timeline-first layout
- a split view that keeps sessions, details, and flamegraph visible together

## Risks

- Real `perf` capture permissions may not exist in the local environment.
- FlameGraph dependencies may be missing.
- A pure mock implementation would not satisfy the core product intent.

## Mitigation

- Include mock sessions and synthetic flamegraphs for local usage.
- Provide `doctor` diagnostics.
- Keep real `perf` support as a pluggable path.

