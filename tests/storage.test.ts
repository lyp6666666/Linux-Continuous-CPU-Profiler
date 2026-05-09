import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMockCapture } from "../src/lib/record.js";
import { findNearestSession, findSessionAt, readSessions, resolveStoragePaths, saveSession, pruneOldSessions } from "../src/lib/storage.js";

describe("storage", () => {
  it("writes and reads sessions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cpu-profiler-"));
    const paths = resolveStoragePaths(dir);
    const session = await createMockCapture(paths, {
      service: "service-a",
      targetType: "cgroup",
      targetValue: "/sys/fs/cgroup/system.slice/service-a.service",
      mode: "mock"
    });
    await saveSession(paths, session);

    const sessions = await readSessions(paths);
    expect(sessions[0].id).toBe(session.id);
    expect(await readFile(session.flamegraphPath, "utf8")).toContain("火焰图预览");
  });

  it("prunes older sessions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cpu-profiler-"));
    const paths = resolveStoragePaths(dir);
    for (let i = 0; i < 4; i++) {
      const session = await createMockCapture(paths, {
        service: `service-${i}`,
        targetType: "process",
        targetValue: "worker",
        mode: "mock"
      });
      await saveSession(paths, session);
    }
    await pruneOldSessions(paths, 2);
    const sessions = await readSessions(paths);
    expect(sessions).toHaveLength(2);
  });

  it("finds a session containing a timestamp", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cpu-profiler-"));
    const paths = resolveStoragePaths(dir);
    const session = await createMockCapture(paths, {
      service: "service-a",
      targetType: "cgroup",
      targetValue: "/sys/fs/cgroup/system.slice/service-a.service",
      mode: "mock",
      startTime: new Date("2026-05-09T03:17:00.000Z"),
      durationMinutes: 1
    });
    await saveSession(paths, session);

    expect((await findSessionAt(paths, new Date("2026-05-09T03:17:30.000Z")))?.id).toBe(session.id);
    expect((await findNearestSession(paths, new Date("2026-05-09T03:20:00.000Z")))?.id).toBe(session.id);
  });
});
