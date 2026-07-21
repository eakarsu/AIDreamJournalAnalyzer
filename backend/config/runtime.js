export function validateRuntime(env = process.env) {
  const errors = [];
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required');
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) errors.push('JWT_SECRET must contain at least 32 characters');
  let key;
  try { key = Buffer.from(env.JOURNAL_ENCRYPTION_KEY_BASE64 || '', 'base64'); } catch { key = null; }
  if (!key || key.length !== 32) errors.push('JOURNAL_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes');
  if (env.NODE_ENV === 'production' && env.ENABLE_EXPERIMENTAL_FEATURES === 'true') errors.push('Experimental model features cannot be enabled in production');
  if (errors.length) throw new Error(`Invalid runtime configuration: ${errors.join('; ')}`);
}

