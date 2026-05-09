---
name: linux-continuous-cpu-profiling
description: Build or review a Linux continuous CPU profiling tool based on perf, time-sliced profile retention, flamegraph generation, production hardening, tests, and documentation.
---

# Linux Continuous CPU Profiling Skill

Use this skill when building, reviewing, or extending a Linux 7x24 CPU profiling tool that keeps historical `perf` samples and generates flamegraphs for incident time windows.

## Core Goal

Create a production-ready black-box CPU profiler:

1. Continuously sample CPU stacks with low overhead.
2. Store time-sliced `perf.data` files with an index.
3. Rotate data by TTL and disk quota.
4. Query by incident timestamp.
5. Generate folded stacks and flamegraph SVG files.
6. Provide operational checks, tests, and clear documentation.

## Recommended Implementation Steps

1. Define the CLI first:
   - `doctor`
   - `record`
   - `status`
   - `list`
   - `flamegraph`

2. Implement configuration:
   - Target type: `system`, `pid`, `process`, `cgroup`.
   - Sampling: event, frequency, window seconds, unwind mode.
   - Storage: data dir, retention hours, max bytes.
   - FlameGraph path.

3. Implement recorder:
   - Run `perf record` in fixed windows.
   - Write each slice to a temporary file first.
   - Atomically rename complete slices.
   - Append metadata to `index.jsonl`.
   - Retry with backoff on failures.

4. Implement storage:
   - Query slices by timestamp and time range.
   - Delete expired slices.
   - Enforce disk quota by deleting oldest completed slices.
   - Never delete the active slice.

5. Implement flamegraph generation:
   - Resolve matching slices.
   - Run `perf script`.
   - Fold stacks.
   - Run `flamegraph.pl`.
   - Emit SVG and a short summary.

6. Add production guardrails:
   - `doctor` for permissions and dependencies.
   - systemd service file.
   - structured logs.
   - metrics or textfile exporter output.
   - clear failure messages.

## Production Defaults

- Start with 49Hz sampling.
- Use 60-second profile windows.
- Retain 24 hours by default.
- Set a disk quota explicitly.
- Prefer cgroup targets for containerized services.
- Prefer frame pointers when binaries are built with them.
- Document DWARF as a higher-cost fallback.

## Test Strategy

Use fake external commands for repeatable tests:

- Fake `perf record` writes deterministic output.
- Fake `perf script` emits sample stacks.
- Fake `flamegraph.pl` writes a deterministic SVG.

Cover:

- Config parsing.
- Time range selection.
- Command construction.
- Index append and query.
- Retention cleanup.
- Failure and backoff behavior.
- CLI smoke tests.

On real Linux, run a minimal integration:

```bash
profiler doctor
profiler record --config examples/profiler.yaml
profiler flamegraph --at "now" --range 2m --output out/
```

## README Checklist

- Explain what problem the tool solves.
- Show a quick start.
- Show systemd deployment.
- Explain required Linux permissions.
- Explain storage layout and retention.
- Show how to generate a flamegraph for an incident timestamp.
- Include test commands and observed results.
- Warn that profile data may contain sensitive symbols and paths.

## Acceptance Criteria

- A user can run the tool on Linux and collect at least three profile windows.
- A user can query by timestamp and generate an SVG flamegraph.
- Data rotation works by both time and size.
- Tests run without requiring real `perf`.
- Real `perf` integration is documented and separately verifiable.
