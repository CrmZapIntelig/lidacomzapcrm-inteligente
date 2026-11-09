import assert from 'node:assert/strict';
import test from 'node:test';
import { previousBusinessDate } from './scheduledSatisfaction';

test('prepares the preceding Sao Paulo date using scheduled time across calendar boundaries', () => {
  assert.equal(previousBusinessDate('2027-01-01T05:15:00Z'), '2026-12-31');
  assert.equal(previousBusinessDate('2024-03-01T05:15:00Z'), '2024-02-29');
  assert.equal(previousBusinessDate('2026-11-09T02:00:00Z'), '2026-11-07');
  assert.throws(() => previousBusinessDate('invalid'));
});
