/**
 * Offline SQLite storage via @capacitor-community/sqlite.
 * Caches players, attendance, and pending mutations for poor-connectivity areas.
 * All functions are no-ops on web (returns empty/null gracefully).
 */
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const DB_NAME = 'academy_offline';
const DB_VERSION = 1;

let _db = null;

async function getSqlite() {
    if (!isNative) return null;
    const { CapacitorSQLite } = await import('@capacitor-community/sqlite');
    return CapacitorSQLite;
}

/** Open (or reuse) the SQLite connection. */
async function getDb() {
    if (_db) return _db;
    const sqlite = await getSqlite();
    if (!sqlite) return null;

    try {
        const conn = await sqlite.createConnection({
            database: DB_NAME,
            version: DB_VERSION,
            encrypted: false,
            mode: 'no-encryption',
            readonly: false,
        });
        await conn.open();
        await _migrate(conn);
        _db = conn;
        return _db;
    } catch (err) {
        console.warn('[offlineDb] Failed to open DB:', err);
        return null;
    }
}

/** Run schema migrations (idempotent). */
async function _migrate(conn) {
    const sql = `
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            academy_id TEXT,
            data TEXT,         -- JSON blob of the full player object
            synced_at INTEGER  -- epoch ms of last sync
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            player_id TEXT,
            session_date TEXT,
            status TEXT,
            synced_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS pending_mutations (
            id TEXT PRIMARY KEY,
            type TEXT,         -- 'mark_attendance' | 'add_player' | 'edit_player'
            payload TEXT,      -- JSON
            created_at INTEGER
        );
    `;
    await conn.execute({ statements: sql });
}

// ─── Players ──────────────────────────────────────────────────────────────────

/** Save/replace a list of players for an academy. */
export async function cachePlayers(players) {
    const db = await getDb();
    if (!db || !players?.length) return;
    const now = Date.now();
    const values = players
        .map(p => `('${p.id}','${p.academy_id}','${JSON.stringify(p).replace(/'/g, "''")}',${now})`)
        .join(',');
    await db.execute({
        statements: `INSERT OR REPLACE INTO players (id, academy_id, data, synced_at) VALUES ${values};`,
    });
}

/** Load cached players for an academy. Returns [] on failure. */
export async function getCachedPlayers(academyId) {
    const db = await getDb();
    if (!db) return [];
    try {
        const res = await db.query({
            statement: `SELECT data FROM players WHERE academy_id = ? ORDER BY rowid;`,
            values: [academyId],
        });
        return (res.values ?? []).map(row => JSON.parse(row.data));
    } catch {
        return [];
    }
}

// ─── Attendance ───────────────────────────────────────────────────────────────

/** Cache a single attendance record. */
export async function cacheAttendance(record) {
    const db = await getDb();
    if (!db) return;
    await db.execute({
        statements: `INSERT OR REPLACE INTO attendance (id, player_id, session_date, status, synced_at)
                     VALUES ('${record.id}','${record.player_id}','${record.session_date}','${record.status}',${Date.now()});`,
    });
}

/** Load cached attendance for a player. */
export async function getCachedAttendance(playerId) {
    const db = await getDb();
    if (!db) return [];
    try {
        const res = await db.query({
            statement: `SELECT * FROM attendance WHERE player_id = ? ORDER BY session_date DESC;`,
            values: [playerId],
        });
        return res.values ?? [];
    } catch {
        return [];
    }
}

// ─── Pending mutations (offline queue) ───────────────────────────────────────

/** Queue a mutation to replay when back online. */
export async function queueMutation(type, payload) {
    const db = await getDb();
    if (!db) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await db.execute({
        statements: `INSERT INTO pending_mutations (id, type, payload, created_at)
                     VALUES ('${id}','${type}','${JSON.stringify(payload).replace(/'/g, "''")}',${Date.now()});`,
    });
}

/** Get all queued mutations, oldest first. */
export async function getPendingMutations() {
    const db = await getDb();
    if (!db) return [];
    try {
        const res = await db.query({
            statement: `SELECT * FROM pending_mutations ORDER BY created_at ASC;`,
            values: [],
        });
        return (res.values ?? []).map(row => ({
            ...row,
            payload: JSON.parse(row.payload),
        }));
    } catch {
        return [];
    }
}

/** Remove a mutation after it's been successfully replayed. */
export async function removeMutation(id) {
    const db = await getDb();
    if (!db) return;
    await db.execute({
        statements: `DELETE FROM pending_mutations WHERE id = '${id}';`,
    });
}

/** Clear all pending mutations (e.g. after full sync). */
export async function clearAllMutations() {
    const db = await getDb();
    if (!db) return;
    await db.execute({ statements: `DELETE FROM pending_mutations;` });
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

/**
 * Replay pending mutations against the live API.
 * Call this when the network comes back online.
 * @param {Function} apiCall - async (type, payload) => void — your network caller
 */
export async function replayPendingMutations(apiCall) {
    const mutations = await getPendingMutations();
    for (const mut of mutations) {
        try {
            await apiCall(mut.type, mut.payload);
            await removeMutation(mut.id);
        } catch (err) {
            console.warn('[offlineDb] Failed to replay mutation:', mut.type, err);
            break; // Stop on first failure — retry next time
        }
    }
}

/** Close the DB connection (call on app background if needed). */
export async function closeDb() {
    if (!_db) return;
    const sqlite = await getSqlite();
    if (sqlite) {
        await sqlite.closeConnection({ database: DB_NAME }).catch(() => {});
    }
    _db = null;
}
