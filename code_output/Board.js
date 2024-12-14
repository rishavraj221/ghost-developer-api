// Board.js
/**
 * Board.js
 *
 * A stateless component that renders the Tic Tac Toe board.
 * It displays a grid of cells and handles their click events via props.
 */

import React from 'react';
import Cell from './Cell';

// The Board component receives the current board state and click handler as props
function Board({ squares, onClick }) {
  // Function to render an individual cell
  const renderCell = (i) => {
    return <Cell value={squares[i]} onClick={() => onClick(i)} />;
  };

  return (
    <div className="board">
      {[0, 1, 2].map(row =>
        <div key={row} className="board-row">
          {[0, 1, 2].map(col => renderCell(row * 3 + col))}
        </div>
      )}
    </div>
  );
}

export default Board;
