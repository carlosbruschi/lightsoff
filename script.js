const boardElement = document.getElementById("board");
const sizeValue = document.getElementById("size-value");
const movesElement = document.getElementById("moves");
const statusElement = document.getElementById("status");
const victoryOverlay = document.getElementById("victory-overlay");
const aboutButton = document.getElementById("about-button");
const aboutModal = document.getElementById("about-modal");
const closeAboutButton = document.getElementById("close-about");
const newGameButton = document.getElementById("new-game");
const resetGameButton = document.getElementById("reset-game");
const hintGameButton = document.getElementById("hint-game");
const solveGameButton = document.getElementById("solve-game");

const COLORS = {
  on: "yellow",
  off: "red",
};

const BOARD_SIZE = 5;

let size = BOARD_SIZE;
let board = [];
let initialBoard = [];
let moves = 0;
let solved = false;
let hintMove = null;
let solving = false;

function cloneBoard(source) {
  return source.map((row) => [...row]);
}

function toggleColor(color) {
  return color === COLORS.on ? COLORS.off : COLORS.on;
}

function createBoard(nextSize) {
  const baseColor = COLORS.off;
  const nextBoard = Array.from({ length: nextSize }, () =>
    Array.from({ length: nextSize }, () => baseColor)
  );
  const shuffleMoves = Math.max(nextSize * nextSize, 12);

  for (let index = 0; index < shuffleMoves; index += 1) {
    const row = Math.floor(Math.random() * nextSize);
    const column = Math.floor(Math.random() * nextSize);

    applyMove(nextBoard, row, column, nextSize);
  }

  const firstColor = nextBoard[0][0];
  const isUniform = nextBoard.every((row) => row.every((cell) => cell === firstColor));

  if (isUniform) {
    applyMove(nextBoard, nextSize - 1, nextSize - 1, nextSize);
  }

  return nextBoard;
}

function updateStatus() {
  solved = board.every((row) => row.every((cell) => cell === COLORS.off));

  movesElement.textContent = String(moves);
  statusElement.textContent = solved ? "Todas apagadas" : "Luzes acesas";
  boardElement.classList.toggle("solved", solved);
  victoryOverlay.classList.toggle("visible", solved);
  victoryOverlay.setAttribute("aria-hidden", solved ? "false" : "true");
}

function renderBoard() {
  solved = board.every((row) => row.every((cell) => cell === COLORS.off));
  boardElement.innerHTML = "";
  boardElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  board.forEach((row, rowIndex) => {
    row.forEach((color, columnIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cell ${color}`;
      button.style.setProperty("--blink-delay", `${Math.floor(Math.random() * 480)}ms`);
      if (hintMove && hintMove.row === rowIndex && hintMove.column === columnIndex && !solved) {
        button.classList.add("hint");
      }
      if (solved) {
        button.classList.add("celebrate");
      }
      button.setAttribute(
        "aria-label",
        `Linha ${rowIndex + 1}, coluna ${columnIndex + 1}, luz ${
          color === COLORS.on ? "acesa" : "apagada"
        }`
      );
      button.addEventListener("click", () => handleMove(rowIndex, columnIndex));
      boardElement.appendChild(button);
    });
  });

  updateStatus();
}

function getAffectedCells(row, column, boardSize = size) {
  const affected = new Set();
  const addCell = (nextRow, nextColumn) => {
    affected.add(`${nextRow}:${nextColumn}`);
  };

  addCell(row, column);
  if (row > 0) addCell(row - 1, column);
  if (row < boardSize - 1) addCell(row + 1, column);
  if (column > 0) addCell(row, column - 1);
  if (column < boardSize - 1) addCell(row, column + 1);

  return [...affected].map((entry) => entry.split(":").map(Number));
}

function applyMove(targetBoard, row, column, boardSize = size) {
  getAffectedCells(row, column, boardSize).forEach(([nextRow, nextColumn]) => {
    targetBoard[nextRow][nextColumn] = toggleColor(targetBoard[nextRow][nextColumn]);
  });
}

function handleMove(row, column) {
  if (solved || solving) {
    return;
  }

  hintMove = null;
  applyMove(board, row, column);
  moves += 1;
  renderBoard();
}

function startNewGame() {
  size = BOARD_SIZE;
  sizeValue.textContent = `${size} x ${size}`;
  board = createBoard(size);
  initialBoard = cloneBoard(board);
  moves = 0;
  hintMove = null;
  solving = false;
  renderBoard();
}

function resetGame() {
  board = cloneBoard(initialBoard);
  moves = 0;
  hintMove = null;
  solving = false;
  renderBoard();
}

function boardToBinary(sourceBoard) {
  return sourceBoard.map((row) => row.map((cell) => (cell === COLORS.on ? 1 : 0)));
}

function toggleBinaryCell(binaryBoard, row, column) {
  binaryBoard[row][column] = binaryBoard[row][column] ^ 1;
}

function applyBinaryMove(binaryBoard, row, column) {
  toggleBinaryCell(binaryBoard, row, column);
  if (row > 0) toggleBinaryCell(binaryBoard, row - 1, column);
  if (row < BOARD_SIZE - 1) toggleBinaryCell(binaryBoard, row + 1, column);
  if (column > 0) toggleBinaryCell(binaryBoard, row, column - 1);
  if (column < BOARD_SIZE - 1) toggleBinaryCell(binaryBoard, row, column + 1);
}

function solveCurrentBoard() {
  const initialState = boardToBinary(board);
  let bestSolution = null;
  const combinations = 2 ** BOARD_SIZE;

  for (let mask = 0; mask < combinations; mask += 1) {
    const workingBoard = initialState.map((row) => [...row]);
    const presses = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => 0)
    );

    for (let column = 0; column < BOARD_SIZE; column += 1) {
      if ((mask >> column) & 1) {
        presses[0][column] = 1;
        applyBinaryMove(workingBoard, 0, column);
      }
    }

    for (let row = 1; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        if (workingBoard[row - 1][column] === 1) {
          presses[row][column] = 1;
          applyBinaryMove(workingBoard, row, column);
        }
      }
    }

    const solvedBoard = workingBoard[BOARD_SIZE - 1].every((cell) => cell === 0);
    if (!solvedBoard) {
      continue;
    }

    const solutionMoves = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        if (presses[row][column] === 1) {
          solutionMoves.push({ row, column });
        }
      }
    }

    if (!bestSolution || solutionMoves.length < bestSolution.length) {
      bestSolution = solutionMoves;
    }
  }

  return bestSolution;
}

function showHint() {
  if (solved || solving) {
    return;
  }

  const solution = solveCurrentBoard();
  hintMove = solution && solution.length > 0 ? solution[0] : null;
  renderBoard();
}

function runSolver(stepIndex, solutionMoves) {
  if (!solving || stepIndex >= solutionMoves.length) {
    solving = false;
    hintMove = null;
    renderBoard();
    return;
  }

  const { row, column } = solutionMoves[stepIndex];
  applyMove(board, row, column);
  moves += 1;
  hintMove = { row, column };
  renderBoard();

  window.setTimeout(() => {
    runSolver(stepIndex + 1, solutionMoves);
  }, 220);
}

function solveBoardAnimated() {
  if (solved || solving) {
    return;
  }

  const solution = solveCurrentBoard();
  if (!solution || solution.length === 0) {
    return;
  }

  solving = true;
  runSolver(0, solution);
}

function setAboutModalVisible(isVisible) {
  aboutModal.classList.toggle("visible", isVisible);
  aboutModal.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

newGameButton.addEventListener("click", () => {
  startNewGame();
});

resetGameButton.addEventListener("click", () => {
  resetGame();
});

hintGameButton.addEventListener("click", () => {
  showHint();
});

solveGameButton.addEventListener("click", () => {
  solveBoardAnimated();
});

aboutButton.addEventListener("click", () => {
  setAboutModalVisible(true);
});

closeAboutButton.addEventListener("click", () => {
  setAboutModalVisible(false);
});

aboutModal.addEventListener("click", (event) => {
  if (event.target === aboutModal) {
    setAboutModalVisible(false);
  }
});

startNewGame();
