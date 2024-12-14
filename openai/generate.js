import OpenAI from "openai/index.mjs";
import config from "../config.js";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: config.openai_key,
  organization: config.openai_org,
  project: config.openai_project,
});

export const llm_generate = async ({
  messages,
  response_format,
  model = config.llm_model,
}) => {
  try {
    const completion = await openai.chat.completions.create({
      messages,
      model,
      response_format: response_format || undefined,
    });

    const llm_answer = completion.choices[0].message.content;

    return llm_answer;
  } catch (err) {
    console.warn(err);
  }
};
