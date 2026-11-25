import assert from 'node:assert/strict';
import test from 'node:test';

import { gaussJordan, solveSystem } from './matrix.js';

test('solves a full-rank 2x2 traffic split exactly', () => {
  const result = solveSystem([[1, 1], [1, -1]], [100, 20]);
  assert.equal(result.classification, 'unique');
  assert.deepEqual(result.solution, [60, 40]);
  assert.deepEqual(result.rref, [[1, 0, 60], [0, 1, 40]]);
  assert.equal(result.rank, 2);
});

test('solves a full-rank 3x3 system', () => {
  const result = solveSystem([[1, 1, 1], [1, -1, 0], [0, 1, 1]], [120, 20, 70]);
  assert.equal(result.classification, 'unique');
  assert.deepEqual(result.solution, [50, 30, 40]);
});

test('detects a dependent system as infinite solutions', () => {
  const result = solveSystem([[1, 1], [2, 2]], [100, 200]);
  assert.equal(result.classification, 'infinite_solutions');
  assert.equal(result.consistent, true);
  assert.equal(result.rank, 1);
  assert.match(result.parametricForm[0], /x1 = 100/);
});

test('detects an inconsistent system using a [0 0 | c] row', () => {
  const result = solveSystem([[1, 1], [1, -1], [0, 1]], [120, 20, 0]);
  assert.equal(result.classification, 'no_solution');
  assert.equal(result.consistent, false);
  assert.equal(result.solution, null);
});

test('does not mutate the input matrix or vector', () => {
  const matrix = [[1, 1], [1, -1]];
  const vector = [100, 20];
  solveSystem(matrix, vector);
  assert.deepEqual(matrix, [[1, 1], [1, -1]]);
  assert.deepEqual(vector, [100, 20]);
});

test('records every row operation and ends on the reported RREF', () => {
  const result = gaussJordan([[1, 1, 100], [1, -1, 20]]);
  assert.ok(result.steps.length >= 3);
  assert.equal(result.steps[0].operation, 'Initial augmented matrix');
  assert.deepEqual(result.steps.at(-1).matrix, result.rref);
});
