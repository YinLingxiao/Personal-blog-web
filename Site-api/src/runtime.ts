import { loadConfig } from "./config.js";
import { createDatabase } from "./db.js";

export const config = loadConfig();
export const database = createDatabase(config.databasePath);
