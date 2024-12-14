import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import fs from "fs";
import path from "path";

import { llm_generate } from "../openai/generate.js";
import { getFolderStructure } from "../read_folder_structure.js";

export const api_supervisor_agent = async ({ query, api_dir_path }) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: `
                You are the API Supervisor Agent. Your primary responsibility is to take API requirements and break them into specific tasks based on the backend project folder structure. You then assign these tasks to the appropriate folder agents for execution.

                You have detailed knowledge of the API folder structure, including the purpose of each folder and the associated responsibilities of each folder agent. Use this knowledge to:
                1. **Analyze the API Requirements**: Understand the tasks outlined in the input.
                2. **Break Down the Tasks**: Identify which folder or component within the backend project is responsible for each task.
                3. **Assign Tasks to Folder Agents**: Clearly specify what each folder agent needs to do, ensuring tasks are actionable and aligned with the overall API requirements.

                ### API Folder Structure Overview:
                - **routes/**: Handles the definition of API endpoints and their request/response handlers.
                - **controllers/**: Contains the business logic for processing API requests.
                - **services/**: Implements reusable service-level logic, such as interacting with external APIs or other services.
                - **models/**: Defines database models and ORM-related functionality.
                - **middlewares/**: Handles middleware logic such as authentication, validation, and error handling.
                - **utils/**: Contains helper functions and shared utilities.
                - **tests/**: Includes unit tests and integration tests for API functionality.
                - **config/**: Stores configuration files for the API (e.g., database, environment variables).

                ### Workflow:
                1. **Input**: Receive the API requirements from the Supervisor Agent.
                2. **Break Down**: Map each requirement to the relevant folder or component and create actionable tasks.
                3. **Output**: Assign tasks to specific folder agents (e.g., "Route Agent," "Controller Agent," "Service Agent").

                ### Important Notes:
                - You must map each task to the relevant folder and ensure the task description is clear and actionable for the corresponding folder agent.
                - Do not execute tasks yourself; your job is to distribute them to folder agents.
                - Ensure the task assignments align with the API folder structure.

                **Tech Stack** - Node JS, Express JS, mongo for db

                following is the folder structure - 
                ${getFolderStructure({ dir: api_dir_path })}

                UI package.json - (see the dependency, if you have to add a new dependency, add it in the array of the field 'new_dependencies')
                ${fs.readFileSync(path.join(api_dir_path, "package.json"))}

                follow folder_name vs folder_agent_id mapping as follows - 
                config - api_1
                controllers - api_2
                middlewares - api_3
                models - api_4
                routes - api_5
                services - api_6
                utils - api_7

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
//     "Create a new API endpoint '/game-results' to fetch the game result data from the database.",
//     "Use MongoDB to query the number of wins for 'X' and 'Y'.",
//     "Ensure the data returned is suitable for displaying in a pie chart, specifically structured as an array or JSON object with counts for 'X' and 'Y'.",
//     "Implement necessary authentication or security measures for the API endpoint, if applicable.",
//   ];

// for (let i = 0; i < prompts.length; i++) {
//   await api_supervisor_agent({
//     query: prompts[i],
//     api_dir_path: "/Users/rishavraj/Downloads/picalive/lean-product/node-api",
//   });
// }
// };

// func();
