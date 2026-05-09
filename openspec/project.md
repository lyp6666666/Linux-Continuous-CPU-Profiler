# Project Spec: Linux Continuous CPU Profiler

## Purpose

Build a Linux 7x24 CPU profiling tool that continuously captures historical CPU stack samples, retains them in time slices, and lets operators reconstruct incident-time flamegraphs after an outage has already passed.

## Product Shape

This product is both:

1. A CLI profiler for Linux hosts.
2. A web-based incident console for browsing capture sessions and flamegraphs.

## Primary User Outcomes

- Confirm whether a CPU spike came from business code, GC, locking, kernel work, or runtime overhead.
- Reconstruct the incident window by timestamp.
- Keep sampling overhead low enough for production use.
- Make the output legible during on-call work at 3 a.m.

## Design Principles

- Prefer evidence over speculation.
- Keep the capture path simple and durable.
- Make the incident timeline the center of the UI.
- Expose raw artifacts, not only summarized conclusions.
- Optimize for production operators, not marketing screenshots.

## Delivery Constraints

- Must run on Linux.
- Must have a minimal usable mode even if `perf` is unavailable.
- Must include tests and a visible front-end.
- Must document operational caveats and permissions.

