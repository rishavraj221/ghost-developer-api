import dotenv from "dotenv";

dotenv.config();

export default {
  openai_key: process.env.OPENAI_KEY,
  openai_org: process.env.OPENAI_ORG,
  openai_project: process.env.OPENAI_PROJECT,
  llm_model: process.env.LLM_MODEL,
};
