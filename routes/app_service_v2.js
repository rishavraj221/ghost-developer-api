import express from "express";
import fs from "fs";
import path from "path";

import { folder_agent_path_mapper as api_folder_mapper } from "../multi_agents_v2/mappers/api.js";
import { folder_agent_path_mapper as ui_folder_mapper } from "../multi_agents_v2/mappers/ui.js";
import { full_stack_engineer_ghost } from "../multi_agents_v2/full_stack_engineer.js";
import {
  api_engineering_ghost,
  api_tasks_engineer_ghost,
  ui_engineering_ghost,
  ui_tasks_engineer_ghost,
} from "../multi_agents_v2/senior_engineer.js";
import {
  code_analyser_engineer,
  code_module_prepare_engineer,
  code_write_engineer,
} from "../multi_agents_v2/code_engineer.js";

const router = express.Router();

const folder_id_to_name_mapper = {
  ...ui_folder_mapper,
  ...api_folder_mapper,
  root: "",
};

const NOT_STARTED = "not_started";
const IN_PROGRESS = "in_progress";
const FINISHED = "finished";
const STATUS = "status";
const CODE = "code";
const TEXT = "text";
const HELLO_WORLD = "hello_world";

const processEngineerResponses = async ({ engineerResponses }) => {
  const result = [];

  for (let j = 0; j < engineerResponses.value.length; j++) {
    const engineerResponse = engineerResponses.value[j];

    if (engineerResponse.status === "fulfilled") {
      const { code_modules } = engineerResponse.value;

      const codePromises = code_modules.map(
        ({ module_pseudo_code, acceptance_criteria }) =>
          code_write_engineer({
            pseudo_code: module_pseudo_code,
            acceptance_criteria,
          })
      );

      const codeResponses = await Promise.allSettled(codePromises);

      for (let k = 0; k < code_modules.length; k++) {
        if (codeResponses[k].status === "fulfilled") {
          const { folder_id, folder_name, module_name, acceptance_criteria } =
            code_modules[k];
          const { code } = codeResponses[k].value;

          const codeObjToReturn = {
            folder_id,
            folder_name,
            module_name,
            acceptance_criteria,
            code,
          };

          result.push(codeObjToReturn);
        } else {
          console.error(codeResponses[k]);
        }
      }
    } else {
      console.error(engineerResponse);
    }
  }

  return result;
};

router.get("/", async (req, res) => {
  // Set headers for SSE (Server Side Event)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const obj_to_return = ({ type, content }) => {
    return {
      type,
      content,
    };
  };

  // Send an initial event
  res.write(
    `data: ${JSON.stringify(
      obj_to_return({ type: TEXT, content: HELLO_WORLD })
    )}\n\n`
  );

  const job_id = req.query["job-id"];
  const ui_dir_path = req.query["ui-dir-path"];
  const api_dir_path = req.query["api-dir-path"];

  const job_content = fs.readFileSync(
    "/Users/rishavraj/Downloads/picalive/scripts/jobs.json",
    "utf8"
  );
  const jobs_data = JSON.parse(job_content);

  const epics = jobs_data[job_id].epics;

  const status_progress = {};

  epics.forEach((ep, i) => {
    status_progress[ep.id] = NOT_STARTED;

    ep.stories.forEach((st, j) => {
      status_progress[st.id] = NOT_STARTED;

      st.tasks.forEach((ts, k) => {
        status_progress[ts.id] = NOT_STARTED;
      });
    });
  });

  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];

    status_progress[epic.id] = IN_PROGRESS;
    res.write(
      `data: ${JSON.stringify(
        obj_to_return({ type: STATUS, content: status_progress })
      )}\n\n`
    );

    const stories = epic.stories;

    const promises = [];

    stories.forEach((story, j) => {
      status_progress[story.id] = IN_PROGRESS;

      story.tasks.forEach((ts, k) => {
        status_progress[ts.id] = IN_PROGRESS;
      });

      promises.push(
        full_stack_engineer_ghost({
          epic,
          story_index: j,
        })
      );
    });

    res.write(
      `data: ${JSON.stringify(
        obj_to_return({ type: STATUS, content: status_progress })
      )}\n\n`
    );
    const full_stack_responses = await Promise.allSettled(promises);

    let ui_promises = [];
    let api_promises = [];

    for (let j = 0; j < full_stack_responses.length; j++) {
      if (full_stack_responses[j].status === "fulfilled") {
        const { ui, api, overall_acceptance_criteria } =
          full_stack_responses[j].value;

        ui_promises.push(
          ui_tasks_engineer_ghost({
            ui_dir_path,
            ui_jobs: ui.jobs,
            ui_acceptance_criteria: ui.overall_acceptance_criteria,
            overall_acceptance_criteria,
          })
        );
        api_promises.push(
          api_tasks_engineer_ghost({
            api_dir_path,
            api_jobs: api.jobs,
            api_acceptance_criteria: api.overall_acceptance_criteria,
            overall_acceptance_criteria,
          })
        );
      } else console.error(full_stack_responses[j]);
    }

    let senior_engineer_response = await Promise.allSettled([
      Promise.allSettled(ui_promises),
      Promise.allSettled(api_promises),
    ]);

    let ui_engineer_responses = senior_engineer_response[0];
    let api_engineer_responses = senior_engineer_response[1];

    ui_promises = [];
    for (let j = 0; j < ui_engineer_responses.value.length; j++) {
      const ui_eng_res = ui_engineer_responses.value[j];

      if (ui_eng_res.status === "fulfilled") {
        const { tasks, overall_acceptance_criteria } = ui_eng_res.value;

        ui_promises.push(
          ui_engineering_ghost({
            ui_dir_path,
            ui_tasks: tasks,
            overall_acceptance_criteria,
          })
        );
      } else {
        console.error(ui_eng_res);
      }
    }

    api_promises = [];
    for (let j = 0; j < api_engineer_responses.value.length; j++) {
      const api_eng_res = api_engineer_responses.value[j];

      if (api_eng_res.status === "fulfilled") {
        const { tasks, overall_acceptance_criteria } = api_eng_res.value;

        api_promises.push(
          api_engineering_ghost({
            api_dir_path,
            api_tasks: tasks,
            overall_acceptance_criteria,
          })
        );
      } else {
        console.error(api_eng_res);
      }
    }

    senior_engineer_response = await Promise.allSettled([
      Promise.allSettled(ui_promises),
      Promise.allSettled(api_promises),
    ]);

    ui_engineer_responses = senior_engineer_response[0];
    api_engineer_responses = senior_engineer_response[1];

    ui_promises = [];
    for (let j = 0; j < ui_engineer_responses.value.length; j++) {
      const ui_eng_res = ui_engineer_responses.value[j];

      if (ui_eng_res.status === "fulfilled") {
        const { functions_required, overall_acceptance_criteria } =
          ui_eng_res.value;

        // for (let k = 0; k < functions_required.length; k++) {
        //     const funct = functions_required[k];

        //     const ca_res = await code_analyser_engineer({ new_function: funct, knowledge_graph_json_path: path.join(ui_dir_path, 'knowledge-graph.json')})

        //     if (ca_res.function_exist) {
        //         // ... do stuff when the function exist
        //         if (ca_res.is_reusable) {
        //             // ... do stuff when the function is reusable, that is to resuse it
        //         } else {
        //             // ... do stuff to modify the function
        //         }
        //     }
        // }

        // to be modified ...
        // when the function in the codebase doens't exist only then call this
        ui_promises.push(
          code_module_prepare_engineer({ functions: functions_required })
        );
      } else {
        console.error(ui_eng_res);
      }
    }

    api_promises = [];
    for (let j = 0; j < api_engineer_responses.value.length; j++) {
      const api_eng_res = api_engineer_responses.value[j];

      if (api_eng_res.status === "fulfilled") {
        const { functions_required, overall_acceptance_criteria } =
          api_eng_res.value;

        // for (let k = 0; k < functions_required.length; k++) {
        // logic to check the codebase
        // }

        // to be modified ...
        // when the function in the codebase doens't exist only then call this
        api_promises.push(
          code_module_prepare_engineer({ functions: functions_required })
        );
      } else {
        console.error(api_eng_res);
      }
    }

    let code_engineer_responses = await Promise.allSettled([
      Promise.allSettled(ui_promises),
      Promise.allSettled(api_promises),
    ]);

    ui_engineer_responses = code_engineer_responses[0];
    api_engineer_responses = code_engineer_responses[1];

    const code_eng_res = await Promise.allSettled([
      processEngineerResponses({
        engineerResponses: ui_engineer_responses,
      }),
      processEngineerResponses({
        engineerResponses: api_engineer_responses,
      }),
    ]);

    ui_engineer_responses = code_eng_res[0];
    for (let j = 0; j < ui_engineer_responses.value.length; j++) {
      if (ui_engineer_responses.status === "fulfilled") {
        const { folder_id, module_name, code } = ui_engineer_responses.value[j];

        res.write(
          `data: ${JSON.stringify(
            obj_to_return({
              type: CODE,
              content: {
                folder_path: folder_id_to_name_mapper[folder_id],
                ...ui_engineer_responses.value[j],
              },
            })
          )}\n\n`
        );

        let module_full_path = path.join(
          ui_dir_path,
          folder_id_to_name_mapper[folder_id],
          module_name
        );

        fs.writeFileSync(module_full_path, code, "utf8");
      } else {
        console.error(ui_engineer_responses);
      }
    }

    api_engineer_responses = code_eng_res[1];
    for (let j = 0; j < api_engineer_responses.value.length; j++) {
      if (api_engineer_responses.status === "fulfilled") {
        const { folder_id, module_name, code } =
          api_engineer_responses.value[j];

        res.write(
          `data: ${JSON.stringify(
            obj_to_return({
              type: CODE,
              content: {
                folder_path: folder_id_to_name_mapper[folder_id],
                ...api_engineer_responses.value[j],
              },
            })
          )}\n\n`
        );

        let module_full_path = path.join(
          api_dir_path,
          folder_id_to_name_mapper[folder_id],
          module_name
        );

        fs.writeFileSync(module_full_path, code, "utf8");
      } else {
        console.error(api_engineer_responses);
      }
    }

    status_progress[epic.id] = FINISHED;
    epic.stories.forEach((st, j) => {
      status_progress[st.id] = FINISHED;

      st.tasks.forEach((ts, k) => {
        status_progress[ts.id] = FINISHED;
      });
    });

    res.write(
      `data: ${JSON.stringify(
        obj_to_return({ type: STATUS, content: status_progress })
      )}\n\n`
    );

    if (i + 1 === epics.length)
      res.write(
        `data: ${JSON.stringify(
          obj_to_return({ type: FINISHED, content: "" })
        )}\n\n`
      );
  }

  // Handle client disconnection
  req.on("close", () => {
    res.end();
  });
});

export default router;
