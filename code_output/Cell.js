// Cell.js
/**
 * Cell.js
 *
 * A stateless component that represents a single cell on the Tic Tac Toe board.
 * It displays either 'X', 'O', or remains empty based on the player's moves.
 */

import React from 'react';

// Stateless Cell component to render a single cell on the board
function Cell({ value, onClick }) {
  return (
    <button className="cell" onClick={onClick}>
      {value}
    </button>
  );
}

export default Cell;
