import "dotenv/config";
import { getMigrations } from "better-auth/db/migration";
import { createApp } from "./app.js";
import { auth, providerStatus } from "./auth.js";
import { config, database } from "./runtime.js";

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

const app = createApp(config, auth, database);
const server = app.listen(config.port, "127.0.0.1", () => {
  console.log(`[site-api] listening on ${config.authUrl}`);
  if (!providerStatus.google || !providerStatus.github) {
    console.warn("[site-api] one or more OAuth providers are not configured");
  }
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
