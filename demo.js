import { code_development_assistant } from "./open_ai.js";

// const user_prompt =
//   "I want to show the stats, that is, how many times 'X' has won and how many times 'O' has won in the game page itself, maybe use mui card for that or what suits the best with respect to the page design";

const user_prompt =
  "In the game page, it's showing the stats that is how many times 'X' and 'O' has won, i want to show a pie chart for this data just below the board";

code_development_assistant(user_prompt);
