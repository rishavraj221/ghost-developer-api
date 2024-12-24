import OpenAI from "openai/index.mjs";
import config from "../config.js";
import fs from "fs";

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

export const batch_input_file = async ({ file_path }) => {
  const result = await openai.files.create({
    file: fs.createReadStream(file_path),
    purpose: "batch",
  });

  return result;
};

export const create_batch = async ({ input_file_id }) => {
  const result = await openai.batches.create({
    input_file_id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  return result;
};

export const check_batch_status = async ({ batch_id }) => {
  const result = await openai.batches.retrieve(batch_id);

  return result;
};

export const retrieve_and_write_batch_result = async ({
  output_file_id,
  file_write_full_path,
}) => {
  const fileResponse = await openai.files.content(output_file_id);
  const fileContents = await fileResponse.text();

  const results = fileContents.split("\n").map((fc) => {
    if (fc)
      return {
        custom_id: JSON.parse(fc).custom_id,
        content: JSON.parse(fc).response.body.choices[0].message.content,
      };
    return {};
  });

  const knowledge_graph_arr = [];

  for (let i = 0; i < results.length; i++) {
    const custom_id = results[i].custom_id;
    const code_str = results[i].content;

    try {
      const functions = JSON.parse(code_str).functions;

      const folder_path = custom_id.split("-")[0];
      const module_name = custom_id.split("-")[2];

      knowledge_graph_arr.push(
        ...functions.map((fc) => {
          return {
            folder_path,
            module_name,
            ...fc,
          };
        })
      );
    } catch (ex) {
      console.log(code_str);
    }
  }

  fs.writeFileSync(
    file_write_full_path,
    JSON.stringify(knowledge_graph_arr, null, 2),
    {
      encoding: "utf8",
      flag: "w",
    }
  );
};
