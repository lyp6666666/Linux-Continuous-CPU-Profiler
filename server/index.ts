import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { createApi } from "../src/lib/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createServer({ port = 8787, dataDir = "./data" } = {}) {
  const app = express();
  const { router, paths } = createApi(dataDir);

  app.use(cors());
  app.use(express.json());
  app.use("/api", router);

  const distWeb = join(__dirname, "../dist-web");
  const indexHtml = join(distWeb, "index.html");

  app.get("/", (_req, res) => {
    if (existsSync(indexHtml)) {
      res.send(readFileSync(indexHtml, "utf8"));
      return;
    }
    res.type("html").send(`<!doctype html>
      <html lang="zh-CN">
      <head><meta charset="utf-8"><title>CPU Profiler</title></head>
      <body><div id="root">Build the web app with npm run build or use npm run dev.</div></body>
      </html>`);
  });

  app.use("/assets", express.static(join(distWeb, "assets")));

  return {
    app,
    paths,
    start() {
      return new Promise<void>((resolve) => {
        app.listen(port, () => resolve());
      });
    }
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createServer().start();
}
