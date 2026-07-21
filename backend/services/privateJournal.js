import crypto from 'crypto';

export function parseKey(encoded) {
  const key = Buffer.from(encoded || '', 'base64');
  if (key.length !== 32) throw new Error('Journal encryption key must decode to 32 bytes');
  return key;
}

export function encryptText(value, key, additionalData) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(additionalData));
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptText(record, key, additionalData) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, record.iv);
  decipher.setAAD(Buffer.from(additionalData));
  decipher.setAuthTag(record.auth_tag || record.authTag);
  return Buffer.concat([decipher.update(record.ciphertext), decipher.final()]).toString('utf8');
}

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) throw new Error('tags must be an array');
  const normalized = [...new Set(tags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean))];
  if (normalized.length > 20 || normalized.some(tag => tag.length > 40)) throw new Error('At most 20 tags of 40 characters are allowed');
  return normalized;
}

export const WELLBEING_NOTICE = Object.freeze({
  clinicalAssessment: false,
  message: 'Dream reflections are personal notes, not a diagnosis or mental-health assessment.',
  urgentHelp: 'If you may harm yourself or someone else, contact local emergency services or a qualified crisis service now.',
});

