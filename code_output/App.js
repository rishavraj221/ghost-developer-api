// App.js
/**
 * App.js
 *
 * A simple Tic Tac Toe game implemented using React.
 * This application allows two players to take turns to mark cells on a 3x3 grid.
 * The first player to align three of their marks (either horizontally, vertically, or diagonally) wins the game.
 * Contains functionality to track player's turns, determine the winner, and a reset option to start a new game.
 */

import React, { useState } from 'react';
import Board from './Board';
import './styles.css';

function App() {
  // State to keep track of the board cells and the current turn
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  // Function to determine the winner of the game based on the current board state
  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  // Check for the winner or determine the next player's turn
  const winner = calculateWinner(board);
  const status = winner 
    ? `Winner: ${winner}`
    : board.every(Boolean)
    ? `It's a Draw!`
    : `Next player: ${isXNext ? 'X' : 'O'}`;

  // Function to handle player moves
  const handleClick = (i) => {
    // If there's a winner or the cell is already filled, do nothing
    if (calculateWinner(board) || board[i]) {
      return;
    }
    // Update the board state to reflect the player's move
    const newBoard = board.slice();
    newBoard[i] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  // Reset the game back to its initial state
  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div className="app">
      <div className="game">
        <h1>Tic Tac Toe</h1>
        <Board squares={board} onClick={handleClick} />
        <div className="game-info">
          <div>{status}</div>
          <button onClick={resetGame} className="reset-button">Reset Game</button>
        </div>
      </div>
    </div>
  );
}

export default App;
