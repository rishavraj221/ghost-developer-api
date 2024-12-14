import OpenAI from "openai/index.mjs";
import {
  create_or_update_file_from_llm_answer,
  write_file_from_llm_answer,
} from "./file_write.js";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import fs from "fs";
import cliProgress from "cli-progress";
import {
  getAllFilePaths,
  getFolderStructure,
} from "./read_folder_structure.js";
import config from "./config.js";

const waitFor = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const openai = new OpenAI({
  apiKey: config.openai_key,
  organization: config.openai_org,
  project: config.openai_project,
});

const game_generation_prompt = `
Please generate a clean, elegant, and industry-standard React code for a Tic Tac Toe game. The code should include:

1. A comprehensive introductory comment at the top of the main file, describing the purpose and functionality of the code.
2. Detailed comments explaining each function and key parts of the code.
3. Well-structured and modular components.
4. Use of hooks like useState for managing game state and clear logic for determining the winner.
5. Usage of modern best practices and styling using CSS or a library of your choice.
6. Error handling and user-friendly messaging where appropriate.

The application should include:
- A responsive and intuitive UI.
- A game board with interactive cells.
- A display for showing the game's status (e.g., next player or the winner).
- A reset button to start a new game.

Make sure to follow React standards and best practices, ensuring the code is easy to read and maintain.

Only return the codes, and do not include any additional explanations or text.

Ensure the output is formatted exactly with each file's content enclosed in \`\`\`jsx\` or \`\`\`css\` code blocks. Do not include any additional explanations or text.

Don't include any root folder like 'src', give direct files
`;

const code_standarization_system_prompt = `
You are a coding assistant expert in best practices and industry standards for software development, specifically for React.js and Node.js projects. You will provide code reviews and modifications that enhance the clarity, maintainability, and quality of the code. When asked, you will add comprehensive introductory comments, detailed function documentation, necessary in-line comments, and industry-standard formatting. Make sure to apply modern conventions for state management, code structure, error handling, and any necessary optimizations.
`;

const code_standarization_user_prompt = `
Please review and modify the following code to meet all industry standards and best practices. 

- Add a comprehensive introductory comment at the beginning of the file that explains the purpose and functionality of the code.
- Provide detailed documentation for each function, including parameters, return values, and an explanation of what the function does.
- Add in-line comments where necessary to explain key parts of the code and improve readability.
- Ensure that the code is well-structured and modular, following modern conventions and practices.
- Use appropriate error handling and user-friendly messaging.
- Optimize the code as needed for performance and maintainability.
- Do not introduce any breaking changes, such as importing additional libraries, using assets not currently available in the project, or making changes that could cause runtime errors. Only use existing resources and dependencies.
- Do not change any import statements. eg. if jwtDecode is imported like "import { jwtDecode } from 'jwt-deocode'", then after modification it should be exactly same as how it was imported that is "import { jwtDecode } from 'jwt-decode'"
- Only modify code files with extension - js, jsx, css, py, and html, nothing else

Only return the codes, and do not include any additional explanations or text.

Here is the code:


`;

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: game_generation_prompt,
      },
    ],
    model: "gpt-4o",
  });

  //   console.log(JSON.stringify(completion, null, 2));

  write_file_from_llm_answer(completion.choices[0].message.content);
}

export const code_standarization = async (file_path) => {
  const code_content = fs.readFileSync(file_path, "utf-8");

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: code_standarization_system_prompt,
        },
        {
          role: "user",
          content: `${code_standarization_user_prompt} ${code_content}`,
        },
      ],
      model: "gpt-4o",
    });

    const llm_response = completion.choices[0].message.content;
    console.log(JSON.stringify(completion, null, 2));

    write_file_from_llm_answer(llm_response, file_path);
  } catch (error) {
    console.log(error);
  }
};

// main();

// const file_path =
//   "/Users/rishavraj/Downloads/picalive/base-app-ui/src/app/game/page.js";
// code_standarization(file_path);

const project_code_standarization = async (project_src_dir) => {
  // Retrieve all file paths
  const file_paths = await getAllFilePaths(project_src_dir);

  // Initialize the progress bar
  const progressBar = new cliProgress.SingleBar(
    {
      format: "Progress |{bar}| {percentage}% | {value}/{total} Files",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  const total_files = file_paths.length;
  console.log(`Total files to process: ${total_files}`);

  // Start the progress bar
  progressBar.start(total_files, 0);

  // Process each file
  for (let i = 0; i < total_files; i++) {
    const file_path = file_paths[i];
    console.log(`Processing: ${file_path}`);
    await code_standarization(file_path);
    progressBar.update(i + 1); // Update the progress bar
  }

  // Stop the progress bar when done
  progressBar.stop();
  console.log("All files have been standardized successfully!");
};

// const project_src_dir = "/Users/rishavraj/Downloads/picalive/base-app-api";

// project_code_standarization(project_src_dir);

const development_system_prompt = `
You are a highly skilled and efficient software development assistant specializing in providing code solutions in a well-structured and organized JSON format. You generate code that adheres to best practices in modern software development, including UI, API, and database layers. 

Return the code in the response format 
{
  "layer": "string", // ui | api
  "fileName": "string", // newFileName | existingFileName
  "isNewFile": "boolean",
  "code": "code_content"
}

When a feature or modification is requested:

- Use the following guidelines:
  - **For UI (frontend)**: 
    - Create components using the given folder structure, utilizing existing assets and libraries where possible. If a new component is required, generate the component code and provide import statements or other necessary modifications.
    - I am using rtk query service to define my backend apis, so if new endpoint is required then it's code should be there in the /redux/services/base-app/endpoints and to be exported via index.js of that folder, then add the endpoint in the base-app.api.js file.
  - **For API (backend)**: 
    - Build routes, and models based on the provided folder structure. If a new database collection is needed, write the Mongoose schema, define the model, and update the necessary routes and index files.
    - using "type": "module" in the package.json, so use only import statements not reuire statements
    - also make sure you import new / updated changes to the index.js
  - Ensure all code is ready to integrate with the existing project without causing runtime errors or requiring additional libraries or assets not already included.
- Avoid breaking changes and ensure backward compatibility. Provide clear and maintainable code.

Only return the code, without additional text or explanations.
`;

const ui_root_folder_path = "/Users/rishavraj/Downloads/picalive/base-app-ui";
const api_root_folder_path = "/Users/rishavraj/Downloads/picalive/base-app-api";
const game_code_content = fs.readFileSync(
  "/Users/rishavraj/Downloads/picalive/base-app-ui/src/app/game/page.js",
  "utf-8"
);
const ep_factory_sample = fs.readFileSync(
  "/Users/rishavraj/Downloads/picalive/base-app-ui/src/redux/services/base-app/endpoints/authEPFactory.js",
  "utf-8"
);
const ep_factory_index_code = fs.readFileSync(
  "/Users/rishavraj/Downloads/picalive/base-app-ui/src/redux/services/base-app/endpoints/index.js",
  "utf-8"
);
const rtk_query_hooks_code = fs.readFileSync(
  "/Users/rishavraj/Downloads/picalive/base-app-ui/src/redux/services/base-app/base-app.api.js",
  "utf-8"
);

const development_user_prompt = (user_prompt) => `
Here is the complete folder structure of my project:

**Frontend Structure**:
${getFolderStructure({ dir: ui_root_folder_path })}

**Backend Structure**:
${getFolderStructure({ dir: api_root_folder_path })}

**The code for the frontend to define rtk query endpoints**: (src/redux/services/base-app/endpoints/authEPFactory.js)
**Consider it as sample, if needed to build new endpoints follow the same file structuring**
${ep_factory_sample}

**The code for the frontend to export ep factories**: (src/redux/services/base-app/endpoints/index.js)
${ep_factory_index_code}

**The code where rtk hooks are defined**: (src/redux/services/base-app/base-app.api.js)
${rtk_query_hooks_code}

**The code for the frontend game page**: (src/app/game/page.js)
${game_code_content}

${user_prompt}

Follow this structured approach:

1. Analyze Requirements: If only UI changes are required, return only the updated UI code. (for charts use recharts react npm library which is already installed in the UI)
2. API Changes: If API changes are required, determine the MongoDB collections necessary (if applicable), design their schemas, and write the corresponding Mongoose schema in the models folder (backend).
3. Backend Routes: Write the required routes in the routes folder and ensure they integrate seamlessly with the defined models.
4. Frontend Integration: Update the game page UI to reflect changes, and integrate the updated backend APIs using RTK Query. Define RTK endpoints for the APIs and ensure proper functionality.

Provide clean, maintainable, and well-structured code adhering to best practices. If you encounter any ambiguity, make reasonable assumptions and note them in your response. Clearly separate the code sections and include explanatory comments for better understanding. 

Return the entire file codes.
`;

const CodeFormat = z.object({
  layer: z.string(),
  fileName: z.string(),
  isNewFile: z.boolean(),
  code: z.string(),
});

const CodeResponseFormat = z.object({
  codes: z.array(CodeFormat),
});

export const code_development_assistant = async (user_prompt) => {
  try {
    // await waitFor(4000);

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: development_system_prompt,
        },
        {
          role: "user",
          content: development_user_prompt(user_prompt),
        },
      ],
      model: "gpt-4o",
      response_format: zodResponseFormat(
        CodeResponseFormat,
        "code-response-format"
      ),
    });

    const llm_response = completion.choices[0].message.content;
    // const llm_response =
    //   '{"codes":[{"layer":"api","fileName":"models/GameStats.js","isNewFile":true,"code":"import mongoose from \'mongoose\';\\n\\nconst GameStatsSchema = new mongoose.Schema({\\n  playerXWins: {\\n    type: Number,\\n    default: 0,\\n  },\\n  playerOWins: {\\n    type: Number,\\n    default: 0,\\n  },\\n}, { timestamps: true });\\n\\nconst GameStats = mongoose.model(\'GameStats\', GameStatsSchema);\\n\\nexport default GameStats;"},{"layer":"api","fileName":"routes/gameStats.js","isNewFile":true,"code":"import express from \'express\';\\nimport GameStats from \'../models/GameStats.js\';\\n\\nconst router = express.Router();\\n\\n// Get game stats\\nrouter.get(\'/\', async (req, res) => {\\n  try {\\n    const stats = await GameStats.findOne();\\n    res.json(stats || { playerXWins: 0, playerOWins: 0 });\\n  } catch (error) {\\n    res.status(500).json({ error: \'Internal server error\' });\\n  }\\n});\\n\\n// Update game stats\\nrouter.post(\'/update\', async (req, res) => {\\n  const { winner } = req.body;\\n  try {\\n    let stats = await GameStats.findOne();\\n\\n    if (!stats) {\\n      stats = new GameStats();\\n    }\\n\\n    if (winner === \'X\') {\\n      stats.playerXWins += 1;\\n    } else if (winner === \'O\') {\\n      stats.playerOWins += 1;\\n    }\\n\\n    await stats.save();\\n\\n    res.json(stats);\\n  } catch (error) {\\n    res.status(500).json({ error: \'Internal server error\' });\\n  }\\n});\\n\\nexport default router;"},{"layer":"api","fileName":"index.js","isNewFile":false,"code":"import express from \'express\';\\nimport mongoose from \'mongoose\';\\nimport gameStatsRouter from \'./routes/gameStats.js\';\\n\\nconst app = express();\\n\\napp.use(express.json());\\n\\n// Other routes\\napp.use(\'/api/game-stats\', gameStatsRouter);\\n\\n// Start server logic as usual\\n\\nexport default app;"},{"layer":"ui","fileName":"src/redux/services/base-app/endpoints/gameStatsEPFactory.js","isNewFile":true,"code":"export const fetchGameStats = (builder) =>\\n  builder.query({\\n    query: () => ({\\n      url: \\"game-stats\\",\\n      method: \\"GET\\",\\n    }),\\n  });\\n\\nexport const updateGameStats = (builder) =>\\n  builder.mutation({\\n    query: (winner) => ({\\n      url: \\"game-stats/update\\",\\n      method: \\"POST\\",\\n      body: { winner },\\n    }),\\n  });"},{"layer":"ui","fileName":"src/redux/services/base-app/endpoints/index.js","isNewFile":false,"code":"export {\\n  signup as signupEPFactory,\\n  verify as verifyEPFactory,\\n  login as loginEPFactory,\\n  refreshToken as refreshTokenEPFactory,\\n  logout as logoutEPFactory,\\n} from \\"./authEPFactory\\";\\n\\nexport {\\n  fetchGameStats as fetchGameStatsEPFactory,\\n  updateGameStats as updateGameStatsEPFactory,\\n} from \\"./gameStatsEPFactory\\";"},{"layer":"ui","fileName":"src/redux/services/base-app/base-app.api.js","isNewFile":false,"code":"import { createApi, fetchBaseQuery } from \\"@reduxjs/toolkit/query/react\\";\\nimport {\\n  signupEPFactory,\\n  verifyEPFactory,\\n  loginEPFactory,\\n  refreshTokenEPFactory,\\n  logoutEPFactory,\\n  fetchGameStatsEPFactory,\\n  updateGameStatsEPFactory,\\n} from \\"./endpoints\\";\\nimport { API_BASE_URL } from \\"@/settings\\";\\n\\nexport const baseApi = createApi({\\n  reducerPath: \\"baseApi\\",\\n  tagTypes: [\\"user\\", \\"gameStats\\"],\\n  baseQuery: fetchBaseQuery({\\n    baseUrl: API_BASE_URL,\\n  }),\\n  endpoints: (builder) => ({\\n    signup: signupEPFactory(builder),\\n    verify: verifyEPFactory(builder),\\n    login: loginEPFactory(builder),\\n    refreshToken: refreshTokenEPFactory(builder),\\n    logout: logoutEPFactory(builder),\\n    fetchGameStats: fetchGameStatsEPFactory(builder),\\n    updateGameStats: updateGameStatsEPFactory(builder),\\n  }),\\n});\\n\\nexport const {\\n  useSignupMutation,\\n  useVerifyMutation,\\n  useLoginMutation,\\n  useRefreshTokenMutation,\\n  useLogoutMutation,\\n  useFetchGameStatsQuery,\\n  useUpdateGameStatsMutation,\\n} = baseApi;"},{"layer":"ui","fileName":"src/app/game/page.js","isNewFile":false,"code":"\\"use client\\";\\n\\nimport { useState, useEffect } from \\"react\\";\\nimport {\\n  Container,\\n  Box,\\n  Typography,\\n  Button,\\n  Grid,\\n  Paper,\\n  Toolbar,\\n  Card,\\n  CardContent,\\n} from \\"@mui/material\\";\\nimport { useRouter } from \\"next/navigation\\";\\nimport AuthenticatedPageContainer from \\"../components/authenticatedPageContainer\\";\\nimport { useStorage } from \\"@/context/AppContext\\";\\nimport { LoadingButton } from \\"@mui/lab\\";\\nimport { useLogoutMutation, useFetchGameStatsQuery, useUpdateGameStatsMutation } from \\"@/redux/services/base-app\\";\\nimport { useDispatch } from \\"react-redux\\";\\nimport { pushToast } from \\"@/redux/reducers/toast\\";\\n\\nexport default function TicTacToe() {\\n  const { user, setUser } = useStorage();\\n  const router = useRouter();\\n  const dispatch = useDispatch();\\n\\n  const [board, setBoard] = useState(Array(9).fill(null));\\n  const [isXNext, setIsXNext] = useState(true);\\n  const winner = calculateWinner(board, dispatch);\\n\\n  const { data: gameStats, refetch } = useFetchGameStatsQuery();\\n  const [updateGameStats] = useUpdateGameStatsMutation();\\n  const [logout, { isLoading }] = useLogoutMutation();\\n\\n  useEffect(() => {\\n    if (winner) {\\n      updateGameStats(winner);\\n      refetch();\\n    }\\n  }, [winner]);\\n\\n  const handleClick = (index) => {\\n    if (board[index] || winner) return;\\n    const newBoard = [...board];\\n    newBoard[index] = isXNext ? \\"X\\" : \\"O\\";\\n    setBoard(newBoard);\\n    setIsXNext(!isXNext);\\n  };\\n\\n  const resetGame = () => {\\n    setBoard(Array(9).fill(null));\\n    setIsXNext(true);\\n  };\\n\\n  const handleLogout = async () => {\\n    try {\\n      const result = await logout({\\n        accessToken: localStorage.getItem(\\"access-token\\"),\\n      }).unwrap();\\n\\n      if (result?.message) {\\n        dispatch(\\n          pushToast({\\n            message: \\"Logout successful!\\",\\n            severity: \\"success\\",\\n          })\\n        );\\n\\n        localStorage.clear();\\n        setUser({});\\n        router.push(\\"/\\");\\n      }\\n    } catch (err) {\\n      dispatch(\\n        pushToast({\\n          message: \\"Logout failed. Please try again!\\",\\n          severity: \\"error\\",\\n        })\\n      );\\n    }\\n  };\\n\\n  return (\\n    <AuthenticatedPageContainer>\\n      <Container maxWidth=\\"sm\\" sx={{ mt: 4 }}>\\n        <Typography variant=\\"h4\\" align=\\"center\\" gutterBottom>\\n          Tic Tac Toe\\n        </Typography>\\n\\n        <Toolbar sx={{ display: \\"flex\\", justifyContent: \\"space-between\\" }}>\\n          <Typography variant=\\"h6\\">Welcome, {user?.name}</Typography>\\n          <LoadingButton\\n            loading={isLoading}\\n            variant=\\"outlined\\"\\n            onClick={handleLogout}\\n          >\\n            Logout\\n          </LoadingButton>\\n        </Toolbar>\\n\\n        <Typography\\n          variant=\\"h6\\"\\n          align=\\"center\\"\\n          color=\\"textSecondary\\"\\n          gutterBottom\\n        >\\n          {winner ? `Winner: ${winner}` : `Next Player: ${isXNext ? \\"X\\" : \\"O\\"}`}\\n        </Typography>\\n\\n        <Grid container spacing={2}>\\n          {board.map((value, index) => (\\n            <Grid item xs={4} key={index}>\\n              <Paper\\n                onClick={() => handleClick(index)}\\n                sx={{\\n                  height: 100,\\n                  display: \\"flex\\",\\n                  alignItems: \\"center\\",\\n                  justifyContent: \\"center\\",\\n                  fontSize: 24,\\n                  cursor: \\"pointer\\",\\n                  backgroundColor: value ? \\"#e3f2fd\\" : \\"#fff\\",\\n                  \\"&:hover\\": { backgroundColor: \\"#bbdefb\\" },\\n                }}\\n              >\\n                {value}\\n              </Paper>\\n            </Grid>\\n          ))}\\n        </Grid>\\n\\n        <Box textAlign=\\"center\\" sx={{ mt: 4 }}>\\n          <Button variant=\\"contained\\" color=\\"primary\\" onClick={resetGame}>\\n            Reset Game\\n          </Button>\\n        </Box>\\n\\n        {gameStats && (\\n          <Card sx={{ mt: 4 }}>\\n            <CardContent>\\n              <Typography variant=\\"h6\\" align=\\"center\\">\\n                Game Statistics\\n              </Typography>\\n              <Typography variant=\\"body1\\" align=\\"center\\">\\n                X Wins: {gameStats.playerXWins}\\n              </Typography>\\n              <Typography variant=\\"body1\\" align=\\"center\\">\\n                O Wins: {gameStats.playerOWins}\\n              </Typography>\\n            </CardContent>\\n          </Card>\\n        )}\\n      </Container>\\n    </AuthenticatedPageContainer>\\n  );\\n}\\n\\nfunction calculateWinner(squares, dispatch) {\\n  const lines = [\\n    [0, 1, 2],\\n    [3, 4, 5],\\n    [6, 7, 8],\\n    [0, 3, 6],\\n    [1, 4, 7],\\n    [2, 5, 8],\\n    [0, 4, 8],\\n    [2, 4, 6],\\n  ];\\n  fo..."},{"layer":"api","fileName":"controllers/gameStatsController.js","isNewFile":true,"code":"import GameStats from \'../models/GameStats.js\';\\n\\nexport const getGameStats = async (req, res) => {\\n  try {\\n    const stats = await GameStats.findOne();\\n    res.json(stats || { playerXWins: 0, playerOWins: 0 });\\n  } catch (error) {\\n    res.status(500).json({ error: \'Internal server error\' });\\n  }\\n};\\n\\nexport const updateGameStats = async (req, res) => {\\n  const { winner } = req.body;\\n  try {\\n    let stats = await GameStats.findOne();\\n\\n    if (!stats) {\\n      stats = new GameStats();\\n    }\\n\\n    if (winner === \'X\') {\\n      stats.playerXWins += 1;\\n    } else if (winner === \'O\') {\\n      stats.playerOWins += 1;\\n    }\\n\\n    await stats.save();\\n\\n    res.json(stats);\\n  } catch (error) {\\n    res.status(500).json({ error: \'Internal server error\' });\\n  }\\n};"}]}';
    // console.log(JSON.stringify(completion, null, 2));

    const codes_json = JSON.parse(llm_response);

    const codes_arr = codes_json.codes;

    for (let i = 0; i < codes_arr.length; i++) {
      const { layer, fileName, isNewFile, code } = codes_arr[i];

      console.log(JSON.stringify(codes_arr[i], null, 2));

      create_or_update_file_from_llm_answer(layer, fileName, isNewFile, code);
    }

    // write_file_from_llm_answer(llm_response, file_path);
  } catch (error) {
    console.log(error);
  }
};
