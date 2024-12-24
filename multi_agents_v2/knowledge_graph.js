import fs from "fs";
import path from "path";
import { parse } from "acorn";
import { simple } from "acorn-walk";
import doctrine from "doctrine";
import {
  check_batch_status,
  llm_generate,
  retrieve_and_write_batch_result,
} from "../openai/generate.js";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import uniqid from "uniqid";
import config from "../config.js";
import { batch_processing } from "./batch_processing.js";

const ignoreFolders = [
  "node_modules",
  ".serverless",
  ".next",
  "public",
  "amplify",
];
const ignoreFiles = ["package-lock.json"];

const node_js_system_prompt = `
You are an advanced language model with a strong background in software development, particularly in JavaScript and Node.js. The user will provide you with the code of a JavaScript module. Your task is to analyze the code and identify all the functions and methods within it. For each function/method, create and return an object in an array with the following structure:

- "method_name": The name of the function or method.
- "input_params": An array describing each parameter.
{
    - "type": Data type of the parameter (e.g., string, number, object, etc.).
    - "name": The name of the parameter.
    - "is_required": A boolean indicating if the parameter is required.
    - "optional_value": The default value if the parameter is optional, otherwise "null" or "undefined".
}
- "pseudo_code": Detailed pseudo-code of the function.
- "inner_functions_call": An array of objects for each function/method call within the method.
{
    - "name": The name of the function or method being called.
    - "import_path": The library or location the function is imported from.
}
- "output": An object describing the output of the function.
{
    - "type": Data type of the output.
    - "description": A description of what the output represents.
}

You must carefully analyze the provided JavaScript code, taking your time to thoroughly understand each function's purpose and intricacies. Return the detailed analysis as specified.
`;

const next_js_system_prompt = `
You are an advanced language model with a strong background in software development, particularly in JavaScript and Next.js. The user will provide you with the code of a Next.js module. Your task is to analyze the code and identify all the functions and methods within it. For each function/method, create and return an object in an array with the following structure:

- "function_name": The name of the function or method.
- "input_params": An array describing each parameter.
    -  "type": "Data type of the parameter (e.g., string, number, object, etc.).",
    -  "name": "The name of the parameter.",
    -  "is_required": "A boolean indicating if the parameter is required.",
    -  "optional_value": "The default value if the parameter is optional, otherwise null or undefined."
- "pseudo_code": Pseudo-code of the function.
- "inner_functions_call": An array of objects for each function/method call within the function.
    -  "name": "The name of the function or method being called.",
    -  "import_path": "The library or location the function is imported from."
- "output": An object describing the output of the function.
    -  "type": "Data type of the output.",
    -  "description": "A description of what the output represents, particularly in the context of Next.js (e.g., component return value, server response)."
Ensure to consider common Next.js patterns, such as server-side functions, API routes, and React hooks. Provide a clear and contextually relevant overview that acknowledges the frameworks' conventions. Return the detailed analysis as specified.
`;

function parseComments(comments) {
  const paramDetails = [];
  comments.forEach((comment) => {
    const parsed = doctrine.parse(comment.value, { unwrap: true });
    parsed.tags.forEach((tag) => {
      if (tag.title === "param") {
        paramDetails.push({
          type: tag.type ? tag.type.name : "unknown",
          name: tag.name,
          is_required: !tag.default,
          optional_value: tag.default || null,
        });
      }
    });
  });
  return paramDetails;
}

function parseJavaScriptFile(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");

  const ast = parse(code, {
    locations: true,
    onComment: [],
    sourceType: "module",
    ecmaVersion: 2020,
  });

  //   console.log(JSON.stringify(ast, null, 2));

  const functions = [];
  simple(ast, {
    // FunctionDeclaration(node, state) {
    ExportNamedDeclaration(node, state) {
      console.log(node);
      const params = node.params.map((param) => ({
        type: "unknown",
        name: param.name || "unknown",
        is_required: true,
        optional_value: null,
      }));

      functions.push({
        function_name: node.id.name,
        input_params: params,
        inner_function_calls: [], // TODO: Extract information
        output: {
          type: "unknown",
        },
      });
    },
  });

  console.log(functions);
  return functions;
}

async function traverseDir(system_prompt, rootDir, ignoreFolders, json1_path) {
  //   const result = [];

  const batch_query = [];

  async function traverse(currentDir) {
    const files = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(currentDir, file.name);
      if (file.isDirectory()) {
        if (!ignoreFolders.includes(file.name)) {
          await traverse(fullPath);
        }
      } else if (file.isFile() && path.extname(file.name) === ".js") {
        const code = fs.readFileSync(fullPath, "utf-8");
        // const functions = parseJavaScriptFile(fullPath);

        // const llm_response = await llm_generate({
        //   messages: [
        //     {
        //       role: "system",
        //       content: node_js_system_prompt,
        //     },
        //     {
        //       role: "user",
        //       content: code,
        //     },
        //   ],
        //   response_format: zodResponseFormat(
        //     z.object({
        //       functions: z.array(
        //         z.object({
        //           method_name: z.string(),
        //           input_params: z.array(
        //             z.object({
        //               type: z.string(),
        //               name: z.string(),
        //               is_required: z.string(),
        //               optional_value: z.string(),
        //             })
        //           ),
        //           logic: z.string(),
        //           inner_function_calls: z.array(
        //             z.object({
        //               name: z.string(),
        //               import_path: z.string(),
        //             })
        //           ),
        //           output: z.object({
        //             type: z.string(),
        //             description: z.string(),
        //           }),
        //         })
        //       ),
        //     }),
        //     "response-format"
        //   ),
        // });

        const folder_path = path.relative(rootDir, currentDir);
        const module_name = file.name;

        batch_query.push({
          custom_id: uniqid(`${folder_path}-`, `-${module_name}`),
          method: "POST",
          url: "/v1/chat/completions",
          body: {
            model: config.llm_model,
            messages: [
              {
                role: "system",
                // content: node_js_system_prompt,
                content: system_prompt,
              },
              {
                role: "user",
                content: code,
              },
            ],
            response_format: zodResponseFormat(
              z.object({
                functions: z.array(
                  z.object({
                    method_name: z.string(),
                    input_params: z.array(
                      z.object({
                        type: z.string(),
                        name: z.string(),
                        is_required: z.string(),
                        optional_value: z.string(),
                      })
                    ),
                    pseudo_code: z.string(),
                    inner_function_calls: z.array(
                      z.object({
                        name: z.string(),
                        import_path: z.string(),
                      })
                    ),
                    output: z.object({
                      type: z.string(),
                      description: z.string(),
                    }),
                  })
                ),
              }),
              "response-format"
            ),
          },
        });

        // result.push(
        //   ...JSON.parse(llm_response).functions.map((func) => ({
        //     folder_path: path.relative(rootDir, currentDir),
        //     module_name: file.name,
        //     ...func,
        //   }))
        // );
      }
    }
  }

  await traverse(rootDir);

  let prompt_content = "";
  for (let i = 0; i < batch_query.length; i++) {
    prompt_content += JSON.stringify(batch_query[i]) + "\n";
  }

  fs.writeFileSync(json1_path, prompt_content, { encoding: "utf8", flag: "w" });

  //   console.log("writing in knowledge graph ...");
  //   fs.writeFileSync(
  //     `/Users/rishavraj/Downloads/picalive/scripts/multi_agents_v2/knowledge_graph.json`,
  //     JSON.stringify(result, null, 2),
  //     {
  //       encoding: "utf8",
  //       flag: "w",
  //     }
  //   );
  //   console.log("knowledge graph written! :)");
  //   return result;
}

// Usage

// UI
const system_prompt = next_js_system_prompt;
const rootDir = "/Users/rishavraj/Downloads/picalive/lean-product/react-ui";
const json1Path =
  "/Users/rishavraj/Downloads/picalive/lean-product/react-ui/prompt.json1";
const knowledgeGraphJSONPath =
  "/Users/rishavraj/Downloads/picalive/lean-product/react-ui/knowledge-graph.json";

// API
// const system_prompt = node_js_system_prompt;
// const rootDir = "/Users/rishavraj/Downloads/picalive/lean-product/node-api";
// const json1Path =
//   "/Users/rishavraj/Downloads/picalive/lean-product/node-api/prompt.json1";
// const knowledgeGraphJSONPath =
//   "/Users/rishavraj/Downloads/picalive/lean-product/node-api/knowledge-graph.json";

// traverseDir(system_prompt, rootDir, ignoreFolders, json1Path).then(
//   (functions) => {
//     console.log(JSON.stringify(functions, null, 2));
//   }
// );

// parseJavaScriptFile(`${rootDir}/s3.js`);

// batch_processing({ file_path: json1Path });

const func = async () => {
  // const res1 = await check_batch_status({
  //   batch_id: "batch_6767c32ddcf88190a4bab993faccaa7a",
  // });
  // console.log(res1);

  const res2 = await retrieve_and_write_batch_result({
    output_file_id: "file-8pMRxxTmbgsPNKfXawJp3Y",
    file_write_full_path: knowledgeGraphJSONPath,
  });
  console.log(res2);
};

// func();
