import { addMinutes, isoNow } from "./time.js";
import type { SessionRecord } from "../types.js";

function buildStacks(seed: string, peak: number): Array<{ name: string; weight: number }> {
  return [
    { name: `${seed}::BatchJob::compactAndDelete`, weight: peak },
    { name: `${seed}::GcWorker::scanRoots`, weight: Math.max(peak - 12, 18) },
    { name: `${seed}::Lock::spinUntilReady`, weight: Math.max(peak - 22, 12) },
    { name: `${seed}::Json::parseLargePayload`, weight: Math.max(peak - 30, 10) },
    { name: `${seed}::Kernel::softirq_dispatch`, weight: Math.max(peak - 36, 8) }
  ];
}

export function demoSessions(): SessionRecord[] {
  const now = new Date();
  const first = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const second = addMinutes(first, 35);
  const third = addMinutes(second, 52);

  return [
    {
      id: "demo-20260509-0317",
      service: "service-a",
      mode: "mock",
      targetType: "cgroup",
      targetValue: "/sys/fs/cgroup/system.slice/service-a.service",
      startTime: first.toISOString(),
      endTime: addMinutes(first, 1).toISOString(),
      samples: 2912,
      status: "ok",
      summary: "凌晨批量清理路径出现峰值，CPU 主要消耗在删除与聚合逻辑。",
      topStacks: buildStacks("service-a", 88),
      foldedPath: "data/sessions/demo-20260509-0317/folded.txt",
      flamegraphPath: "data/sessions/demo-20260509-0317/flamegraph.svg",
      notes: ["窗口内发现清理任务与热点锁竞争同时抬升。"]
    },
    {
      id: "demo-20260509-0352",
      service: "service-a",
      mode: "mock",
      targetType: "cgroup",
      targetValue: "/sys/fs/cgroup/system.slice/service-a.service",
      startTime: second.toISOString(),
      endTime: addMinutes(second, 1).toISOString(),
      samples: 2440,
      status: "ok",
      summary: "GC 与反序列化交织，表现为短时间内的抖动型 CPU 峰值。",
      topStacks: buildStacks("service-a", 72),
      foldedPath: "data/sessions/demo-20260509-0352/folded.txt",
      flamegraphPath: "data/sessions/demo-20260509-0352/flamegraph.svg",
      notes: ["建议检查对象分配与批处理出入队节奏。"]
    },
    {
      id: "demo-20260509-0444",
      service: "service-b",
      mode: "mock",
      targetType: "process",
      targetValue: "payment-worker",
      startTime: third.toISOString(),
      endTime: addMinutes(third, 1).toISOString(),
      samples: 3184,
      status: "ok",
      summary: "锁竞争导致自旋忙等，火焰图顶部呈现大量等待热点。",
      topStacks: buildStacks("service-b", 95),
      foldedPath: "data/sessions/demo-20260509-0444/folded.txt",
      flamegraphPath: "data/sessions/demo-20260509-0444/flamegraph.svg",
      notes: ["锁粒度过粗，建议拆分热点结构。"]
    }
  ];
}

export function demoHealth() {
  return {
    ok: true,
    perfAvailable: false,
    dataDir: "./data",
    sessionCount: 3,
    activeMode: "mock" as const,
    lastCaptureAt: isoNow(),
    storageBytes: 2_457_600,
    retentionHours: 24,
    message: "演示模式已启用。可以使用 record --mock 生成自己的采样记录。"
  };
}
