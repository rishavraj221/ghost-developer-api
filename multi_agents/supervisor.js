import fs from "fs";
import path from "path";
import { z } from "zod";

import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { llm_generate } from "../openai/generate.js";
import { getFolderStructure } from "../read_folder_structure.js";

export const supervisor_agent_generate = async ({
  query,
  ui_dir_path,
  api_dir_path,
}) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: `
                    You are the Supervisor Agent. Your primary responsibility is to take a refined query and divide it into specific requirements for the UI and API. You already have comprehensive knowledge of the tech stack, dependencies, libraries, and the folder structures for both the UI and the API.

                    Your workflow is as follows:
                    1. **Receive the Refined Query**: Take the clear and actionable input.
                    2. **Analyze and Divide**: Break down the refined query into:
                    - **UI Requirements**: All tasks and functionality that relate to the user interface, front-end design, or client-side logic.
                    - **API Requirements**: All tasks and functionality related to the back-end, server-side logic, database interactions, or API endpoints.
                    3. **Output Requirements**: Return the UI and API requirements in a structured format.

                    **Tech Stack** - 
                    - **UI** - React JS
                    - **API** - Node JS, Express JS
                    - **DB** - Mongo

                    following is the UI folder structure - 
                    ${getFolderStructure({ dir: ui_dir_path })}

                    UI package.json - 
                    ${fs.readFileSync(path.join(ui_dir_path, "package.json"))}

                    following is the API folder structure - 
                    ${getFolderStructure({ dir: api_dir_path })}

                    API package.json - 
                    ${fs.readFileSync(path.join(api_dir_path, "package.json"))}

                    return in the following format - 
                    {
                        api_supervisor_prompts: array of strings,
                        ui_supervisor_prompts: array of strings
                    }

                    Important Notes:
                    - You are already aware of the tech stack, platform, and folder structure.
                    - Your goal is to create clear and actionable requirements for the UI and API supervisors.
                    - Ensure that requirements are detailed enough for further execution by the respective UI and API supervisors.
                    - Just give on overview, next agents will handle the requirements in detail

                    Your success is measured by how effectively you divide the refined query into clear and actionable UI and API requirements.
                `,
      },
      {
        role: "user",
        content: query,
      },
    ],
    response_format: zodResponseFormat(
      z.object({
        api_supervisor_prompts: z.array(z.string()),
        ui_supervisor_prompts: z.array(z.string()),
      }),
      "response-format"
    ),
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

// supervisor_agent_generate({
//   query:
//     "Display the game result data as a pie chart on the game page, showing how many times 'X' has won and how many times 'Y' has won.",
//   ui_dir_path: "/Users/rishavraj/Downloads/picalive/lean-product/react-ui",
//   api_dir_path: "/Users/rishavraj/Downloads/picalive/lean-product/node-api",
// });
