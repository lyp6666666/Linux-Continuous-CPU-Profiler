export type CaptureMode = "mock" | "perf";

export type SessionStatus = "ok" | "running" | "error";

export interface SessionRecord {
  id: string;
  service: string;
  mode: CaptureMode;
  targetType: "system" | "pid" | "process" | "cgroup";
  targetValue: string;
  startTime: string;
  endTime: string;
  samples: number;
  status: SessionStatus;
  summary: string;
  topStacks: Array<{ name: string; weight: number }>;
  foldedPath: string;
  flamegraphPath: string;
  perfDataPath?: string;
  notes?: string[];
}

export interface HealthSnapshot {
  ok: boolean;
  perfAvailable: boolean;
  dataDir: string;
  sessionCount: number;
  activeMode: CaptureMode;
  lastCaptureAt?: string;
  storageBytes: number;
  retentionHours: number;
  message: string;
}

