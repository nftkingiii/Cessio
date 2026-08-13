import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import pg from 'pg';

const emptyState = () => ({ assessments: [], receivables: [], auditEvents: [] });

export class FileRepository {
  constructor(path) {
    this.path = path;
    this.writeQueue = Promise.resolve();
  }

  async read() {
    try {
      return JSON.parse(await readFile(this.path, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return emptyState();
      throw error;
    }
  }

  async transact(mutator) {
    this.writeQueue = this.writeQueue.then(async () => {
      const state = await this.read();
      const result = await mutator(state);
      await mkdir(dirname(this.path), { recursive: true });
      const temporaryPath = `${this.path}.tmp`;
      await writeFile(temporaryPath, JSON.stringify(state, null, 2), { mode: 0o600 });
      await rename(temporaryPath, this.path);
      return result;
    });
    return this.writeQueue;
  }
}

export class PostgresRepository {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString, ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined });
    this.ready = this.initialize();
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS cessio_state (id integer PRIMARY KEY CHECK (id = 1), state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
    await this.pool.query(`INSERT INTO cessio_state (id, state) VALUES (1, $1) ON CONFLICT (id) DO NOTHING`, [emptyState()]);
  }

  async read() {
    await this.ready;
    const result = await this.pool.query('SELECT state FROM cessio_state WHERE id = 1');
    return result.rows[0]?.state ?? emptyState();
  }

  async transact(mutator) {
    this.writeQueue = this.writeQueue.then(async () => {
      await this.ready;
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const current = await client.query('SELECT state FROM cessio_state WHERE id = 1 FOR UPDATE');
        const state = current.rows[0]?.state ?? emptyState();
        const result = await mutator(state);
        await client.query('UPDATE cessio_state SET state = $1, updated_at = now() WHERE id = 1', [state]);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    return this.writeQueue;
  }

  async close() {
    await this.pool.end();
  }
}
