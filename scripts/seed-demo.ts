import { resolveStoragePaths, saveSession } from "../src/lib/storage.js";
import { demoSessions } from "../src/lib/demo.js";

const paths = resolveStoragePaths(process.env.CPU_PROFILER_DATA_DIR ?? "./data");

for (const session of demoSessions()) {
  await saveSession(paths, session);
}

console.log(`Seeded ${demoSessions().length} demo sessions into ${paths.indexFile}`);

