import crypto from 'crypto';
import { Router } from 'express';
import pool from '../db.js';
import auth from '../middleware/auth.js';
import { decryptText, encryptText, normalizeTags, parseKey, WELLBEING_NOTICE } from '../services/privateJournal.js';

const router = Router();
router.use(auth);
const key = () => parseKey(process.env.JOURNAL_ENCRYPTION_KEY_BASE64);
const makeId = () => crypto.randomUUID();
const errorResponse = (res, error) => res.status(error.code === '23505' ? 409 : 400).json({ error: error.code === '23505' ? 'Mutation already applied' : error.message });

async function vaultFor(userId) {
  const result = await pool.query('SELECT * FROM journal_vaults WHERE owner_user_id=$1', [userId]);
  return result.rows[0];
}

router.post('/vault', async (req, res) => {
  try {
    const retentionDays = req.body.retentionDays == null ? null : Number(req.body.retentionDays);
    if (retentionDays !== null && (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650)) throw new Error('retentionDays must be between 1 and 3650');
    const vaultId = makeId();
    const result = await pool.query(`INSERT INTO journal_vaults(id,owner_user_id,retention_days) VALUES($1,$2,$3)
      ON CONFLICT(owner_user_id) DO UPDATE SET retention_days=EXCLUDED.retention_days RETURNING *`, [vaultId, req.user.id, retentionDays]);
    res.status(201).json({ ...result.rows[0], encryption: 'AES-256-GCM', sharing: 'disabled' });
  } catch (error) { errorResponse(res, error); }
});

router.post('/entries', async (req, res) => {
  try {
    const vault = await vaultFor(req.user.id); if (!vault) throw new Error('Create a private vault first');
    const { title, body, reflection = '', entryDate, clientMutationId } = req.body;
    if (!title || !body || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate || '') || !clientMutationId) throw new Error('title, body, entryDate, and clientMutationId are required');
    if (String(body).length > 100000) throw new Error('body exceeds 100,000 characters');
    const entryId = makeId(); const aad = `${vault.id}:${entryId}`; const encryptionKey = key();
    const titleData = encryptText(title, encryptionKey, `${aad}:title`);
    const bodyData = encryptText(body, encryptionKey, `${aad}:body`);
    const reflectionData = reflection ? encryptText(reflection, encryptionKey, `${aad}:reflection`) : null;
    const tags = normalizeTags(req.body.tags || []); const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO private_journal_entries
        (id,vault_id,owner_user_id,client_mutation_id,title_ciphertext,title_iv,title_auth_tag,body_ciphertext,body_iv,body_auth_tag,reflection_ciphertext,reflection_iv,reflection_auth_tag,entry_date,tags)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [entryId,vault.id,req.user.id,clientMutationId,titleData.ciphertext,titleData.iv,titleData.authTag,bodyData.ciphertext,bodyData.iv,bodyData.authTag,reflectionData?.ciphertext || null,reflectionData?.iv || null,reflectionData?.authTag || null,entryDate,tags]);
      await client.query("INSERT INTO journal_entry_revisions(entry_id,vault_id,version,changed_by,change_kind) VALUES($1,$2,1,$3,'created')", [entryId,vault.id,req.user.id]);
      await client.query("INSERT INTO journal_audit_events(vault_id,actor_user_id,action,entry_id) VALUES($1,$2,'entry.created',$3)", [vault.id,req.user.id,entryId]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    res.status(201).json({ id: entryId, entryDate, tags, version: 1, notice: WELLBEING_NOTICE });
  } catch (error) { errorResponse(res, error); }
});

router.get('/entries', async (req, res) => {
  try {
    const vault = await vaultFor(req.user.id); if (!vault) return res.json({ entries: [] });
    const tag = req.query.tag ? String(req.query.tag).trim().toLowerCase() : null;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const result = await pool.query(`SELECT id,entry_date,tags,version,created_at,updated_at FROM private_journal_entries
      WHERE vault_id=$1 AND owner_user_id=$2 AND deleted_at IS NULL AND ($3::text IS NULL OR tags @> ARRAY[$3]::text[])
      ORDER BY entry_date DESC, created_at DESC LIMIT $4`, [vault.id,req.user.id,tag,limit]);
    res.json({ entries: result.rows, contentEncryptedAtRest: true });
  } catch (error) { errorResponse(res, error); }
});

router.get('/entries/:entryId', async (req, res) => {
  try {
    const vault = await vaultFor(req.user.id); if (!vault) return res.status(404).json({ error: 'Entry not found' });
    const result = await pool.query('SELECT * FROM private_journal_entries WHERE id=$1 AND vault_id=$2 AND owner_user_id=$3 AND deleted_at IS NULL', [req.params.entryId,vault.id,req.user.id]);
    const row = result.rows[0]; if (!row) return res.status(404).json({ error: 'Entry not found' });
    const aad = `${vault.id}:${row.id}`; const encryptionKey = key();
    res.json({ id: row.id, title: decryptText({ ciphertext: row.title_ciphertext, iv: row.title_iv, authTag: row.title_auth_tag }, encryptionKey, `${aad}:title`), body: decryptText({ ciphertext: row.body_ciphertext, iv: row.body_iv, authTag: row.body_auth_tag }, encryptionKey, `${aad}:body`), reflection: row.reflection_ciphertext ? decryptText({ ciphertext: row.reflection_ciphertext, iv: row.reflection_iv, authTag: row.reflection_auth_tag }, encryptionKey, `${aad}:reflection`) : '', entryDate: row.entry_date, tags: row.tags, version: row.version, notice: WELLBEING_NOTICE });
  } catch (error) { errorResponse(res, error); }
});

router.put('/entries/:entryId', async (req, res) => {
  try {
    const vault = await vaultFor(req.user.id); if (!vault) return res.status(404).json({ error: 'Entry not found' });
    const { title, body, reflection = '', entryDate, expectedVersion } = req.body;
    if (!title || !body || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate || '') || !Number.isInteger(Number(expectedVersion))) throw new Error('title, body, entryDate, and integer expectedVersion are required');
    const aad = `${vault.id}:${req.params.entryId}`; const encryptionKey = key();
    const titleData = encryptText(title, encryptionKey, `${aad}:title`);
    const bodyData = encryptText(body, encryptionKey, `${aad}:body`);
    const reflectionData = reflection ? encryptText(reflection, encryptionKey, `${aad}:reflection`) : null;
    const tags = normalizeTags(req.body.tags || []); const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(`UPDATE private_journal_entries SET
        title_ciphertext=$1,title_iv=$2,title_auth_tag=$3,body_ciphertext=$4,body_iv=$5,body_auth_tag=$6,
        reflection_ciphertext=$7,reflection_iv=$8,reflection_auth_tag=$9,entry_date=$10,tags=$11,version=version+1,updated_at=NOW()
        WHERE id=$12 AND vault_id=$13 AND owner_user_id=$14 AND version=$15 AND deleted_at IS NULL RETURNING id,version,entry_date,tags`,
      [titleData.ciphertext,titleData.iv,titleData.authTag,bodyData.ciphertext,bodyData.iv,bodyData.authTag,reflectionData?.ciphertext || null,reflectionData?.iv || null,reflectionData?.authTag || null,entryDate,tags,req.params.entryId,vault.id,req.user.id,Number(expectedVersion)]);
      if (!updated.rows[0]) { const conflict = new Error('Entry was changed or deleted by another client'); conflict.status = 409; throw conflict; }
      await client.query("INSERT INTO journal_entry_revisions(entry_id,vault_id,version,changed_by,change_kind) VALUES($1,$2,$3,$4,'updated')", [req.params.entryId,vault.id,updated.rows[0].version,req.user.id]);
      await client.query("INSERT INTO journal_audit_events(vault_id,actor_user_id,action,entry_id,metadata) VALUES($1,$2,'entry.updated',$3,$4)", [vault.id,req.user.id,req.params.entryId,{ version: updated.rows[0].version }]);
      await client.query('COMMIT'); res.json(updated.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); errorResponse(res, error); }
});

router.delete('/entries/:entryId', async (req, res) => {
  const vault = await vaultFor(req.user.id); if (!vault) return res.status(404).json({ error: 'Entry not found' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleted = await client.query('DELETE FROM private_journal_entries WHERE id=$1 AND vault_id=$2 AND owner_user_id=$3 RETURNING id,version', [req.params.entryId,vault.id,req.user.id]);
    if (!deleted.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Entry not found' }); }
    await client.query("INSERT INTO journal_audit_events(vault_id,actor_user_id,action,entry_id,metadata) VALUES($1,$2,'entry.permanently_deleted',$3,$4)", [vault.id,req.user.id,req.params.entryId,{ priorVersion: deleted.rows[0].version }]);
    await client.query('COMMIT'); res.status(204).end();
  } catch (error) { await client.query('ROLLBACK'); errorResponse(res, error); } finally { client.release(); }
});

router.get('/export', async (req, res) => {
  try {
    const vault = await vaultFor(req.user.id); if (!vault) return res.json({ exportedAt: new Date().toISOString(), entries: [] });
    const rows = await pool.query('SELECT * FROM private_journal_entries WHERE vault_id=$1 AND owner_user_id=$2 AND deleted_at IS NULL ORDER BY entry_date', [vault.id,req.user.id]);
    const encryptionKey = key();
    const entries = rows.rows.map(row => { const aad = `${vault.id}:${row.id}`; return { id: row.id, title: decryptText({ ciphertext: row.title_ciphertext, iv: row.title_iv, authTag: row.title_auth_tag }, encryptionKey, `${aad}:title`), body: decryptText({ ciphertext: row.body_ciphertext, iv: row.body_iv, authTag: row.body_auth_tag }, encryptionKey, `${aad}:body`), reflection: row.reflection_ciphertext ? decryptText({ ciphertext: row.reflection_ciphertext, iv: row.reflection_iv, authTag: row.reflection_auth_tag }, encryptionKey, `${aad}:reflection`) : '', entryDate: row.entry_date, tags: row.tags }; });
    await pool.query("INSERT INTO journal_audit_events(vault_id,actor_user_id,action,metadata) VALUES($1,$2,'vault.exported',$3)", [vault.id,req.user.id,{ count: entries.length }]);
    res.set('Cache-Control','no-store').json({ exportedAt: new Date().toISOString(), entries, notice: WELLBEING_NOTICE });
  } catch (error) { errorResponse(res, error); }
});

export default router;
