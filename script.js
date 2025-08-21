const board = document.getElementById("board");
const status = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");

const BOARD_SIZE = 8;

let gameState = {
  board: [],      // matriz 8x8 com informações das peças
  currentPlayer: "red", // "red" ou "black"
  selected: null, // posição da peça selecionada [row, col]
  possibleMoves: [], // movimentos possíveis para peça selecionada
};

function createBoard() {
  board.innerHTML = "";
  for(let row=0; row<BOARD_SIZE; row++) {
    for(let col=0; col<BOARD_SIZE; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      if((row + col) % 2 === 1) square.classList.add("dark");
      square.dataset.row = row;
      square.dataset.col = col;
      square.addEventListener("click", onSquareClick);
      board.appendChild(square);
    }
  }
}

function initializeGame() {
  // 0 = vazio
  // {player: 'red'|'black', king: boolean}
  gameState.board = Array(8).fill(null).map(() => Array(8).fill(0));
  
  // Posicionar peças pretas (no topo)
  for(let row=0; row<3; row++) {
    for(let col=0; col<8; col++) {
      if((row + col) % 2 === 1) {
        gameState.board[row][col] = {player: 'black', king: false};
      }
    }
  }
  
  // Posicionar peças vermelhas (embaixo)
  for(let row=5; row<8; row++) {
    for(let col=0; col<8; col++) {
      if((row + col) % 2 === 1) {
        gameState.board[row][col] = {player: 'red', king: false};
      }
    }
  }

  gameState.currentPlayer = "red";
  gameState.selected = null;
  gameState.possibleMoves = [];

  updateBoard();
  updateStatus();
}

function updateBoard() {
  for(let row=0; row<BOARD_SIZE; row++) {
    for(let col=0; col<BOARD_SIZE; col++) {
      const square = board.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
      square.innerHTML = "";
      square.classList.remove("highlight", "possible-move");
      
      const cell = gameState.board[row][col];
      if(cell !== 0) {
        const piece = document.createElement("div");
        piece.classList.add("piece", cell.player);
        if(cell.king) piece.classList.add("king");
        square.appendChild(piece);
      }
    }
  }

  // Highlight seleção e possíveis movimentos
  if(gameState.selected) {
    const [r, c] = gameState.selected;
    const selectedSquare = board.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
    selectedSquare.classList.add("highlight");

    gameState.possibleMoves.forEach(move => {
      const square = board.querySelector(`.square[data-row="${move[0]}"][data-col="${move[1]}"]`);
      square.classList.add("possible-move");
    });
  }
}

function updateStatus() {
  status.textContent = `Vez do jogador: ${gameState.currentPlayer.toUpperCase()}`;
}

function onSquareClick(e) {
  const row = parseInt(e.currentTarget.dataset.row);
  const col = parseInt(e.currentTarget.dataset.col);

  const cell = gameState.board[row][col];
  const selected = gameState.selected;

  // Se tem peça selecionada e clicar em movimento possível -> mover
  if(selected && gameState.possibleMoves.some(m => m[0] === row && m[1] === col)) {
    movePiece(selected, [row, col]);
    return;
  }

  // Se clicar em uma peça do jogador atual -> selecionar
  if(cell !== 0 && cell.player === gameState.currentPlayer) {
    gameState.selected = [row, col];
    gameState.possibleMoves = getValidMoves(row, col);
    updateBoard();
  } else {
    // Clicar em outro lugar cancela seleção
    gameState.selected = null;
    gameState.possibleMoves = [];
    updateBoard();
  }
}

function movePiece(from, to) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const piece = gameState.board[fromRow][fromCol];

  // Verificar se é movimento de captura
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  let capturePos = null;

  if(Math.abs(dr) === 2 && Math.abs(dc) === 2) {
    capturePos = [fromRow + dr/2, fromCol + dc/2];
  }

  // Mover peça
  gameState.board[toRow][toCol] = piece;
  gameState.board[fromRow][fromCol] = 0;

  // Remover peça capturada
  if(capturePos) {
    gameState.board[capturePos[0]][capturePos[1]] = 0;
  }

  // Verificar promoção para rei
  if(!piece.king) {
    if(piece.player === "red" && toRow === 0) piece.king = true;
    if(piece.player === "black" && toRow === BOARD_SIZE - 1) piece.king = true;
  }

  // Verificar se jogador tem outra captura possível (multi-captura)
  if(capturePos && hasCapture(toRow, toCol)) {
    gameState.selected = [toRow, toCol];
    gameState.possibleMoves = getCaptureMoves(toRow, toCol);
  } else {
    // Trocar turno
    gameState.currentPlayer = gameState.currentPlayer === "red" ? "black" : "red";
    gameState.selected = null;
    gameState.possibleMoves = [];
  }

  updateBoard();
  updateStatus();

  // Verificar fim do jogo
  if(isGameOver()) {
    alert(`Fim do jogo! Jogador ${gameState.currentPlayer === "red" ? "PRETO" : "VERMELHO"} venceu!`);
  }
}

function getValidMoves(row, col) {
  // Se possível, só permite movimentos de captura (regra da dama)
  const captureMoves = getCaptureMoves(row, col);
  if(captureMoves.length > 0) return captureMoves;

  return getNormalMoves(row, col);
}

function getNormalMoves(row, col) {
  const moves = [];
  const piece = gameState.board[row][col];
  if(piece === 0) return moves;

  const directions = getMoveDirections(piece);

  for(const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if(isInsideBoard(nr, nc) && gameState.board[nr][nc] === 0) {
      moves.push([nr, nc]);
    }
  }

  return moves;
}

function getCaptureMoves(row, col) {
  const moves = [];
  const piece = gameState.board[row][col];
  if(piece === 0) return moves;

  const directions = getMoveDirections(piece);

  for(const [dr, dc] of directions) {
    const midR = row + dr;
    const midC = col + dc;
    const destR = row + 2*dr;
    const destC = col + 2*dc;

    if(
      isInsideBoard(destR, destC) &&
      gameState.board[destR][destC] === 0 &&
      gameState.board[midR][midC] !== 0 &&
      gameState.board[midR][midC].player !== piece.player
    ) {
      moves.push([destR, destC]);
    }
  }

  return moves;
}

function hasCapture(row, col) {
  return getCaptureMoves(row, col).length > 0;
}

function getMoveDirections(piece) {
  // Para peças normais, movimento diagonal para frente (depende da cor)
  // Para reis, movimento diagonal para qualquer direção
  if(piece.king) {
    return [[1,1],[1,-1],[-1,1],[-1,-1]];
  } else {
    return piece.player === "red" ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
  }
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isGameOver() {
  // Checa se o jogador atual tem movimentos válidos
  for(let row=0; row<BOARD_SIZE; row++) {
    for(let col=0; col<BOARD_SIZE; col++) {
      const piece = gameState.board[row][col];
      if(piece !== 0 && piece.player === gameState.currentPlayer) {
        if(getValidMoves(row, col).length > 0) return false;
      }
    }
  }
  return true;
}

resetBtn.addEventListener("click", () => {
  initializeGame();
});

createBoard();
initializeGame();
