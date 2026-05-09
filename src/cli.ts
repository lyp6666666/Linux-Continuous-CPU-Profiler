#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { createMockCapture } from "./lib/record.js";
import { readSessions, resolveStoragePaths, saveSession } from "./lib/storage.js";
import { runDoctor } from "./lib/doctor.js";
import { createServer } from "../server/index.js";

const program = new Command();
const dataDir = process.env.CPU_PROFILER_DATA_DIR ?? "./data";

program.name("profiler").description("Linux continuous CPU profiler").version("0.1.0");

program
  .command("doctor")
  .description("Check perf and storage prerequisites")
  .action(async () => {
    const report = await runDoctor(resolveStoragePaths(dataDir));
    console.log(chalk.bold("Profiler doctor"));
    console.log(`perf: ${report.perfAvailable ? chalk.green("available") : chalk.yellow("missing")}`);
    console.log(`storage: ${report.dataDirWritable ? chalk.green("writable") : chalk.red("not writable")}`);
    console.log(`flamegraph.pl: ${report.flamegraphAvailable ? chalk.green("available") : chalk.yellow("missing")}`);
    report.tips.forEach((tip) => console.log(`- ${tip}`));
  });

program
  .command("record")
  .description("Create a capture session")
  .option("--service <name>", "service name", "service-a")
  .option("--target-type <type>", "system|pid|process|cgroup", "cgroup")
  .option("--target-value <value>", "capture target", "/sys/fs/cgroup/system.slice/service-a.service")
  .option("--mock", "generate a mock session", true)
  .action(async (options) => {
    const paths = resolveStoragePaths(dataDir);
    const session = await createMockCapture(paths, {
      service: options.service,
      targetType: options.targetType,
      targetValue: options.targetValue,
      mode: "mock"
    });
    await saveSession(paths, session);
    console.log(chalk.green(`created session ${session.id}`));
  });

program
  .command("list")
  .description("List capture sessions")
  .action(async () => {
    const sessions = await readSessions(resolveStoragePaths(dataDir));
    for (const session of sessions) {
      console.log(`${session.startTime}  ${session.service}  ${session.status}  ${session.summary}`);
    }
  });

program
  .command("serve")
  .description("Start the web console")
  .option("--port <port>", "port", "8787")
  .action(async (options) => {
    const port = Number(options.port);
    const server = createServer({ port, dataDir });
    await server.start();
    console.log(chalk.cyan(`console running at http://localhost:${port}`));
  });

program.parseAsync(process.argv);

