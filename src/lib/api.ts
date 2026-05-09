import express from "express";
import { buildFlamegraphSvg } from "./flamegraph.js";
import { findNearestSession, findSessionAt, readHealth, loadSession, readSessions, resolveStoragePaths } from "./storage.js";
import { runDoctor } from "./doctor.js";

export function createApi(dataDir = "./data") {
  const paths = resolveStoragePaths(dataDir);
  const router = express.Router();

  router.get("/health", async (_req, res) => {
    const health = await readHealth(paths);
    res.json(health);
  });

  router.get("/sessions", async (_req, res) => {
    res.json(await readSessions(paths));
  });

  router.get("/sessions/query", async (req, res) => {
    const at = typeof req.query.at === "string" ? new Date(req.query.at) : new Date(NaN);
    if (Number.isNaN(at.getTime())) {
      res.status(400).json({ message: "invalid at timestamp" });
      return;
    }
    const matched = await findSessionAt(paths, at);
    const nearest = matched ?? await findNearestSession(paths, at);
    res.json({
      at: at.toISOString(),
      matched: Boolean(matched),
      session: nearest
    });
  });

  router.get("/sessions/:id", async (req, res) => {
    const session = await loadSession(paths, req.params.id);
    if (!session) {
      res.status(404).json({ message: "session not found" });
      return;
    }
    res.json(session);
  });

  router.get("/sessions/:id/flamegraph", async (req, res) => {
    const session = await loadSession(paths, req.params.id);
    if (!session) {
      res.status(404).send("session not found");
      return;
    }
    res.type("image/svg+xml").send(session.flamegraphPath ? buildFlamegraphSvg(session) : buildFlamegraphSvg(session));
  });

  router.get("/doctor", async (_req, res) => {
    res.json(await runDoctor(paths));
  });

  return { router, paths };
}
