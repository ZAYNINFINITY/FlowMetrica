const CLASSIFICATIONS = new Set(['unique', 'infinite_solutions', 'no_solution']);

function isValidSystemResult(result) {
  if (!result || typeof result !== 'object') return false;
  if (!CLASSIFICATIONS.has(result.classification)) return false;
  if (!Array.isArray(result.rref) || result.rref.length === 0) return false;
  if (!result.rref.every((row) => Array.isArray(row) && row.length === result.rref[0].length)) return false;
  if (!Number.isInteger(result.rank) || result.rank < 0) return false;
  if (result.classification === 'unique' && !Array.isArray(result.solution)) return false;
  return true;
}

/** Shape-only validation. Mathematical agreement is checked separately. */
export function validateResult(result, operation) {
  if (!result || typeof result !== 'object') return { ok: false, errors: ['Result is empty.'] };

  if (operation === 'analyze_anomaly') {
    if (!Array.isArray(result.stages) || result.stages.length === 0) {
      return { ok: false, errors: ['Result must contain analysed stages.'] };
    }
    const bad = result.stages.filter((stage) => !isValidSystemResult(stage));
    return {
      ok: bad.length === 0,
      errors: bad.length ? ['One or more anomaly stages are malformed.'] : [],
    };
  }

  return {
    ok: isValidSystemResult(result),
    errors: isValidSystemResult(result) ? [] : ['Result failed mathematical shape validation.'],
  };
}
