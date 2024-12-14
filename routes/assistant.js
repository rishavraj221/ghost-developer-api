import express from "express";

import { query_agent_generate } from "../multi_agents/query_agent.js";
import { supervisor_agent_generate } from "../multi_agents/supervisor.js";
import { ui_supervisor_agent } from "../multi_agents/ui_supervisor.js";
import { api_supervisor_agent } from "../multi_agents/api_supervisor.js";
import { folder_agent } from "../multi_agents/folder_agents.js";

const router = express.Router();

router.post("/query-agent", async (req, res) => {
  const result = await query_agent_generate({
    conversation: req.body.conversation,
  });
  res.json(result);
});

router.post("/supervisor", async (req, res) => {
  const result = await supervisor_agent_generate({
    query: req.body.query,
    ui_dir_path: req.body.ui_dir_path,
    api_dir_path: req.body.api_dir_path,
  });
  res.json(result);
});

router.post("/ui-supervisor", async (req, res) => {
  const result = await ui_supervisor_agent({
    query: req.body.query,
    ui_dir_path: req.body.ui_dir_path,
  });
  res.json(result);
});

router.post("/api-supervisor", async (req, res) => {
  const result = await api_supervisor_agent({
    query: req.body.query,
    api_dir_path: req.body.api_dir_path,
  });
  res.json(result);
});

router.post("/folder-agent", async (req, res) => {
  const result = await folder_agent({
    folder_agent_id: req.body.folder_agent_id,
    agent_prompt: req.body.agent_prompt,
    ui_dir_path: req.body.ui_dir_path,
    api_dir_path: req.body.api_dir_path,
  });
  res.json(result);
});

export default router;
