import { describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../server/index.js";
import { createMockCapture } from "../src/lib/record.js";
import { resolveStoragePaths, saveSession } from "../src/lib/storage.js";

describe("api", () => {
  it("serves sessions and health", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cpu-profiler-"));
    const paths = resolveStoragePaths(dir);
    const session = await createMockCapture(paths, {
      service: "service-a",
      targetType: "cgroup",
      targetValue: "/sys/fs/cgroup/system.slice/service-a.service",
      mode: "mock"
    });
    await saveSession(paths, session);

    const server = createServer({ dataDir: dir });
    const agent = request(server.app);
    const [health, sessions, flame] = await Promise.all([
      agent.get("/api/health"),
      agent.get("/api/sessions"),
      agent.get(`/api/sessions/${session.id}/flamegraph`)
    ]);

    expect(health.status).toBe(200);
    expect(sessions.body).toHaveLength(1);
    expect(flame.headers["content-type"]).toContain("image/svg+xml");
  });
});
