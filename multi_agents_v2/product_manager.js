import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { llm_generate } from "../openai/generate.js";
import { z } from "zod";
import fs from "fs";
import uniqid from "uniqid";

export const product_manager_ghost = async ({ conversation = [] }) => {
  const messages = [
    {
      role: "system",
      content: `
        You are a skilled Product Manager responsible for understanding and breaking down user requirements into actionable tasks for a development team. Your role is to:  

        ## 1. Clarify User Requirements  
        - When the user provides a query or requirement, ask thoughtful and relevant follow-up questions if the requirement is vague, incomplete, or ambiguous.  
        - Ensure you fully understand the scope, goals, and constraints before proceeding. 
        - If the user's requirement is not clear, do not return EPICs or stories. Instead, continue asking clarifying questions until the requirement is sufficiently detailed and clear. 

        ## 2. Define EPICs and Stories  
        - Once the requirement is clear, divide it into **EPICs** (large features or modules).  
        - Under each EPIC, define **user stories** that represent actionable, functional units of work.  

        ## 3. Detail Stories with Tasks and Acceptance Criteria  
        - For each user story, list out the required **tasks** for implementation.  
        - Include detailed and testable **acceptance criteria** to define when the work is considered complete.  

        ## Additional Guidelines  
        - Ensure your output is structured, clear, and actionable, following best practices for product management.  
        - Always aim for precision and usability for the development team.  

        Your primary goal is to ensure that user requirements are well-understood and translated into a clear roadmap for execution.

        return in the following format - 
        {
            is_query_clear: boolean, // say if the user's query is clear or not
            doubt_to_ask: string, // if the user's query is not clear then what cross question to ask
            reply_to_user: string, // if the user's query is clear then what to reply to user, eg. ok i got you, we will build ...
            epics: array of objects [
            {
                title: string,
                description: string,
                stories: array of objects [
                {
                    title: string,
                    description: string,
                    tasks: array of strings,
                    acceptance_criteria: array of strings
                },
                ...
                ]
            },
            ...
            ]
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
        reply_to_user: z.string(),
        epics: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            stories: z.array(
              z.object({
                title: z.string(),
                description: z.string(),
                tasks: z.array(z.string()),
                acceptance_criteria: z.array(z.string()),
              })
            ),
          })
        ),
      }),
      "response-format"
    ),
  });

  const response = JSON.parse(res);

  for (let i = 0; i < response.epics.length; i++) {
    const epic = response.epics[i];

    for (let j = 0; j < epic.stories.length; j++) {
      const story = epic.stories[j];

      for (let k = 0; k < story.tasks.length; k++) {
        const task = story.tasks[k];

        response.epics[i].stories[j].tasks[k] = {
          id: `e${i + 1}s${j + 1}t${k + 1}`,
          task,
        };
      }

      response.epics[i].stories[j] = {
        id: `e${i + 1}s${j + 1}`,
        ...response.epics[i].stories[j],
      };
    }

    response.epics[i] = {
      id: `e${i + 1}`,
      ...response.epics[i],
    };
  }

  const uid = uniqid();

  fs.writeFileSync(
    "/Users/rishavraj/Downloads/picalive/scripts/jobs.json",
    JSON.stringify(
      {
        [uid]: response,
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    uid,
    ...response,
  };
};
