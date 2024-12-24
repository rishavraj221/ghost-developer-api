import fs from "fs";
import path from "path";

import { folder_agent_path_mapper as api_folder_mapper } from "./mappers/api.js";
import { folder_agent_path_mapper as ui_folder_mapper } from "./mappers/ui.js";
import { llm_generate } from "../openai/generate.js";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";

const folder_id_to_name_mapper = {
  ...ui_folder_mapper,
  ...api_folder_mapper,
};

const get_codebase_logics = ({ knowledge_graph_json_path, folder_id }) => {
  const file_data = fs.readFileSync(knowledge_graph_json_path, "utf8");

  const json_data = JSON.parse(file_data);

  const filtered_data = json_data
    .filter((jd) => jd.folder_path === folder_id_to_name_mapper[folder_id])
    .map((jd) => {
      return {
        folder_path: jd.folder_path,
        module_name: jd.module_name,
        method_name: jd.method_name,
        pseudo_code: jd.pseudo_code,
      };
    });

  return filtered_data;
};

// get_codebase_logics({
//   knowledge_graph_json_path:
//     "/Users/rishavraj/Downloads/picalive/lean-product/react-ui/knowledge-graph.json",
//   folder_id: "ui_4",
// });

const codebase_analysis_system_prompt = `
You are an expert software engineer.

You will be provided with one function and its acceptance criteria that have to be implemented on the codebase in a particular folder.

You will also be provided with a concise logic / pseudo-code of all the functions in that particular folder in the codebase.

You have to analyse if the logic/pseudo code of the function that have to be implemented is already there in the codebase or not, also if it is there then can we reuse it.

Return in the following format - 
{
    function_exist: bool,
    is_reusable: bool, // if function_exist is true 
    updated_pseudo_code: str, // if function_exist is true and is_reusable is false else empty string
}
`;

export const code_analyser_engineer = async ({
  new_function,
  knowledge_graph_json_path,
}) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: codebase_analysis_system_prompt,
      },
      {
        role: "user",
        content: `
                **Functions there in codebase in the folder where new function is to be implemented:**
                ${JSON.stringify(
                  get_codebase_logics({
                    knowledge_graph_json_path,
                    folder_id: new_function.folder_id,
                  }),
                  null,
                  2
                )}
                
                **Function to be implemented with its acceptance criteria:**
                ${JSON.stringify(new_function, null, 2)}
            `,
      },
    ],
    response_format: zodResponseFormat(
      z.object({
        function_exist: z.boolean(),
        is_reusable: z.boolean(),
        updated_pseudo_code: z.string(),
      }),
      "response-format"
    ),
  });

  //   console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

const code_module_prepare_engineer_system_prompt = `
You are an expert code write engineer.

You will get a list of functions to implement on a given file on a given folder.

Your task is to club all those functions of a single file and give the **file / module wise pseudo-code**.

The file / module code should be perfect, have proper imports and implement all the functions correctly and export them.

Your pseudo-code should follow the given acceptance criteria.

eg. suppose you get a list of 10 functions where 6 functions are for the same file / module and other 4 functions are for the different file / module.
then you will return two functions first will have the clubbed pseudo code of the first 6 functions and second will have the clubbed pseudo code of the last 4 functions.
here clubbed mean restructure, so that it will work and does not give any error after executing it

Return in the following format.

code_modules: array of {
  folder_id: str,
  folder_name: str,
  module_name: str,
  module_pseudo_code: str,
  acceptance_criteria: array of str,
},
`;

const code_write_engineer_system_prompt = `
You are an expert code write engineer.

You write industry standard, clean, elegant and DRY codes. 

You will get a module pseudo-code and its acceptance criteria.

You will return well structured code in javascript, which will execute smoothly.

Follow industry standard guidelines.

Return in the following format - 
{
code: code in str,
}
`;

export const code_module_prepare_engineer = async ({ functions }) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: code_module_prepare_engineer_system_prompt,
      },
      {
        role: "user",
        content: `
          **Functions:**
          ${JSON.stringify(functions, null, 2)}
        `,
      },
    ],
    response_format: zodResponseFormat(
      z.object({
        code_modules: z.array(
          z.object({
            folder_id: z.string(),
            folder_name: z.string(),
            module_name: z.string(),
            module_pseudo_code: z.string(),
            acceptance_criteria: z.array(z.string()),
          })
        ),
      }),
      "response-format"
    ),
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

export const code_write_engineer = async ({
  pseudo_code,
  acceptance_criteria,
}) => {
  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: code_write_engineer_system_prompt,
      },
      {
        role: "user",
        content: `
          **Pseudo-code:**
          ${pseudo_code}

          **Acceptance criteria:**
          ${acceptance_criteria}
        `,
      },
    ],
    response_format: zodResponseFormat(
      z.object({
        code: z.string(),
      }),
      "response-format"
    ),
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

// const functions_required = [
//   {
//     folder_id: "ui_1",
//     folder_name: "pages",
//     module_name: "LoginForm.js",
//     method_name: "LoginForm",
//     pseudo_code:
//       "import React, useState; define LoginForm component; create state variables for email, password, and errorMessage; create handleChange function to update state; create handleSubmit function for login logic; render email and password input fields; enable login button only if email and password are filled; display errorMessage if exists; export LoginForm.",
//     acceptance_criteria: [
//       "Login form is displayed with fields for email and password.",
//       "Login button is enabled only when both fields are filled out.",
//       "User receives feedback for invalid input.",
//     ],
//   },
//   {
//     folder_id: "ui_1",
//     folder_name: "pages",
//     module_name: "LoginForm.js",
//     method_name: "HandleErrorMessages",
//     pseudo_code:
//       "define function to handle login errors; set errorMessage state if login fails; display error message below inputs; clear error message on input change; return updated error message.",
//     acceptance_criteria: [
//       "Error message is displayed when wrong credentials are entered.",
//       "Error message is clear and provides guidance on recovery.",
//       "Error message disappears when user starts typing again.",
//     ],
//   },
//   {
//     folder_id: "ui_1",
//     folder_name: "pages",
//     module_name: "PasswordRecovery.js",
//     method_name: "PasswordRecovery",
//     pseudo_code:
//       "import React; define PasswordRecovery component; render 'Forgot Password?' link; handle click to direct user to recovery form; collect email input for recovery; submit form and display confirmation message.",
//     acceptance_criteria: [
//       "User can access a 'Forgot Password?' link on the login form.",
//       "User is directed to a password recovery form upon clicking the link.",
//       "Confirmation message displays upon submission for password recovery.",
//     ],
//   },
//   {
//     folder_id: "ui_2",
//     folder_name: "routes",
//     module_name: "routes.js",
//     method_name: "UpdateRoutes",
//     pseudo_code:
//       "import necessary components; define routes for LoginForm and PasswordRecovery; use react-router to map paths; ensure each component renders when its respective path is accessed.",
//     acceptance_criteria: [
//       "Routes are properly defined to access LoginForm and PasswordRecovery components.",
//       "Each component is rendered based on its respective path.",
//     ],
//   },
//   {
//     folder_id: "root",
//     folder_name: "root",
//     module_name: "App.js",
//     method_name: "ConditionalRendering",
//     pseudo_code:
//       "import BrowserRouter, Routes, Route; define App function; include routes from routes.js; use BrowserRouter to wrap Routes; render appropriate component based on current route selected.",
//     acceptance_criteria: [
//       "App.js is updated to display components based on user navigation via routes.",
//       "Users can navigate between the login and password recovery forms seamlessly.",
//     ],
//   },
// ];

// const code_modules = [
//   {
//     folder_id: "ui_1",
//     folder_name: "pages",
//     module_name: "Login.js",
//     module_pseudo_code:
//       "import React, { useState } from 'react';\n\nfunction LoginComponent() {\n    const [email, setEmail] = useState('');\n    const [password, setPassword] = useState('');\n    const [error, setError] = useState('');\n\n    const handleInputChange = (e) => {\n        const { name, value } = e.target;\n        if (name === 'email') setEmail(value);\n        if (name === 'password') setPassword(value);\n    };\n\n    const validateInput = (email, password) => {\n        if (!email) return 'Email cannot be empty';\n        if (!password) return 'Password cannot be empty';\n        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n        if (!emailRegex.test(email)) return 'Invalid email format';\n        return null;\n    };\n\n    const handleSubmit = async (event) => {\n        event.preventDefault();\n        const validationError = validateInput(email, password);\n        if (validationError) {\n            setError(validationError);\n            return;\n        }\n        // Assume API call here\n        const apiResponse = await fakeApiCall(email, password);\n        if (apiResponse.error) {\n            setError(apiResponse.error);\n        }\n    };\n\n    return (\n        <form onSubmit={handleSubmit}>\n            <input type=\"text\" name=\"email\" value={email} onChange={handleInputChange} placeholder=\"Email\" />\n            <input type=\"password\" name=\"password\" value={password} onChange={handleInputChange} placeholder=\"Password\" />\n            {error && <p>{error}</p>}\n            <button type=\"submit\">Login</button>\n            <button type=\"button\">Forgot Password</button>\n        </form>\n    );\n}\n\nexport default LoginComponent;",
//     acceptance_criteria: [
//       "The Login component is visually appealing and follows the UI guidelines.",
//       "The component includes input fields for email/username and password.",
//       "It has clearly labeled 'Login' and 'Forgot Password' buttons.",
//       "The form validates user input before submission.",
//       "Appropriate errors are displayed for invalid inputs (empty fields, invalid email format).",
//       "Error messages returned from the API are properly displayed to the user.",
//       "Messages include specific feedback for incorrect credentials or account issues.",
//     ],
//   },
//   {
//     folder_id: "ui_1",
//     folder_name: "pages",
//     module_name: "ForgotPassword.js",
//     module_pseudo_code:
//       'import React, { useState } from \'react\';\n\nfunction ForgotPasswordComponent() {\n    const [email, setEmail] = useState(\'\');\n\n    const handleEmailChange = (e) => {\n        setEmail(e.target.value);\n    };\n\n    const handleEmailSubmit = (event) => {\n        event.preventDefault();\n        // Handle email submission (e.g., API call)\n    };\n\n    return (\n        <form onSubmit={handleEmailSubmit}>\n            <input type="text" value={email} onChange={handleEmailChange} placeholder="Enter your email" />\n            <button type="submit">Submit</button>\n        </form>\n    );\n}\n\nexport default ForgotPasswordComponent;',
//     acceptance_criteria: [
//       "User is navigated to the password recovery page upon clicking the 'Forgot Password' link.",
//       "The recovery page has an input for the email address and instructions.",
//     ],
//   },
//   {
//     folder_id: "ui_2",
//     folder_name: "routes",
//     module_name: "index.js",
//     module_pseudo_code:
//       "import React from 'react';\nimport { BrowserRouter as Router, Route, Switch } from 'react-router-dom';\nimport LoginComponent from '../pages/Login';\nimport ForgotPasswordComponent from '../pages/ForgotPassword';\n\nfunction SetupRouting() {\n    return (\n        <Router>\n            <Switch>\n                <Route path=\"/login\" component={LoginComponent} />\n                <Route path=\"/forgot-password\" component={ForgotPasswordComponent} />\n            </Switch>\n        </Router>\n    );\n}\n\nexport default SetupRouting;",
//     acceptance_criteria: [
//       "Routing is correctly set up to navigate to the Login and Forgot Password pages.",
//       "Components are conditionally rendered based on the route in App.js.",
//     ],
//   },
// ];

// const ui_root_path =
//   "/Users/rishavraj/Downloads/picalive/lean-product/react-ui";

// const func = async () => {
//   const res1 = await code_module_prepare_engineer({
//     functions: functions_required,
//   });

//   console.log(JSON.stringify(res1, null, 2));

//   for (let i = 0; i < res1.code_modules.length; i++) {
//     const { folder_id, module_name, module_pseudo_code, acceptance_criteria } =
//       res1.code_modules[i];

//     const res2 = await code_write_engineer({
//       pseudo_code: module_pseudo_code,
//       acceptance_criteria,
//     });

//     const module_full_path = path.join(
//       ui_root_path,
//       folder_id_to_name_mapper[folder_id],
//       module_name
//     );
//     fs.writeFileSync(module_full_path, res2.code, "utf8");
//     console.log(`New module written: ${module_full_path}`);
//   }

//   // now update the knowledge graph
// };

// // func();
