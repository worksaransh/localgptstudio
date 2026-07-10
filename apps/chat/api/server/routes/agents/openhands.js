/**
 * OpenHands Adapter Route — bridges OpenHands Agent Server into LibreChat
 *
 * Mounts under /api/agents/openhands/* as a thin proxy.
 * Streams task progress back as SSE events rendered as agent-run chat bubbles.
 */

const express = require("express");
const router = express.Router();
const { OpenHandsClient } = require("@localgpt/openhands-adapter");

const openhands = new OpenHandsClient({
  baseUrl: process.env.OPENHANDS_URL || "http://localhost:8000",
  apiKey: process.env.OPENHANDS_API_KEY,
  defaultTimeoutMs: 300_000,
});

// Submit a coding task to OpenHands
router.post("/execute", async (req, res) => {
  try {
    const { task, repo_path, mode, conversation_id } = req.body;
    if (!task) return res.status(400).json({ error: "task is required" });

    const { taskId } = await openhands.submitTask({
      description: task,
      repoPath: repo_path,
      mode: mode || "step_approval",
    });

    res.json({ taskId, conversation_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stream task events as SSE
router.get("/events/:taskId", async (req, res) => {
  const { taskId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    for await (const event of openhands.streamTaskEvents(taskId)) {
      const payload = JSON.stringify({ type: "agent_event", taskId, event });
      res.write(`data: ${payload}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: "agent_done", taskId })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: "agent_error", taskId, error: err.message })}\n\n`);
  }
  res.end();
});

// Approve or reject a step
router.post("/approve/:taskId", async (req, res) => {
  try {
    const { approved, feedback } = req.body;
    await openhands.approveStep(req.params.taskId, approved ?? true, feedback);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get task result
router.get("/result/:taskId", async (req, res) => {
  try {
    const result = await openhands.getTaskResult(req.params.taskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
router.get("/health", async (req, res) => {
  try {
    const status = await openhands.health();
    res.json({ service: "openhands", ...status });
  } catch (err) {
    res.status(503).json({ service: "openhands", status: "unreachable" });
  }
});

module.exports = router;
