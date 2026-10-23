import assert from 'node:assert/strict';
import test from 'node:test';
import { getErrorMessage } from '../error_utils';

test('getErrorMessage preserves Error and error-like messages', () => {
  assert.equal(getErrorMessage(new Error('Connection failed')), 'Connection failed');
  assert.equal(getErrorMessage({ message: 'link button not pressed' }), 'link button not pressed');
  assert.equal(getErrorMessage('Network unavailable'), 'Network unavailable');
});

test('getErrorMessage handles unknown thrown values without throwing', () => {
  for (const value of [undefined, false, 42, {}, { message: 42 }]) {
    assert.equal(getErrorMessage(value), 'Unknown error');
  }
});
