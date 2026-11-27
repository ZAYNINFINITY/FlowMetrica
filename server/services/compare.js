/** Small, tolerant comparison helpers shared by verification paths. */
export const EPSILON = 1e-6;

export function near(left, right) {
  if (typeof left === 'number' && typeof right === 'number') {
    return Math.abs(left - right) <= EPSILON;
  }
  return left === right;
}

export function deepEqual(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => deepEqual(value, right[index]));
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(
      (key, index) => key === rightKeys[index] && deepEqual(left[key], right[key]),
    );
  }
  return near(left, right);
}

export const inputsMatch = deepEqual;
