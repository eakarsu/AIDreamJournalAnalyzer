import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptText, encryptText, normalizeTags, parseKey, WELLBEING_NOTICE } from '../services/privateJournal.js';

const key = parseKey(Buffer.alloc(32, 7).toString('base64'));
test('journal content round-trips with authenticated encryption', () => {
  const encrypted = encryptText('private reflection', key, 'vault:entry:body');
  assert.notEqual(encrypted.ciphertext.toString(), 'private reflection');
  assert.equal(decryptText(encrypted, key, 'vault:entry:body'), 'private reflection');
  assert.throws(() => decryptText(encrypted, key, 'wrong-entry'));
});
test('tags remain user-controlled and bounded', () => {
  assert.deepEqual(normalizeTags([' Flight ', 'flight', 'Ocean']), ['flight','ocean']);
  assert.throws(() => normalizeTags(new Array(21).fill(0).map((_, i) => `t${i}`)));
});
test('the product boundary disclaims clinical assessment', () => assert.equal(WELLBEING_NOTICE.clinicalAssessment, false));

