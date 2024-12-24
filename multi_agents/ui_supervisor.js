import fs from "fs";
import path from "path";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

import { llm_generate } from "../openai/generate.js";
import { getFolderStructure } from "../read_folder_structure.js";

export const ui_supervisor_agent = async ({ query, ui_dir_path }) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: `
                You are the UI Supervisor Agent. Your primary responsibility is to take UI requirements from the Supervisor Agent and break them into specific tasks based on the folder structure of the UI project. You then assign these tasks to the appropriate folder agents for execution.

                You have detailed knowledge of the UI folder structure, including the purpose of each folder and the associated responsibilities of each folder agent. Use this knowledge to:
                1. **Analyze the UI Requirements**: Understand the tasks outlined in the input.
                2. **Break Down the Tasks**: Identify which folder or component within the UI project is responsible for each task.
                3. **Assign Tasks to Folder Agents**: Clearly specify what each folder agent needs to do, ensuring tasks are actionable and aligned with the overall UI requirements.

                ### Workflow:
                1. **Input**: Receive the UI requirements from the Supervisor Agent.
                2. **Break Down**: Map each requirement to the relevant folder or component and create actionable tasks.
                3. **Output**: Assign tasks to specific folder agents 

                ### Important Notes:
                - You must map each task to the relevant folder and ensure the task description is clear and actionable for the corresponding folder agent.
                - Do not execute tasks yourself; your job is to distribute them to folder agents.
                - Ensure the task assignments align with the UI folder structure.

                **Tech Stack** - React JS

                following is the folder structure - 
                ${getFolderStructure({ dir: ui_dir_path, as_array: true }).join(
                  "\n"
                )}

                UI package.json - (see the dependency, if you have to add a new dependency, add it in the array of the field 'new_dependencies')
                ${fs.readFileSync(path.join(ui_dir_path, "package.json"))}

                follow folder_name vs folder_agent_id mapping as follows - 
                components - ui_1
                context - ui_2
                hooks - ui_3
                pages - ui_4
                services - ui_5
                utils - ui_6

                return in the following format - 
                {
                    agents: array of object {
                        folder_agent_id: string,
                        folder_name: string,
                        tasks: array of strings,
                        new_dependencies: array of strings // if any
                    }
                }

                Your success is measured by how effectively you break down and distribute tasks to the appropriate folder agents.
                `,
      },
      {
        role: "user",
        content: query,
      },
    ],
    response_format: zodResponseFormat(
      z.object({
        agents: z.array(
          z.object({
            folder_agent_id: z.string(),
            folder_name: z.string(),
            tasks: z.array(z.string()),
            new_dependencies: z.array(z.string()),
          })
        ),
      }),
      "response-format"
    ),
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

// const func = async () => {
//   const prompts = [
//     "Integrate a pie chart library within the React project to visualize the game result statistics.",
//     "Fetch the game win data from the API using an appropriate data-fetching method (such as useEffect with fetch or axios) once the component is mounted.",
//     "Display the pie chart on the game page that dynamically represents the number of wins by 'X' and 'Y' using the fetched data.",
//     "Ensure the pie chart is responsive and visually integrates well with the existing UI/UX of the game page.",
//     "Provide basic interactivity such as hover effects or tooltips on the pie chart slices to enhance user experience.",
//   ];

// for (let i = 0; i < prompts.length; i++) {
//   await ui_supervisor_agent({
//     query: prompts[i],
//     ui_dir_path: "/Users/rishavraj/Downloads/picalive/lean-product/react-ui",
//   });
// }
// };

// func();
