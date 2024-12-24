import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { llm_generate } from "../openai/generate.js";
import { z } from "zod";

const system_prompt = `
- **Role**: Experienced Senior Full-Stack Engineer
- **UI Tech Stack**: React JS
- **API Tech Stack**: Node JS, Express JS
- **Database**: MongoDB

**Task Overview:**

You are provided with an epic that contains several user stories. Among these, one story includes detailed tasks and acceptance criteria. Your responsibility is to distribute and outline the specific tasks necessary in both the UI and the API to fulfill these criteria.

**Instructions:**

1. **Objective**: Break down tasks for both UI and API development with specific acceptance criteria for each part, in line with the overall story acceptance criteria.

2. **Output Needed**:
   - **Overall Acceptance Criteria**: Clearly state the overall acceptance criteria for the user story.
   - **UI Development Tasks**:
     - List out each specific task required for the UI.
     - Associate acceptance criteria for each task, ensuring they align with UI functionality and user experience.
   - **API Development Tasks**:
     - Enumerate each specific task required for API development.
     - Establish acceptance criteria for each task related to data processing, logic, and data integrity with MongoDB.
   - **Interdependence**:
     - Specify any necessary interactions between UI and API tasks that must be coordinated.
     - Highlight dependencies and integration points.

3. **Evaluation Criteria**: Your plan will be evaluated based on whether the detailed tasks and criteria accurately meet the overall acceptance criteria once implemented.

return in the following format - 
{
    ui: {
        jobs: [
            {
                job: string,
                acceptance_criteria: array of strings
            }, 
            ...
        ],
        overall_acceptance_criteria: array of strings
    },
    api: {
        jobs: [
            {
                job: string,
                acceptance_criteria: array of strings
            }, 
            ...
        ],
        overall_acceptance_criteria: array of strings
    },
    overall_acceptance_criteria: array of strings,
}
`;

export const full_stack_engineer_ghost = async ({ epic, story_index }) => {
  // epic data schema expected -
  // {
  //     title: string,
  //     stories: [
  //         {
  //             title: string,
  //             tasks: [string],
  //             acceptance_criteria: [string]
  //         }
  //     ]
  // }

  let user_prompt = `EPIC : ${epic.title}\n\nSTORIES : \n`;

  for (let i = 0; i < epic.stories.length; i++) {
    user_prompt += `S${i + 1}. ${epic.stories[i].title}\n`;
  }

  const story = epic.stories[story_index];

  user_prompt += `\nTASKS of S${story_index + 1} : \n`;
  for (let i = 0; i < story.tasks.length; i++) {
    user_prompt += `T${i + 1}. ${story.tasks[i]}\n`;
  }
  user_prompt += `\nACCEPTANCE CRITERIA of S${story_index + 1} : \n`;
  for (let i = 0; i < story.acceptance_criteria.length; i++) {
    user_prompt += `A${i + 1}. ${story.acceptance_criteria[i]}\n`;
  }

  const res = await llm_generate({
    messages: [
      {
        role: "system",
        content: system_prompt,
      },
      {
        role: "user",
        content: user_prompt,
      },
    ],
    response_format: zodResponseFormat(
      z.object({
        ui: z.object({
          jobs: z.array(
            z.object({
              job: z.string(),
              acceptance_criteria: z.array(z.string()),
            })
          ),
          overall_acceptance_criteria: z.array(z.string()),
        }),
        api: z.object({
          jobs: z.array(
            z.object({
              job: z.string(),
              acceptance_criteria: z.array(z.string()),
            })
          ),
          overall_acceptance_criteria: z.array(z.string()),
        }),
        overall_acceptance_criteria: z.array(z.string()),
      }),
      "response-format"
    ),
  });

  //   console.log(JSON.stringify(JSON.parse(res), null, 2));

  return JSON.parse(res);
};

// const mock_epic = {
//   title: "User Authentication",
//   description:
//     "Implement user registration, login, and authentication features.",
//   stories: [
//     {
//       title: "User Registration",
//       description:
//         "As a new user, I want to register an account to make purchases.",
//       tasks: [
//         "Create registration form",
//         "Implement backend logic for user registration",
//         "Send email verification after registration",
//       ],
//       acceptance_criteria: [
//         "User can successfully register with valid details",
//         "User receives a verification email",
//         "User can activate account via verification link",
//       ],
//     },
//     {
//       title: "User Login",
//       description:
//         "As a registered user, I want to log in to my account to access my dashboard.",
//       tasks: [
//         "Create login form",
//         "Implement session management for logged-in users",
//         "Provide password recovery option",
//       ],
//       acceptance_criteria: [
//         "User can log in with correct credentials",
//         "User receives an error message with incorrect credentials",
//         "User can reset password via email link",
//       ],
//     },
//   ],
// };

// full_stack_engineer_ghost({ epic: mock_epic, story_index: 1 });
