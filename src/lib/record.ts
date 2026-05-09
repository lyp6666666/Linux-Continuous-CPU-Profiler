import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { SessionRecord } from "../types.js";
import { addMinutes } from "./time.js";
import { buildFlamegraphSvg } from "./flamegraph.js";
import { pruneOldSessions, saveSession, type StoragePaths } from "./storage.js";

export interface RecordOptions {
  service: string;
  targetType: SessionRecord["targetType"];
  targetValue: string;
  mode: SessionRecord["mode"];
  durationMinutes?: number;
  startTime?: Date;
  sequence?: number;
}

export async function createMockCapture(paths: StoragePaths, options: RecordOptions): Promise<SessionRecord> {
  const start = options.startTime ?? new Date();
  const id = `capture-${start.toISOString().replace(/[-:.]/g, "").slice(0, 15)}-${options.sequence ?? Date.now()}`;
  const sessionDir = join(paths.sessionsDir, id);
  await mkdir(sessionDir, { recursive: true });

  const end = addMinutes(start, options.durationMinutes ?? 1);
  const seed = options.sequence ?? Math.floor(start.getTime() / 1000);
  const peak = 62 + (seed % 31);
  const topStacks = [
    { name: `${options.service}::入口线程::批量清理::过期数据删除`, weight: peak },
    { name: `${options.service}::运行时::垃圾回收::根对象扫描`, weight: Math.max(peak - 8, 34) },
    { name: `${options.service}::并发控制::锁竞争::忙等自旋`, weight: Math.max(peak - 15, 28) },
    { name: `${options.service}::协议解析::反序列化::负载解析`, weight: Math.max(peak - 23, 22) },
    { name: `${options.service}::内核路径::软中断::中断分发`, weight: Math.max(peak - 31, 18) }
  ];
  const session: SessionRecord = {
    id,
    service: options.service,
    mode: options.mode,
    targetType: options.targetType,
    targetValue: options.targetValue,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    samples: 2400 + seed % 1200,
    status: "ok",
    summary: "持续采样窗口已落盘，可按故障时间点回放该窗口的 CPU 栈现场。",
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

export interface ContinuousSamplerOptions {
  service?: string;
  targetType?: SessionRecord["targetType"];
  targetValue?: string;
  windowSeconds?: number;
  maxItems?: number;
}

export function startContinuousMockSampler(paths: StoragePaths, options: ContinuousSamplerOptions = {}) {
  const windowSeconds = options.windowSeconds ?? 15;
  const maxItems = options.maxItems ?? 240;
  let sequence = 0;
  let running = false;
  let timer: NodeJS.Timeout | undefined;
  let lastCaptureAt: string | undefined;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const startTime = new Date(Date.now() - windowSeconds * 1000);
      const session = await createMockCapture(paths, {
        service: options.service ?? "service-a",
        targetType: options.targetType ?? "cgroup",
        targetValue: options.targetValue ?? "/sys/fs/cgroup/system.slice/service-a.service",
        mode: "mock",
        durationMinutes: windowSeconds / 60,
        startTime,
        sequence
      });
      sequence += 1;
      await saveSession(paths, session);
      await pruneOldSessions(paths, maxItems);
      lastCaptureAt = session.endTime;
    } finally {
      running = false;
    }
  }

  timer = setInterval(() => void tick(), windowSeconds * 1000);
  void tick();

  return {
    stop() {
      if (timer) clearInterval(timer);
    },
    snapshot() {
      return {
        enabled: true,
        windowSeconds,
        maxItems,
        lastCaptureAt,
        running
      };
    }
  };
}
