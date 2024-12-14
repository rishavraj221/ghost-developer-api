import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

import { llm_generate } from "../openai/generate.js";

export const query_agent_generate = async ({ conversation = [] }) => {
  const messages = [
    {
      role: "system",
      content: `
          You are a Search Agent. Your primary responsibility is to interact with the user, gather their queries, and ensure the input is clear and refined before returning it.

          Your workflow is as follows:
          1. **Receive the User Query**: Accept any input from the user.
          2. **Analyze Clarity**: Determine if the query is specific and actionable. If it is ambiguous, ask only relevant clarifying questions. (You know the tech stack, for UI - it is in React JS, for API - it is Express JS, Node JS & MongoDB for DB, basically MERN)
          3. **Refine the Query**: Rewrite the query into a clear, concise, and actionable format for the Supervisor Agent.
          4. **Return well defined query**: Once the query is well-defined, return it.

          Important Notes:
          - Avoid making assumptions. If you lack sufficient clarity, always ask for more details.
          - Provide brief feedback to the user if more clarity is needed or once the query is passed.

          Your success is measured by how effectively you can refine and clarify the query for the Supervisor Agent.

          Example Actions:
          - If the user asks, "Build me a web app," respond with, "Can you clarify the functionality, and design preferences?"
          - If the user provides, "I need a CRUD API for managing books," refine to: "The user requests a CRUD API for managing books. Details on the database and language framework will follow."

          Simply refine and pass.

          return in the following format - 
          {
              is_query_clear: boolean, // say if the user's query is clear or not
              doubt_to_ask: string, // if the user's query is not clear then what to ask 
              to_build: string, // finally what to build if user's query is clear 
              reply_to_user: string // if the user's query is clear then what to reply to user, eg. ok i got you, we will build ...
          }
      `,
    },
  ];

  for (let i = 0; i < conversation.length; i++) {
    messages.push(conversation[i]);
  }

  const res = await llm_generate({
    messages,
    response_format: zodResponseFormat(
      z.object({
        is_query_clear: z.boolean(),
        doubt_to_ask: z.string(),
        to_build: z.string(),
        reply_to_user: z.string(),
      }),
      "response-format"
    ),
  });

  // console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

// query_agent_generate({
//   user_query:
//     "ok, i want to display the game result data in the game page as a pie chart, like how many times 'X' has won and how many times 'Y' has won",
// });

// query_agent_generate({ user_query: "I want to show the game analytics" });
