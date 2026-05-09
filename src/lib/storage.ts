import { mkdir, readFile, readdir, stat, writeFile, appendFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HealthSnapshot, SessionRecord } from "../types.js";
import { demoHealth, demoSessions } from "./demo.js";

export interface StoragePaths {
  dataDir: string;
  sessionsDir: string;
  indexFile: string;
}

export function resolveStoragePaths(dataDir = "./data"): StoragePaths {
  return {
    dataDir,
    sessionsDir: join(dataDir, "sessions"),
    indexFile: join(dataDir, "sessions.jsonl")
  };
}

export async function ensureStorage(paths: StoragePaths): Promise<void> {
  await mkdir(paths.dataDir, { recursive: true });
  await mkdir(paths.sessionsDir, { recursive: true });
}

export async function readSessions(paths: StoragePaths): Promise<SessionRecord[]> {
  try {
    const text = await readFile(paths.indexFile, "utf8");
    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as SessionRecord)
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  } catch {
    return demoSessions();
  }
}

export async function saveSession(paths: StoragePaths, session: SessionRecord): Promise<void> {
  await ensureStorage(paths);
  await appendFile(paths.indexFile, `${JSON.stringify(session)}\n`, "utf8");
}

export async function loadSession(paths: StoragePaths, id: string): Promise<SessionRecord | undefined> {
  const sessions = await readSessions(paths);
  return sessions.find((item) => item.id === id);
}

export async function storageBytes(paths: StoragePaths): Promise<number> {
  try {
    let total = 0;
    const entries = await readdir(paths.dataDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const nested = await readdir(join(paths.dataDir, entry.name), { withFileTypes: true });
        for (const child of nested) {
          const childStat = await stat(join(paths.dataDir, entry.name, child.name));
          total += childStat.size;
        }
      } else {
        total += (await stat(join(paths.dataDir, entry.name))).size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function readHealth(paths: StoragePaths): Promise<HealthSnapshot> {
  const sessions = await readSessions(paths);
  const health = demoHealth();
  return {
    ...health,
    dataDir: paths.dataDir,
    sessionCount: sessions.length,
    storageBytes: await storageBytes(paths),
    lastCaptureAt: sessions[0]?.endTime ?? health.lastCaptureAt
  };
}

export async function pruneOldSessions(paths: StoragePaths, maxItems: number): Promise<void> {
  const sessions = await readSessions(paths);
  const keep = sessions.slice(0, maxItems);
  const remove = sessions.slice(maxItems);
  for (const session of remove) {
    if (session.perfDataPath) {
      await rm(session.perfDataPath, { force: true });
    }
    if (session.flamegraphPath) {
      await rm(session.flamegraphPath, { force: true });
    }
    if (session.foldedPath) {
      await rm(session.foldedPath, { force: true });
    }
  }
  const content = `${keep.map((item) => JSON.stringify(item)).join("\n")}${keep.length ? "\n" : ""}`;
  await writeFile(paths.indexFile, content, "utf8");
}

