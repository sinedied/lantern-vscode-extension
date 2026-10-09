import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAIResponse, selectPreferredModel } from '../ai_utils';

test('selectPreferredModel uses the configured model when available', async () => {
  const requestedIds: string[] = [];
  const selected = await selectPreferredModel('fast-model', async (modelId) => {
    requestedIds.push(modelId);
    return modelId === 'fast-model' ? [{ id: modelId }] : [];
  });

  assert.deepStrictEqual(requestedIds, ['fast-model']);
  assert.deepStrictEqual(selected.model, { id: 'fast-model' });
  assert.strictEqual(selected.requestedModelId, 'fast-model');
  assert.strictEqual(selected.usedFallback, false);
});

test('selectPreferredModel falls back to Auto without changing the requested model ID', async () => {
  const requestedIds: string[] = [];
  const selected = await selectPreferredModel('retired-model', async (modelId) => {
    requestedIds.push(modelId);
    return modelId === 'auto' ? [{ id: modelId }] : [];
  });

  assert.deepStrictEqual(requestedIds, ['retired-model', 'auto']);
  assert.deepStrictEqual(selected.model, { id: 'auto' });
  assert.strictEqual(selected.requestedModelId, 'retired-model');
  assert.strictEqual(selected.usedFallback, true);
});

test('selectPreferredModel does not retry Auto when Auto is unavailable', async () => {
  const requestedIds: string[] = [];
  const selected = await selectPreferredModel('auto', async (modelId) => {
    requestedIds.push(modelId);
    return [];
  });

  assert.deepStrictEqual(requestedIds, ['auto']);
  assert.strictEqual(selected.model, undefined);
  assert.strictEqual(selected.requestedModelId, 'auto');
  assert.strictEqual(selected.usedFallback, false);
});

test('parseAIResponse parses direct JSON', () => {
  assert.deepStrictEqual(parseAIResponse('{"color":" #16825D ","justification":" Calm and distinct "}'), {
    color: '#16825D',
    justification: 'Calm and distinct',
  });
});

test('parseAIResponse extracts JSON from a fenced response', () => {
  const response = '```json\n{"color":"#7C3AED","justification":"Distinct purple workspace identity"}\n```';
  assert.deepStrictEqual(parseAIResponse(response), {
    color: '#7C3AED',
    justification: 'Distinct purple workspace identity',
  });
});

test('parseAIResponse rejects malformed or structurally invalid responses', () => {
  assert.strictEqual(parseAIResponse('not json'), undefined);
  assert.strictEqual(parseAIResponse('{"color":"#16825D"}'), undefined);
  assert.strictEqual(parseAIResponse('{"color":42,"justification":"Invalid color type"}'), undefined);
});
