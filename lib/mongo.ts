import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Strictly validate Mongo URI so we NEVER end up resolving
 * `_mongodb._tcp.30010` or similar garbage.
 */
function requireMongoUri(): string {
  const v = process.env.MONGODB_URI;

  if (!v || !v.trim()) {
    throw new Error(
      "❌ MONGODB_URI is missing. Check your .env file and restart the server."
    );
  }

  // Basic sanity checks
  if (!v.startsWith("mongodb://") && !v.startsWith("mongodb+srv://")) {
    throw new Error(`❌ MONGODB_URI must start with mongodb:// or mongodb+srv:// (got: ${v})`);
  }

  // Detect accidental unescaped @ inside credentials (e.g. password containing @)
  const atCount = (v.match(/@/g) || []).length;
  if (atCount > 1) {
    throw new Error(
      "❌ MONGODB_URI contains multiple '@' characters. URL-encode credentials (replace @ with %40, etc.)."
    );
  }

  // Parse host(s) to catch numeric/port fallbacks early
  const hostMatch = v.match(/^mongodb(\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)/);
  if (!hostMatch) {
    throw new Error(`❌ Unable to parse MONGODB_URI host from: ${v}`);
  }
  const isSrv = !!hostMatch[1];
  const hosts = hostMatch[2].split(",");

  for (const host of hosts) {
    const [hostname, port] = host.split(":");
    if (!hostname || /^\d+$/.test(hostname)) {
      throw new Error(
        `❌ MONGODB_URI host looks like a port fallback (${hostname || "<empty>"}). Check your environment.`
      );
    }

    if (isSrv) {
      if (port) {
        throw new Error("❌ mongodb+srv:// URIs must not include an explicit port.");
      }
      if (!hostname.endsWith(".mongodb.net")) {
        throw new Error(
          `❌ Invalid MongoDB SRV host. Expected *.mongodb.net but got: ${hostname}`
        );
      }
    }
  }

  // Guard against PORT / numeric fallback bugs (your current issue)
  if (/mongodb\+srv:\/\/\d+/.test(v)) {
    throw new Error(
      `❌ MONGODB_URI looks like a port number fallback (${v}). Check env loading.`
    );
  }

  return v;
}

/**
 * Optional DB name (safe default)
 */
function getDbName(): string {
  const name = process.env.MONGODB_DB?.trim();
  return name && name.length > 0 ? name : "app";
}

// --- Resolve env ONCE, at module load ---
const MONGO_URI = requireMongoUri();
const DB_NAME = getDbName();

// Helpful one-time log (server only)
console.log("✅ MongoDB config loaded:", {
  uriHost: MONGO_URI.replace(/mongodb(\+srv)?:\/\/.*@/, "mongodb$1://****@"),
  dbName: DB_NAME,
  nodeEnv: process.env.NODE_ENV,
});

export async function getDb() {
  const client = await getClient();
  return client.db(DB_NAME);
}

function getClient(): Promise<MongoClient> {
  // Reuse connection in dev to avoid hot-reload storms
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGO_URI);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}
