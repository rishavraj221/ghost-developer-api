import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import fs from "fs";

import { getFolderStructure } from "./read_folder_structure.js";
import config from "./config.js";

const openai = new OpenAI({
  apiKey: config.openai_key,
  organization: config.openai_org,
  project: config.openai_project,
});

const BACKEND_DIR_PATH = "/Users/rishavraj/Downloads/picalive/backend_v2";

const analyze_agents_system_prompt = `
You are an expert system architect and agent-based automation designer. Your task is to analyze a given backend project structure made with Node.js and Express.js and recommend:

1. The number of micro agents required.
2. The specific roles and responsibilities of each micro agent.
3. A supervisor agent to coordinate tasks among the micro agents.

Consider the following:
- Micro agents should handle distinct responsibilities such as routing, middleware, database interactions, services, testing, etc.
- The supervisor agent will manage communication between micro agents and ensure tasks are distributed appropriately.
- The folder structure will define the project's scope and components.

Provide a detailed explanation for your recommendations in role field, including why each agent is needed.
Also provide the folder name of the files on which the agent will look into, in an array.
`;

const analyze_agents_user_prompt = `
I have a backend project built with Node.js and Express.js. Below is the folder structure:

${getFolderStructure({ dir: BACKEND_DIR_PATH })}

### Requirements:
1. Suggest the number of micro agents and their roles.
2. Define the role of a supervisor agent.
3. Ensure all critical areas (e.g., routing, middleware, database, and testing) are covered.
`;

const AgentFormat = z.object({
  name: z.string(),
  role: z.string(),
  folders: z.array(z.string()),
});

const ResponseFormat = z.object({
  micro_agents: z.array(AgentFormat),
  supervisor_agent: AgentFormat,
});

export const analyze_agent_assistant = async () => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: analyze_agents_system_prompt,
        },
        {
          role: "user",
          content: analyze_agents_user_prompt,
        },
      ],
      model: "gpt-4o",
      response_format: zodResponseFormat(
        ResponseFormat,
        "code-response-format"
      ),
    });

    // console.log(JSON.stringify(completion, null, 2));

    const llm_response = completion.choices[0].message.content;

    console.log(JSON.stringify(JSON.parse(llm_response), null, 2));
  } catch (err) {
    console.error(err);
  }
};

// analyze_agent_assistant();

const analyze_file_system_prompt = `
You are an intelligent code analyzer designed to extract structured information from a file's content. Your task is to analyze the provided file content and return the following details based on the context of a Node.js and Express.js project:

1. **File Metadata:**
   - File path
   - File name

2. **Key Information:**
   - List of functions or methods defined in the file with their names and parameters.
   - List of dependencies or imports used in the file.
   - Type of file (e.g., route, controller, middleware, model, service, utility).
   - Key exported elements (e.g., functions, objects, or classes).
   - Associated features (if discernible, e.g., "Authentication" for 'authController.js').

3. **Contextual Relationships:**
   - Linkage with other files (e.g., a route file connecting to a controller, a service being used in a controller).
   - Agent responsibility for the file (e.g., Routing Agent for route files).
`;

const anaylze_file_user_prompt = (file_path) => {
  const arr = file_path.split("/");
  const file_content = fs.readFileSync(file_path, "utf-8");

  return `
    Analyze the following file and extract the required information. The file belongs to a Node.js and Express.js backend project. Here is the file metadata and content:

    **Metadata:**
    - File Path: ${file_path}
    - File Name: ${arr[arr.length - 1]}

    **File Content:**
    ${file_content}
`;
};

const DefinedFunctionsFormat = z.object({
  name: z.string(),
  parameters: z.array(z.string()),
});

const KeyExportedElementsFormat = z.object({
  type: z.string(),
  name: z.string(),
});

const MiddlewareFormat = z.object({
  file: z.string(),
  usage: z.array(z.string()),
});

const ControllersFormat = z.object({
  file: z.string(),
  functionsUsed: z.array(z.string()),
});

const CodeResponseFormat = z.object({
  fileMetadata: z.object({
    filePath: z.string(),
    fileName: z.string(),
  }),
  keyInformation: z.object({
    definedFunctions: z.array(DefinedFunctionsFormat),
    dependencies: z.array(z.string()),
    typeOfFile: z.string(),
    keyExportedElements: z.array(KeyExportedElementsFormat),
    associatedFeatures: z.array(z.string()),
  }),
  contextualRelationships: z.object({
    linkageWithOtherFiles: z.object({
      middlewares: z.array(MiddlewareFormat),
      controllers: z.array(ControllersFormat),
    }),
    agentResponsibility: z.string(),
  }),
});

export const analyze_file = async (file_path) => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: analyze_file_system_prompt,
        },
        {
          role: "user",
          content: anaylze_file_user_prompt(file_path),
        },
      ],
      model: "gpt-4o",
      response_format: zodResponseFormat(
        CodeResponseFormat,
        "code-response-format"
      ),
    });

    const llm_response = completion.choices[0].message.content;
    // console.log(JSON.stringify(completion, null, 2));

    console.log(JSON.stringify(JSON.parse(llm_response), null, 2));

    // const answer = `{\n  \"fileMetadata\": {\n    \"filePath\": \"/Users/rishavraj/Downloads/picalive/backend_v2/src/routes/album.js\",\n    \"fileName\": \"album.js\",\n    \"lastModified\": null\n  },\n  \"keyInformation\": {\n    \"definedFunctions\": [\n      {\n        \"name\": \"router.get\",\n        \"parameters\": [\"/\", \"authorize\", \"getAllAlbums\"]\n      },\n      {\n        \"name\": \"router.get\",\n        \"parameters\": [\"/:id\", \"authorize\", \"getAlbum\"]\n      },\n      {\n        \"name\": \"router.get\",\n        \"parameters\": [\"/:id/owner\", \"authorize\", \"getAlbumOwner\"]\n      },\n      {\n        \"name\": \"router.get\",\n        \"parameters\": [\"/:id/shared-users\", \"authorize\", \"getAlbumSharedUsers\"]\n      },\n      {\n        \"name\": \"router.post\",\n        \"parameters\": [\"/\", \"authorize\", \"createAlbum\"]\n      },\n      {\n        \"name\": \"router.patch\",\n        \"parameters\": [\"/:id\", \"authorize\", \"updateAlbum\"]\n      },\n      {\n        \"name\": \"router.patch\",\n        \"parameters\": [\"/share/:id\", \"authorize\", \"shareAlbum\"]\n      },\n      {\n        \"name\": \"router.delete\",\n        \"parameters\": [\"/:id\", \"authorize\", \"softDelete\"]\n      },\n      {\n        \"name\": \"router.delete\",\n        \"parameters\": [\"/:id/hard\", \"authorize\", \"hardDelete\"]\n      }\n    ],\n    \"dependencies\": [\n      \"express\",\n      \"../middlewares/auth.js\",\n      \"../controllers/album.js\"\n    ],\n    \"typeOfFile\": \"route\",\n    \"keyExportedElements\": [\n      {\n        \"type\": \"default export\",\n        \"name\": \"router\"\n      }\n    ],\n    \"associatedFeatures\": [\"Albums Management\", \"Authorization\"]\n  },\n  \"contextualRelationships\": {\n    \"linkageWithOtherFiles\": {\n      \"middlewares\": [\n        {\n          \"file\": \"../middlewares/auth.js\",\n          \"usage\": [\"authorize\"]\n        }\n      ],\n      \"controllers\": [\n        {\n          \"file\": \"../controllers/album.js\",\n          \"functionsUsed\": [\n            \"createAlbum\", \"getAlbum\", \"getAlbumOwner\", \"getAllAlbums\", \n            \"shareAlbum\", \"updateAlbum\", \"softDelete\", \"hardDelete\", \n            \"getAlbumSharedUsers\"\n          ]\n        }\n      ]\n    },\n    \"agentResponsibility\": \"Routing Agent\"\n  }\n}`;

    // console.log(answer);
  } catch (error) {
    console.log(error);
  }
};

analyze_file(
  "/Users/rishavraj/Downloads/picalive/backend_v2/src/services/album.js"
);
