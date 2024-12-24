import fs from "fs";
import path from "path";
import { getFolderStructure } from "../read_folder_structure.js";
import { llm_generate } from "../openai/generate.js";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import { code_analyser_engineer } from "./code_engineer.js";

const tasks_return_format_schema = `
{
  tasks: [
    {
      task: str, // detailed task
      acceptance_criteria: array of str 
    }
  ],
  overall_acceptance_criteria: array of str
}
`;

const return_format_schema = `
{
 functions_required: [ {
    "folder_id": str, 
    "folder_name": str,
    "module_name": str, // file / module name
    "method_name": str, // title case or camel case only
    "pseudo_code":  str, // detailed pseudo-code
    "acceptance_criteria": array of str,
  }, ... ],
overall_acceptance_criteria: array of str
}
`;

const ui_system_prompt = ({ ui_dir_path }) => `
**Objective:**  
Analyze and determine the list of necessary functions to meet the specified acceptance criteria for a React JS UI project.

**Technical Context:**  
- Utilize the React JS tech stack to create user interface components and logic.
- Use the given 'package.json' to understand existing project dependencies and versions.
- Reference the provided folder structure to organize and identify where functions will be implemented.

**Folder Structure:**
${
  ui_dir_path
    ? getFolderStructure({ dir: ui_dir_path, as_array: true }).join("\n")
    : ""
}

**package.json:**
${ui_dir_path ? fs.readFileSync(path.join(ui_dir_path, "package.json")) : ""}

**Output Format:**  
Return an array of detailed engineering tasks, to fulfill the acceptance criteria
**Return in the following format:**
${tasks_return_format_schema}

**To make sure**
Make sure tasks that write functions build / updated are being shown on App.js via routes_folder via pages_folder

**Explanation:**  
- Make sure you give the tasks that update / build the required components in the pages folder and link it to routes
- Make sure all the tasks that build required components in the routes are conditionally rendered in the App.js
`;

const api_system_prompt = ({ api_dir_path }) => `
You are an expert API engineer specializing in API development with the following tech stack:

- **API Tech Stack:** Node.js, Express.js
- **Database:** MongoDB

**Resources Provided:**
1. **Folder Structure:**
${
  api_dir_path
    ? getFolderStructure({ dir: api_dir_path, as_array: true }).join("\n")
    : ""
}

2. **Project File:** 'package.json' (for dependencies and their versions)
${api_dir_path ? fs.readFileSync(path.join(api_dir_path, "package.json")) : ""}

3. **Requirements:**
   - Return an array of detailed engineering tasks, to fulfill the acceptance criteria.

**Return in the following format:**
${tasks_return_format_schema}

**Note:**
- Be explicit in detailing the logic and any interactions with external or internal modules.
- Ensure all functions align with both individual and overall acceptance criteria specified.
- Highlight any new dependencies that need to be incorporated into the project.
`;

const ui_tasks_to_functions_system_prompt = ({ ui_dir_path }) => `
You are an experienced UI senior software engineer.

You will receive an array of tasks and the acceptance criteria for each tasks and an overall acceptance criteria

**Technical Context:**  
- Utilize the React JS tech stack to create user interface pages / components / routes / hooks / context / services / utils / any other logic.
- Use the given 'package.json' to understand existing project dependencies and versions.
- Reference the provided folder structure to organize and identify where functions will be implemented.

**Folder Structure:**
${getFolderStructure({ dir: ui_dir_path, as_array: true }).join("\n")}

**package.json:**
${fs.readFileSync(path.join(ui_dir_path, "package.json"))}

**Output Format:**
Return an array of function objects, each detailing specific attributes such as the folder, module, method, input parameters, pseudo-code logic, function calls, output, and acceptance criteria. Additionally, provide an array of overall acceptance criteria.

Follow the following mapping for the folder_name vs folder_id: 
pages - ui_1
routes - ui_2
components - ui_3
context - ui_4
hooks - ui_5
services - ui_6
utils - ui_7
App.js - root
App.css - root

**Return in the following format:**  
${return_format_schema}

**Explanation:**  
- Make sure you give the tasks that update / build the required components in the pages folder and link it to routes
- Make sure all the tasks that build required components in the routes are conditionally rendered in the App.js
`;

const api_tasks_to_functions_system_prompt = ({ api_dir_path }) => `
You are an expert API engineer specializing in API development with the following tech stack:

- **API Tech Stack:** Node.js, Express.js
- **Database:** MongoDB

**Resources Provided:**
1. **Folder Structure:**
${getFolderStructure({ dir: api_dir_path, as_array: true }).join("\n")}

2. **Folder Structure Mapping:**
   - 'config' - id: 'api_1'
   - 'controllers' - id: 'api_2'
   - 'middlewares' - id: 'api_3'
   - 'models' - id: 'api_4'
   - 'routes' - id: 'api_5'
   - 'services' - id: 'api_6'
   - 'utils' - id: 'api_7'

3. **Project File:** 'package.json' (for dependencies and their versions)
${fs.readFileSync(path.join(api_dir_path, "package.json"))}

4. **Requirements:**
   - List of jobs with their respective acceptance criteria for both API functionalities and overall codebase standards.

**Your Task:**
1. You will receive an array of tasks and the acceptance criteria for each tasks and an overall acceptance criteria.
2. Return an array of function objects, each detailing specific attributes such as the folder, module, method, input parameters, pseudo-code logic, function calls, output, and acceptance criteria. Additionally, provide an array of overall acceptance criteria.

${return_format_schema}

**Note:**
- Be explicit in detailing the logic and any interactions with external or internal modules.
- Ensure all functions align with both individual and overall acceptance criteria specified.
- Highlight any new dependencies that need to be incorporated into the project.
`;

const tasks_response_format = zodResponseFormat(
  z.object({
    tasks: z.array(
      z.object({
        task: z.string(),
        acceptance_criteria: z.array(z.string()),
      })
    ),
    overall_acceptance_criteria: z.array(z.string()),
  }),
  "response-format"
);

const response_format = zodResponseFormat(
  z.object({
    functions_required: z.array(
      z.object({
        folder_id: z.string(),
        folder_name: z.string(),
        module_name: z.string(),
        method_name: z.string(),
        pseudo_code: z.string(),
        acceptance_criteria: z.array(z.string()),
      })
    ),
    overall_acceptance_criteria: z.array(z.string()),
  }),
  "response-format"
);

export const ui_tasks_engineer_ghost = async ({
  ui_dir_path,
  ui_jobs,
  ui_acceptance_criteria,
  overall_acceptance_criteria,
}) => {
  //   console.log(ui_system_prompt({ ui_dir_path }));
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: ui_system_prompt({ ui_dir_path }),
      },
      {
        role: "user",
        content: `
              **UI Jobs:**
              ${JSON.stringify(ui_jobs, null, 2)}

              **UI acceptance criteria:**
              ${ui_acceptance_criteria}

              **Overall acceptance criteria:**
              ${overall_acceptance_criteria}
              `,
      },
    ],
    response_format: tasks_response_format,
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

export const ui_engineering_ghost = async ({
  ui_dir_path,
  ui_tasks,
  overall_acceptance_criteria,
}) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: ui_tasks_to_functions_system_prompt({ ui_dir_path }),
      },
      {
        role: "user",
        content: `
          **UI tasks with acceptance criteria:**
          ${JSON.stringify(ui_tasks, null, 2)}

          **Overall acceptance criteria:**
          ${overall_acceptance_criteria}
        `,
      },
    ],
    response_format,
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

export const api_tasks_engineer_ghost = async ({
  api_dir_path,
  api_jobs,
  api_acceptance_criteria,
  overall_acceptance_criteria,
}) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: api_system_prompt({ api_dir_path }),
      },
      {
        role: "user",
        content: `
              **API Jobs:**
              ${JSON.stringify(api_jobs, null, 2)}

              **API acceptance criteria:**
              ${api_acceptance_criteria}

              **Overall acceptance criteria:**
              ${overall_acceptance_criteria}
        `,
      },
    ],
    response_format: tasks_response_format,
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

export const api_engineering_ghost = async ({
  api_dir_path,
  api_tasks,
  overall_acceptance_criteria,
}) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: api_tasks_to_functions_system_prompt({ api_dir_path }),
      },
      {
        role: "user",
        content: `
          **API tasks with acceptance criteria:**
          ${JSON.stringify(api_tasks, null, 2)}

          **Overall acceptance criteria:**
          ${overall_acceptance_criteria}
        `,
      },
    ],
    response_format,
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2))

  return JSON.parse(res);
};

// const ui_jobs = [
//   {
//     job: "Create login form UI",
//     acceptance_criteria: [
//       "Login form is displayed with fields for email and password.",
//       "Login button is enabled only when both fields are filled out.",
//       "User receives feedback for invalid input.",
//     ],
//   },
//   {
//     job: "Implement error message display for login failures",
//     acceptance_criteria: [
//       "Error message is displayed when wrong credentials are entered.",
//       "Error message is clear and provides guidance on recovery.",
//       "Error message disappears when user starts typing again.",
//     ],
//   },
//   {
//     job: "Create password recovery UI",
//     acceptance_criteria: [
//       "User can access a 'Forgot Password?' link on the login form.",
//       "User is directed to a password recovery form upon clicking the link.",
//       "Confirmation message displays upon submission for password recovery.",
//     ],
//   },
// ];

// const ui_acceptance_criteria = [
//   "User can successfully log in with correct credentials.",
//   "User receives specific error messages for incorrect credentials.",
//   "User has a functional password recovery option through email.",
// ];

// const api_jobs = [
//   {
//     job: "Implement backend login logic",
//     acceptance_criteria: [
//       "An API endpoint accepts credentials and responds with success or error.",
//       "The API validates credentials against the database.",
//       "The API returns appropriate JSON response messages for both success and failure scenarios.",
//     ],
//   },
//   {
//     job: "Handle password recovery options in backend",
//     acceptance_criteria: [
//       "An API endpoint is available for password recovery requests.",
//       "The API sends a password reset link to the registered email.",
//       "The password reset process ensures integrity and security.",
//     ],
//   },
// ];

// const api_acceptance_criteria = [
//   "The backend login logic functions correctly and validates user credentials.",
//   "The password recovery endpoint works and sends recovery emails accordingly.",
// ];

// const overall_acceptance_criteria = [
//   "User can log in with correct credentials.",
//   "User receives an error message with incorrect credentials.",
//   "User can reset password via email link.",
// ];

// const ui_tasks_with_overall_acceptance_criteria = {
//   tasks: [
//     {
//       task: "Create a LoginForm component in the pages folder that includes fields for email and password, and a login button.",
//       acceptance_criteria: [
//         "Login form is displayed with fields for email and password.",
//         "Login button is enabled only when both fields are filled out.",
//         "User receives feedback for invalid input.",
//       ],
//     },
//     {
//       task: "Implement error handling in the LoginForm component to display error messages when invalid credentials are provided.",
//       acceptance_criteria: [
//         "Error message is displayed when wrong credentials are entered.",
//         "Error message is clear and provides guidance on recovery.",
//         "Error message disappears when user starts typing again.",
//       ],
//     },
//     {
//       task: "Create a PasswordRecovery component in the pages folder with a 'Forgot Password?' link that leads to the password recovery form.",
//       acceptance_criteria: [
//         "User can access a 'Forgot Password?' link on the login form.",
//         "User is directed to a password recovery form upon clicking the link.",
//         "Confirmation message displays upon submission for password recovery.",
//       ],
//     },
//     {
//       task: "Update the routes in the routes folder to include paths for LoginForm and PasswordRecovery components.",
//       acceptance_criteria: [
//         "Routes are properly defined to access LoginForm and PasswordRecovery components.",
//         "Each component is rendered based on its respective path.",
//       ],
//     },
//     {
//       task: "Conditionally render the LoginForm and PasswordRecovery components in the App.js.",
//       acceptance_criteria: [
//         "App.js is updated to display components based on user navigation via routes.",
//         "Users can navigate between the login and password recovery forms seamlessly.",
//       ],
//     },
//   ],
//   overall_acceptance_criteria: [
//     "User can log in with correct credentials.",
//     "User receives an error message with incorrect credentials.",
//     "User can reset password via email link.",
//   ],
// };

// ui_tasks_engineer_ghost({
//   ui_dir_path: "/Users/rishavraj/Downloads/picalive/lean-product/react-ui",
//   ui_jobs,
//   ui_acceptance_criteria,
//   overall_acceptance_criteria,
// });

// api_engineer_ghost({
//   api_dir_path: "/Users/rishavraj/Downloads/picalive/lean-product/node-api",
//   api_jobs,
//   api_acceptance_criteria,
//   overall_acceptance_criteria,
// });

// const func = async () => {
//   const res = await ui_engineering_ghost({
//     ui_dir_path: "/Users/rishavraj/Downloads/picalive/lean-product/react-ui",
//     ui_tasks: ui_tasks_with_overall_acceptance_criteria.tasks,
//     overall_acceptance_criteria:
//       ui_tasks_with_overall_acceptance_criteria.overall_acceptance_criteria,
//   });

//   console.log(JSON.stringify(res, null, 2));

//   const knowledge_graph_json_path =
//     "/Users/rishavraj/Downloads/picalive/lean-product/react-ui/knowledge-graph.json";

//   for (let i = 0; i < res.functions_required.length; i++) {
//     const funct = res.functions_required[i];

//     const res2 = await code_analyser_engineer({
//       new_function: funct,
//       knowledge_graph_json_path,
//     });

//     console.log(`logging for function: ${i + 1}`);
//     console.log(JSON.stringify(res2, null, 2));
//   }
// };

// func();
