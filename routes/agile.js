import express from "express";

import { product_manager_ghost } from "../multi_agents_v2/product_manager.js";
import { full_stack_engineer_ghost } from "../multi_agents_v2/full_stack_engineer.js";
import {
  api_engineering_ghost,
  api_tasks_engineer_ghost,
  ui_engineering_ghost,
  ui_tasks_engineer_ghost,
} from "../multi_agents_v2/senior_engineer.js";
import {
  code_analyser_engineer,
  code_module_prepare_engineer,
  code_write_engineer,
} from "../multi_agents_v2/code_engineer.js";

const router = express.Router();

router.post("/product-manager", async (req, res) => {
  const result = await product_manager_ghost({
    conversation: req.body.conversation,
  });
  res.json(result);
});

router.post("/full-stack-engineer", async (req, res) => {
  const result = await full_stack_engineer_ghost({
    epic: req.body.epic,
    story_index: req.body.story_index,
  });
  res.json(result);
});

router.post("/ui-tasks-engineer", async (req, res) => {
  const result = await ui_tasks_engineer_ghost({
    ui_dir_path: req.body.ui_dir_path,
    ui_jobs: req.body.ui_jobs,
    ui_acceptance_criteria: req.body.ui_acceptance_criteria,
    overall_acceptance_criteria: req.body.overall_acceptance_criteria,
  });
  res.json(result);
});

router.post("/api-tasks-engineer", async (req, res) => {
  const result = await api_tasks_engineer_ghost({
    api_dir_path: req.body.api_dir_path,
    api_jobs: req.body.api_jobs,
    api_acceptance_criteria: req.body.api_acceptance_criteria,
    overall_acceptance_criteria: req.body.overall_acceptance_criteria,
  });
  res.json(result);
});

router.post("/ui-engineer", async (req, res) => {
  const result = await ui_engineering_ghost({
    ui_dir_path: req.body.ui_dir_path,
    ui_tasks: req.body.ui_tasks,
    overall_acceptance_criteria: req.body.overall_acceptance_criteria,
  });
  res.json(result);
});

router.post("/api-engineer", async (req, res) => {
  const result = await api_engineering_ghost({
    api_dir_path: req.body.api_dir_path,
    api_tasks: req.body.api_tasks,
    overall_acceptance_criteria: req.body.overall_acceptance_criteria,
  });
  res.json(result);
});

router.post("/code-analyser-engineer", async (req, res) => {
  const result = await code_analyser_engineer({
    new_function: req.body.new_function,
    knowledge_graph_json_path: req.body.knowledge_graph_json_path,
  });
  res.json(result);
});

router.post("/code-module-prepare-engineer", async (req, res) => {
  const result = await code_module_prepare_engineer({
    functions: req.body.functions,
  });
  res.json(result);
});

router.post("/code-write-engineer", async (req, res) => {
  const result = await code_write_engineer({
    pseudo_code: req.body.pseudo_code,
    acceptance_criteria: req.body.acceptance_criteria,
  });
  res.json(result);
});

export default router;
