import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import type { StoragePaths } from "./storage.js";

export interface DoctorReport {
  perfAvailable: boolean;
  dataDirWritable: boolean;
  flamegraphAvailable: boolean;
  perfEventParanoid?: string;
  tips: string[];
}

function canSpawn(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

export async function runDoctor(paths: StoragePaths): Promise<DoctorReport> {
  let dataDirWritable = true;
  try {
    await access(paths.dataDir, constants.W_OK);
  } catch {
    dataDirWritable = false;
  }
  const perfAvailable = await canSpawn("perf");
  const flamegraphAvailable = await canSpawn("flamegraph.pl");
  const tips = [
    perfAvailable ? "perf is available." : "perf is missing; mock mode remains usable.",
    dataDirWritable ? "data dir is writable." : "data dir is not writable; create it or adjust permissions.",
    flamegraphAvailable ? "flamegraph.pl is available." : "flamegraph.pl is missing; SVG preview will use local renderer."
  ];

  return {
    perfAvailable,
    dataDirWritable,
    flamegraphAvailable,
    tips
  };
}

