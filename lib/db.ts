import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return _pool;
}

export default new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getPool();
    const value = (pool as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(pool);
    }
    return value;
  },
});
