import fs from "fs";
import path from "path";

const llm_answer =
  "```jsx\n// App.js\n// This React application implements a classic Tic Tac Toe game. Users can interact with the board by clicking on cells to place their marks (X or O). The game alternates between two players, showing whose turn it is and declaring the winner when one is detected. The user can also reset the game to start a new round. The application is designed using modern React practices, featuring state management with hooks for an optimal, clean, and responsive user experience.\n\nimport React, { useState } from 'react';\nimport './App.css';\n\n// Handles the main logic and UI of the Tic Tac Toe game\nfunction App() {\n  // State to track board cells, current player, and winner\n  const [board, setBoard] = useState(Array(9).fill(null));\n  const [isXNext, setIsXNext] = useState(true);\n  const winner = calculateWinner(board); // Determine if there is a winner\n\n  // Handle a cell click; place current player's mark & update state\n  const handleClick = (index) => {\n    // If cell is already filled or we have a winner, ignore click\n    if (board[index] || winner) return;\n\n    const newBoard = board.slice();\n    newBoard[index] = isXNext ? 'X' : 'O'; // Mark X or O\n    setBoard(newBoard);\n    setIsXNext(!isXNext); // Alternate player\n  };\n\n  // Reset the game by re-initializing the state\n  const handleReset = () => {\n    setBoard(Array(9).fill(null));\n    setIsXNext(true);\n  };\n\n  const status = winner ? `Winner: ${winner}` : `Next player: ${isXNext ? 'X' : 'O'}`;\n\n  return (\n    <div className=\"game\">\n      <div className=\"game-board\">\n        <Board squares={board} onClick={handleClick} />\n      </div>\n      {/* Display the game status and reset button */}\n      <div className=\"game-info\">\n        <div>{status}</div>\n        <button onClick={handleReset}>Restart Game</button>\n      </div>\n    </div>\n  );\n}\n\n// Component for rendering the board\nfunction Board({ squares, onClick }) {\n  return (\n    <div className=\"board\">\n      {squares.map((square, i) => (\n        // Each square is a button that invokes onClick passed from the parent\n        <button key={i} className=\"square\" onClick={() => onClick(i)}>\n          {square}\n        </button>\n      ))}\n    </div>\n  );\n}\n\n// Determine winner by evaluating the board state\nfunction calculateWinner(squares) {\n  const lines = [ // All possible winning combinations\n    [0, 1, 2],\n    [3, 4, 5],\n    [6, 7, 8],\n    [0, 3, 6],\n    [1, 4, 7],\n    [2, 5, 8],\n    [0, 4, 8],\n    [2, 4, 6],\n  ];\n  // Check each combination to find if either player has won\n  for (const [a, b, c] of lines) {\n    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {\n      return squares[a];\n    }\n  }\n  return null;\n}\n\nexport default App;\n```\n\n```css\n/* App.css */\n/* Styles for the Tic Tac Toe game making it responsive and visually appealing */\n\nbody {\n  font-family: 'Arial', sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background: #f5f5f5;\n  margin: 0;\n}\n\n.game {\n  text-align: center;\n}\n\n.game-board {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.board {\n  display: grid;\n  grid-template-columns: repeat(3, 100px);\n  grid-template-rows: repeat(3, 100px);\n  gap: 5px;\n  margin-bottom: 20px;\n}\n\n.square {\n  background: #fff;\n  border: 1px solid #999;\n  font-size: 24px;\n  font-weight: bold;\n  cursor: pointer;\n  outline: none;\n}\n\n.square:hover {\n  background: #ddd;\n}\n\nbutton {\n  padding: 10px 20px;\n  font-size: 16px;\n  cursor: pointer;\n}\n\nbutton:focus {\n  outline: none;\n}\n```";

const code_directory = "code_output";

const UI_ROOT_FOLDER_PATH = "/Users/rishavraj/Downloads/picalive/base-app-ui";
const API_ROOT_FOLDER_PATH = "/Users/rishavraj/Downloads/picalive/base-app-api";

export const write_file_from_llm_answer = (llm_answer, output_file_path) => {
  const res = llm_answer.split("```");

  for (let i = 0; i < res.length; i++) {
    const res_deep = res[i];

    if (!res_deep) continue;

    const res2 = res_deep.split("\n");

    // console.log(JSON.stringify(res2, null, 2));

    // // handle jsx or js files
    // let match = res2[1].match(/\/\/ (.+)/);

    // if (!match) {
    //   // handle css files
    //   match = res2[1].match(/\/\*\s*(.+)\s*\*\//);

    //   if (!match) {
    //     // handle python or files where comment line has # as prefix
    //     match = res2[1].match(/#\s*(.+)/);
    //   }
    // }

    // if (!match) continue;

    // const fileName = match[1].trim();

    // if (!fs.existsSync(code_directory)) {
    //   fs.mkdirSync(code_directory, { recursive: true });
    // }

    fs.writeFile(output_file_path, res2.slice(1).join("\n"), (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`File updated successfully!`);
      }
    });
  }
};

export const create_or_update_file_from_llm_answer = (
  layer,
  fileName,
  isNewFile,
  code
) => {
  let root_folder_path;

  switch (layer) {
    case "ui":
      root_folder_path = UI_ROOT_FOLDER_PATH;
      break;

    case "api":
      root_folder_path = API_ROOT_FOLDER_PATH;
      break;

    default:
      break;
  }

  const complete_file_path = `${root_folder_path}/${fileName}`;

  const dir = path.dirname(complete_file_path);

  console.log("dir debug:", dir);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (isNewFile) {
    fs.writeFileSync(complete_file_path, code, "utf-8");
    console.log(`New file created: ${fileName}`);
  } else {
    fs.writeFileSync(complete_file_path, `\n${code}`, "utf-8");
    console.log(`Code appended to: ${fileName}`);
  }
};

// write_file_from_llm_answer(llm_answer);
