import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { SessionRecord } from "../types.js";
import { isoNow, addMinutes } from "./time.js";
import { buildFlamegraphSvg } from "./flamegraph.js";
import type { StoragePaths } from "./storage.js";

export interface RecordOptions {
  service: string;
  targetType: SessionRecord["targetType"];
  targetValue: string;
  mode: SessionRecord["mode"];
  durationMinutes?: number;
}

export async function createMockCapture(paths: StoragePaths, options: RecordOptions): Promise<SessionRecord> {
  const id = `capture-${Date.now()}`;
  const sessionDir = join(paths.sessionsDir, id);
  await mkdir(sessionDir, { recursive: true });

  const start = new Date();
  const end = addMinutes(start, options.durationMinutes ?? 1);
  const topStacks = [
    { name: `${options.service}::Batch::deleteExpiredRecords`, weight: 92 },
    { name: `${options.service}::Runtime::gcMark`, weight: 84 },
    { name: `${options.service}::Lock::contentionSpin`, weight: 76 },
    { name: `${options.service}::Serde::parsePayload`, weight: 69 },
    { name: `${options.service}::Kernel::softirqProcessing`, weight: 61 }
  ];
  const session: SessionRecord = {
    id,
    service: options.service,
    mode: options.mode,
    targetType: options.targetType,
    targetValue: options.targetValue,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    samples: 2800,
    status: "ok",
    summary: "已生成本地演示采样，用于页面体验和自动化测试。",
    topStacks,
    foldedPath: join(sessionDir, "folded.txt"),
    flamegraphPath: join(sessionDir, "flamegraph.svg"),
    perfDataPath: join(sessionDir, "perf.data"),
    notes: ["该记录由 mock 模式生成，未采集真实 perf 数据。"]
  };

  await writeFile(session.foldedPath, topStacks.map((item) => `${item.name} ${item.weight}`).join("\n"), "utf8");
  await writeFile(session.flamegraphPath, buildFlamegraphSvg(session), "utf8");
  await writeFile(session.perfDataPath!, "mock-perf-data", "utf8");
  return session;
}

export function createSessionId(): string {
  return randomUUID().slice(0, 8);
}

export async function recordRealCapture(): Promise<never> {
  throw new Error("Real perf capture is not wired in this first slice. Use --mock to create a usable capture.");
}
