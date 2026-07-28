import "server-only";
import mysql, {
  type Pool,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

export type MysqlConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
};

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;
let resolvedConfig: MysqlConfig | null | undefined;

function parseDatabaseUrl(url: string): MysqlConfig | null {
  try {
    const u = new URL(url);
    if (!["mysql:", "mysql2:", "mariadb:"].includes(u.protocol)) return null;
    return {
      host: u.hostname || "127.0.0.1",
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username || "root"),
      password: decodeURIComponent(u.password || ""),
      database: decodeURIComponent(u.pathname.replace(/^\//, "")),
      ssl:
        u.searchParams.get("ssl") === "true" ||
        u.searchParams.get("sslmode") === "require",
    };
  } catch {
    return null;
  }
}

/** 讀取 MYSQL_* 或 DATABASE_URL／MYSQL_URL */
export function getMysqlConfig(): MysqlConfig | null {
  if (resolvedConfig !== undefined) return resolvedConfig;

  const url =
    process.env.MYSQL_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (url) {
    const parsed = parseDatabaseUrl(url);
    if (parsed?.database) {
      resolvedConfig = parsed;
      return resolvedConfig;
    }
  }

  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  if (!host || !user || !database) {
    resolvedConfig = null;
    return null;
  }

  resolvedConfig = {
    host,
    port: Number(process.env.MYSQL_PORT?.trim() || "3306") || 3306,
    user,
    password: process.env.MYSQL_PASSWORD ?? "",
    database,
    ssl:
      process.env.MYSQL_SSL === "true" ||
      process.env.MYSQL_SSL === "1" ||
      process.env.MYSQL_SSL === "require",
  };
  return resolvedConfig;
}

export function isMysqlConfigured(): boolean {
  return getMysqlConfig() != null;
}

function buildPoolOptions(cfg: MysqlConfig): PoolOptions {
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || "5") || 5,
    enableKeepAlive: true,
    timezone: "Z",
    charset: "utf8mb4",
    ...(cfg.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export async function getMysqlPool(): Promise<Pool | null> {
  const cfg = getMysqlConfig();
  if (!cfg) return null;
  if (!pool) {
    pool = mysql.createPool(buildPoolOptions(cfg));
  }
  await ensureMysqlSchema(pool);
  return pool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  id_number VARCHAR(128) NULL,
  profile_completed TINYINT(1) NOT NULL DEFAULT 0,
  role VARCHAR(32) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) NOT NULL,
  applicant_name_zh VARCHAR(255) NOT NULL,
  applicant_name_en VARCHAR(255) NOT NULL,
  id_number VARCHAR(128) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  title VARCHAR(128) NOT NULL,
  relation VARCHAR(64) NOT NULL,
  company_name_zh VARCHAR(255) NOT NULL,
  company_name_en VARCHAR(255) NOT NULL,
  br_number VARCHAR(64) NOT NULL,
  cr_number VARCHAR(64) NOT NULL,
  founded_at VARCHAR(32) NOT NULL,
  company_type VARCHAR(128) NOT NULL,
  industry VARCHAR(128) NOT NULL,
  address VARCHAR(512) NOT NULL,
  employees INT NOT NULL DEFAULT 0,
  website VARCHAR(512) NULL,
  contact_person VARCHAR(255) NOT NULL,
  source VARCHAR(64) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_customers_email_br (email, br_number),
  KEY idx_customers_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function ensureMysqlSchema(existing?: Pool): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const p = existing ?? (await getMysqlPool());
    if (!p) throw new Error("MYSQL_NOT_CONFIGURED");
    for (const stmt of SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await p.query(stmt);
    }
  })().catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

type SqlParam = string | number | boolean | Date | null | Buffer;

export async function mysqlQuery<T extends RowDataPacket[]>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T> {
  const p = await getMysqlPool();
  if (!p) throw new Error("MYSQL_NOT_CONFIGURED");
  const [rows] = await p.query<T>(sql, params);
  return rows;
}

export async function mysqlExecute(
  sql: string,
  params: SqlParam[] = [],
): Promise<ResultSetHeader> {
  const p = await getMysqlPool();
  if (!p) throw new Error("MYSQL_NOT_CONFIGURED");
  const [result] = await p.query<ResultSetHeader>(sql, params);
  return result;
}

export async function pingMysql(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const started = Date.now();
  try {
    const p = await getMysqlPool();
    if (!p) return { ok: false, latencyMs: 0, error: "NOT_CONFIGURED" };
    await p.query("SELECT 1 AS ok");
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : "UNKNOWN",
    };
  }
}

/** 測試用：重設 cached config／pool */
export function resetMysqlForTests() {
  resolvedConfig = undefined;
  schemaReady = null;
  if (pool) {
    void pool.end().catch(() => undefined);
  }
  pool = null;
}
