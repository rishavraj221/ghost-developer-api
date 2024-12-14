// query agent
// supervisor
// ui | api supervisor
// folder agent

import { api_supervisor_agent } from "./api_supervisor.js";
import { folder_agent } from "./folder_agents.js";
import { query_agent_generate } from "./query_agent.js";
import { supervisor_agent_generate } from "./supervisor.js";
import { ui_supervisor_agent } from "./ui_supervisor.js";

const UI_DIR_PATH = "/Users/rishavraj/Downloads/picalive/lean-product/react-ui";
const API_DIR_PATH =
  "/Users/rishavraj/Downloads/picalive/lean-product/node-api";

const conversation_builder = (question) => {
  return new Promise((resolve) => {
    process.stdout.write(question);

    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
};

const recursiveConversation = async (initialQuestion) => {
  let question = initialQuestion;
  let conversation = [];

  while (true) {
    const user_query = await conversation_builder(question);

    conversation.push({
      role: "user",
      content: user_query,
    });

    const query_agent_response = await query_agent_generate({
      conversation,
    });

    conversation.push({
      role: "assistant",
      content: query_agent_response?.doubt_to_ask,
    });

    if (query_agent_response?.is_query_clear) {
      //   console.log(JSON.stringify(conversation, null, 2));

      return query_agent_response?.to_build;
    }

    question =
      query_agent_response?.doubt_to_ask || "Could you clarify further?"; // Update question for the next iteration
  }
};

// Start the conversation
(async () => {
  const to_build = await recursiveConversation(
    "Welcome to LeanAlive! The possibilities are endless—what are we building today? 💡\n"
  );

  console.log(`Query Agent Response: To build: \n${to_build}`);

  const supervisor_response = await supervisor_agent_generate({
    query: to_build,
    ui_dir_path: UI_DIR_PATH,
    api_dir_path: API_DIR_PATH,
  });

  console.log("Supervisor Agent Response: ");
  console.log(JSON.stringify(supervisor_response, null, 2));

  console.log("Initiating API Agents : ");
  const api_tasks = supervisor_response?.api_supervisor_prompts;
  for (let i = 0; i < api_tasks?.length; i++) {
    console.log(`API Task ${i + 1}/${api_tasks.length} initiated ...`);
    const api_supervisor_response = await api_supervisor_agent({
      query: api_tasks[i],
      api_dir_path: API_DIR_PATH,
    });

    console.log("API Supervisor Response: ");
    console.log(JSON.stringify(api_supervisor_response, null, 2));

    console.log("Initiating Sub API Agents: ");
    const sub_api_tasks = api_supervisor_response?.agents;

    for (let j = 0; j < sub_api_tasks?.length; j++) {
      console.log(`Sub API Task ${j}/${sub_api_tasks.length} initiated ...`);

      const api_folder_tasks = sub_api_tasks[j]?.tasks;

      for (let k = 0; k < api_folder_tasks?.length; k++) {
        await folder_agent({
          folder_agent_id: sub_api_tasks[j]?.folder_agent_id,
          agent_prompt: api_folder_tasks[k],
          ui_dir_path: UI_DIR_PATH,
          api_dir_path: API_DIR_PATH,
        });
      }
    }
  }

  console.log("Initiating UI Agents : ");
  const ui_tasks = supervisor_response?.ui_supervisor_prompts;
  for (let i = 0; i < ui_tasks?.length; i++) {
    console.log(`UI Task ${i + 1}/${ui_tasks.length} initiated ...`);
    const ui_supervisor_response = await ui_supervisor_agent({
      query: ui_tasks[i],
      ui_dir_path: UI_DIR_PATH,
    });

    console.log("UI Supervisor Response: ");
    console.log(JSON.stringify(ui_supervisor_response, null, 2));

    console.log("Initiating Sub UI Agents: ");
    const sub_ui_tasks = ui_supervisor_response?.agents;

    for (let j = 0; j < sub_ui_tasks?.length; j++) {
      console.log(`Sub UI Task ${j}/${sub_ui_tasks.length} initiated ...`);

      const ui_folder_tasks = sub_ui_tasks[j]?.tasks;

      for (let k = 0; k < ui_folder_tasks?.length; k++) {
        await folder_agent({
          folder_agent_id: sub_ui_tasks[j]?.folder_agent_id,
          agent_prompt: ui_folder_tasks[k],
          ui_dir_path: UI_DIR_PATH,
          api_dir_path: API_DIR_PATH,
        });
      }
    }
  }

  process.exit();
})();
