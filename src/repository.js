import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

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
