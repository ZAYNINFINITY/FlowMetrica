/** Strict, allowlist-based validation for the shared execution interface. */

const ALLOWED_MODULES = new Set(['module1', 'module2', 'module3']);
const ALLOWED_OPERATIONS = new Set([
  'solve_network_flow',
  'analyze_anomaly',
  'investigate_incident',
  'solve_live_measurement',
]);
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const MEASUREMENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{7,79}$/;
const MAX_ROWS = 24;
const MAX_COLUMNS = 24;

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function validateMatrix(matrix, label, errors) {
  if (!Array.isArray(matrix) || matrix.length === 0 || matrix.length > MAX_ROWS) {
    errors.push(`${label} must be a non-empty matrix with at most ${MAX_ROWS} rows.`);
    return;
  }
  const width = matrix[0]?.length;
  if (!Number.isInteger(width) || width < 1 || width > MAX_COLUMNS) {
    errors.push(`${label} must have between 1 and ${MAX_COLUMNS} columns.`);
    return;
  }
  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== width) {
      errors.push(`${label} row ${rowIndex + 1} has an inconsistent length.`);
      return;
    }
    row.forEach((value, columnIndex) => {
      if (!isFiniteNumber(value)) {
        errors.push(`${label}[${rowIndex + 1}][${columnIndex + 1}] must be a finite number.`);
      }
    });
  });
}

function validateVector(vector, label, errors) {
  if (!Array.isArray(vector) || vector.length === 0 || vector.length > MAX_ROWS) {
    errors.push(`${label} must be a non-empty vector.`);
    return;
  }
  vector.forEach((value, index) => {
    if (!isFiniteNumber(value)) errors.push(`${label}[${index + 1}] must be a finite number.`);
  });
}

function validateSystem(system, label, errors) {
  if (!system || typeof system !== 'object' || Array.isArray(system)) {
    errors.push(`${label} must be an object with "matrix" and "vector".`);
    return;
  }
  validateMatrix(system.matrix, `${label}.matrix`, errors);
  validateVector(system.vector, `${label}.vector`, errors);
  if (
    Array.isArray(system.matrix) &&
    Array.isArray(system.vector) &&
    system.matrix.length !== system.vector.length
  ) {
    errors.push(`${label}: the matrix must have one row for each vector entry.`);
  }
}

export function validateExecutionRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }
  if (!ALLOWED_MODULES.has(body.module)) errors.push('Unknown module.');
  if (typeof body.scenario_id !== 'string' || !ID_PATTERN.test(body.scenario_id)) {
    errors.push('scenario_id must be a lowercase identifier.');
  }
  if (!ALLOWED_OPERATIONS.has(body.operation)) errors.push('Unsupported mathematical operation.');

  const input = body.input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors.push('input must be an object.');
    return { ok: false, errors };
  }

  if (body.operation === 'solve_network_flow' || body.operation === 'investigate_incident') {
    validateSystem(input, 'input', errors);
  }

  if (body.operation === 'analyze_anomaly') {
    if (!Array.isArray(input.stages) || input.stages.length < 2 || input.stages.length > 8) {
      errors.push('input.stages must contain between 2 and 8 systems.');
    } else {
      input.stages.forEach((stage, index) => {
        if (!stage || typeof stage.id !== 'string' || !ID_PATTERN.test(stage.id)) {
          errors.push(`input.stages[${index}].id must be a lowercase identifier.`);
        }
        validateSystem(stage, `input.stages[${index}]`, errors);
      });
    }
  }

  if (body.operation === 'solve_live_measurement') {
    if (body.module !== 'module1') errors.push('Live measurement is only available in module1.');
    if (typeof input.measurementId !== 'string' || !MEASUREMENT_ID_PATTERN.test(input.measurementId)) {
      errors.push('input.measurementId must be an id returned by /api/measure.');
    }
    // Client-supplied vectors cannot be labelled as live measurements.
    if (input.vector !== undefined) errors.push('input.vector is server-owned for live measurements.');
    validateMatrix(input.matrix, 'input.matrix', errors);
    if (
      Array.isArray(input.matrix) &&
      (input.matrix.length !== 2 || input.matrix.some((row) => !Array.isArray(row) || row.length !== 2))
    ) {
      errors.push('Live measurement requires a 2x2 coefficient matrix.');
    }
  }

  return { ok: errors.length === 0, errors };
}
