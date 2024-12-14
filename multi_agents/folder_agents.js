import path from "path";
import fs from "fs";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";

import { llm_generate } from "../openai/generate.js";
import { yamlParse } from "../yaml_parse.js";
import { folder_agent_path_mapper as folder_agent_ui_path_mapper } from "./mappers/ui.js";
import { folder_agent_path_mapper as folder_agent_api_path_mapper } from "./mappers/api.js";
import { getFolderStructure } from "../read_folder_structure.js";

export const folder_agent = async ({
  folder_agent_id,
  agent_prompt,
  ui_dir_path = `/Users/rishavraj/Downloads/picalive/lean-product/react-ui`,
  api_dir_path = `/Users/rishavraj/Downloads/picalive/lean-product/node-api`,
}) => {
  let folder_name;
  let dir_path;

  if (folder_agent_id.includes("ui")) {
    folder_name = folder_agent_ui_path_mapper[folder_agent_id];
    dir_path = ui_dir_path;
  } else if (folder_agent_id.includes("api")) {
    folder_name = folder_agent_api_path_mapper[folder_agent_id];
    dir_path = api_dir_path;
  }

  const folder_full_path = path.join(dir_path, folder_name);

  const context = yamlParse({ folder_path: folder_full_path });

  const folder_structure = getFolderStructure({
    dir: folder_full_path,
    as_array: true,
  });

  let system_prompt = context?.agent?.system;
  system_prompt += `

    Return only the code files, no markdown or other files (.js | .jsx | .py , etc...)

    Return the code in the response format 
    {
        "layer": "string", // ui | api
        "fileName": "string", // only give file_name.ext, don't give ../folder_name/file_name.ext
        "isNewFile": "boolean",
        "code": "code_content"
    }
  `;

  let user_prompt = context?.agent?.user.replace(
    "{{ folder_structure }}",
    folder_structure
  );
  user_prompt.replace("{{ prompt }}", agent_prompt);

  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: system_prompt,
      },
      {
        role: "user",
        content: user_prompt,
      },
    ],
    response_format: zodResponseFormat(
      z.object({
        codes: z.array(
          z.object({
            layer: z.string(),
            fileName: z.string(),
            isNewFile: z.boolean(),
            code: z.string(),
          })
        ),
      }),
      "response-format"
    ),
  });

  const llm_answer = JSON.parse(res);

  //   console.log(JSON.stringify(llm_answer, null, 2));

  for (let i = 0; i < llm_answer?.codes?.length; i++) {
    const code_obj = llm_answer.codes[i];

    // don't modify context.yml file
    if (code_obj?.fileName.includes("context")) continue;

    let file_name = code_obj?.fileName;
    if (file_name.includes("/")) {
      let f_arr = file_name.split("/");
      file_name = f_arr[f_arr.length - 1];
    }

    const file_path = path.join(folder_full_path, file_name);

    fs.writeFileSync(file_path, code_obj?.code, "utf-8");
    console.log(`File created / updated: ${file_path}`);
  }
};

// folder_agent({
//   folder_agent_id: "ui_1",
//   agent_prompt:
//     "Implement hover effects on pie chart slices to provide a visual indication when a slice is hovered over. This can include changing the color slightly or adding a shadow.",
// });
