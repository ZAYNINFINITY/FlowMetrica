/**
 * Pure linear-algebra core shared by every module.
 *
 * Input matrices are cloned before work starts, so callers never observe mutation.
 * That single rule keeps the rest of the app functional: a solver must not rewrite
 * the scenario definition it was handed.
 */

export const EPSILON = 1e-9;
const DISPLAY_DIGITS = 6;

export function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

export function roundTo(value, digits = DISPLAY_DIGITS) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  // -0 would render as "-0" in matrices and break strict equality in fixtures.
  return rounded === 0 ? 0 : rounded;
}

/** Human-friendly copy of a matrix; raw floating point noise is hidden. */
export function tidyMatrix(matrix) {
  return matrix.map((row) => row.map((value) => roundTo(value)));
}

/**
 * Gauss-Jordan elimination on an augmented matrix [A | b].
 *
 * Returns the RREF plus every elementary row operation, so the UI can teach the
 * process instead of only showing the answer.
 */
export function gaussJordan(augmentedMatrix) {
  const rowCount = augmentedMatrix.length;
  const columnCount = augmentedMatrix[0]?.length ?? 0;

  if (rowCount === 0 || columnCount < 2) {
    throw new Error('Augmented matrix must have at least one row and two columns.');
  }
  if (augmentedMatrix.some((row) => row.length !== columnCount)) {
    throw new Error('Every row of the augmented matrix must have the same length.');
  }

  const matrix = cloneMatrix(augmentedMatrix);
  const steps = [];
  const pivotColumns = [];
  const record = (operation, reason) => {
    steps.push({ operation, reason, matrix: tidyMatrix(matrix) });
  };

  record('Initial augmented matrix', 'Start with the coefficient matrix joined to the constants vector.');

  let pivotRow = 0;
  for (let column = 0; column < columnCount - 1 && pivotRow < rowCount; column += 1) {
    // Find the first nonzero entry at or below the active pivot row.
    let candidate = pivotRow;
    while (candidate < rowCount && Math.abs(matrix[candidate][column]) < EPSILON) {
      candidate += 1;
    }
    if (candidate >= rowCount) continue;

    if (candidate !== pivotRow) {
      [matrix[pivotRow], matrix[candidate]] = [matrix[candidate], matrix[pivotRow]];
      record(`R${pivotRow + 1} ↔ R${candidate + 1}`, 'Move a nonzero entry into the pivot position.');
    }

    const pivotValue = matrix[pivotRow][column];
    if (Math.abs(pivotValue - 1) > EPSILON) {
      matrix[pivotRow] = matrix[pivotRow].map((value) => value / pivotValue);
      record(`R${pivotRow + 1} ← (1/${roundTo(pivotValue)})·R${pivotRow + 1}`, 'Normalize the pivot to 1.');
    }

    for (let row = 0; row < rowCount; row += 1) {
      if (row === pivotRow) continue;
      const multiplier = matrix[row][column];
      if (Math.abs(multiplier) < EPSILON) continue;
      matrix[row] = matrix[row].map((value, index) => value - multiplier * matrix[pivotRow][index]);
      record(
        `R${row + 1} ← R${row + 1} − (${roundTo(multiplier)})·R${pivotRow + 1}`,
        'Clear this column from the remaining rows.',
      );
    }

    pivotColumns.push(column);
    pivotRow += 1;
  }

  const variableCount = columnCount - 1;

  // A contradictory row such as [0 0 | -50] teaches the concept better as
  // [0 0 | 1], i.e. "0 = 1". Only the contradictory row is rescaled.
  matrix.forEach((row, index) => {
    const coefficientsAreZero = row
      .slice(0, variableCount)
      .every((value) => Math.abs(value) < EPSILON);
    const constant = row[variableCount];
    if (!coefficientsAreZero || Math.abs(constant) < EPSILON) return;
    const scaled = row.map((value) => value / constant);
    for (let column = 0; column < columnCount; column += 1) row[column] = scaled[column];
    record(`R${index + 1} ← (1/${roundTo(constant)})·R${index + 1}`, 'Expose the contradiction as 0 = 1.');
  });

  const inconsistent = matrix.some(
    (row) =>
      row.slice(0, variableCount).every((value) => Math.abs(value) < EPSILON) &&
      Math.abs(row[variableCount]) > EPSILON,
  );

  let classification;
  let solution = null;
  let parametricForm = [];

  if (inconsistent) {
    classification = 'no_solution';
  } else if (pivotColumns.length === variableCount) {
    classification = 'unique';
    solution = Array.from({ length: variableCount }, (_, index) => roundTo(matrix[index][variableCount]));
  } else {
    classification = 'infinite_solutions';
    const freeColumns = Array.from({ length: variableCount }, (_, index) => index).filter(
      (index) => !pivotColumns.includes(index),
    );

    parametricForm = pivotColumns.map((column, rowIndex) => {
      const terms = [];
      freeColumns.forEach((freeColumn) => {
        const coefficient = matrix[rowIndex][freeColumn];
        if (Math.abs(coefficient) < EPSILON) return;
        const sign = coefficient < 0 ? '+ ' : '− ';
        terms.push(`${sign}${roundTo(Math.abs(coefficient))}x${freeColumn + 1}`);
      });
      const constant = roundTo(matrix[rowIndex][variableCount]);
      return `x${column + 1} = ${constant}${terms.length ? ` ${terms.join(' ')}` : ''}`;
    });
    freeColumns.forEach((freeColumn, index) => {
      parametricForm.push(`x${freeColumn + 1} = t${index + 1}  (free parameter)`);
    });
  }

  return {
    classification,
    consistent: !inconsistent,
    rank: pivotColumns.length,
    variableCount,
    pivotColumns,
    rref: tidyMatrix(matrix),
    steps,
    solution,
    parametricForm,
  };
}

/** Solve A·x = b by running Gauss-Jordan on the augmented matrix [A | b]. */
export function solveSystem(matrix, vector) {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  return gaussJordan(augmented);
}
