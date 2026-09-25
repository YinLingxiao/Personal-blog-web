import path from "node:path";

export type RuntimeConfig = ReturnType<typeof loadConfig>;

const defaultOrigins = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://moqian.me",
  "https://note.moqian.me",
];

function readList(value: string | undefined) {
  const origins = value
    ? value.split(",").map((item) => item.trim()).filter(Boolean)
    : defaultOrigins;

  for (const origin of origins) {
    if (origin.includes("*")) throw new Error("TRUSTED_ORIGINS must not contain wildcards");
    const url = new URL(origin);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
      throw new Error(`TRUSTED_ORIGINS contains an invalid origin: ${origin}`);
    }
  }
  return origins;
}

function readInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number(env[name] || fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function resolveContentRoot(value: string | undefined, fallback: string, name: string, production: boolean) {
  if (production && !value) throw new Error(`${name} must be an explicit absolute path in production`);
  if (value && production && !path.isAbsolute(value)) throw new Error(`${name} must be an absolute path in production`);
  return path.resolve(value || fallback);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === "production";
  const port = readInteger(env, "PORT", 8787, 1, 65535);
  const secret = env.BETTER_AUTH_SECRET || (production ? "" : "moqian-local-development-secret-change-me");

  if (secret.length < 32 || (production && secret === "replace-with-at-least-32-random-characters")) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 non-placeholder characters");
  }

  const authUrl = env.BETTER_AUTH_URL || `http://localhost:${port}`;
  const parsedAuthUrl = new URL(authUrl);
  if (parsedAuthUrl.origin !== authUrl.replace(/\/$/, "")) {
    throw new Error("BETTER_AUTH_URL must be an origin without a path");
  }
  if (production && parsedAuthUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
  }

  if (production && !env.DATABASE_PATH) throw new Error("DATABASE_PATH must be an explicit absolute path in production");
  if (env.DATABASE_PATH && production && !path.isAbsolute(env.DATABASE_PATH)) {
    throw new Error("DATABASE_PATH must be an absolute path in production");
  }
  const databasePath = path.resolve(env.DATABASE_PATH || "./data/auth.sqlite");
  if (production && !env.TRUSTED_ORIGINS) throw new Error("TRUSTED_ORIGINS must be explicit in production");
  const blogContentRoot = resolveContentRoot(env.BLOG_CONTENT_ROOT, "../Opus/posts", "BLOG_CONTENT_ROOT", production);
  const noteContentRoot = resolveContentRoot(env.NOTE_CONTENT_ROOT, "../Notes", "NOTE_CONTENT_ROOT", production);
  const relativeBlogToNote = path.relative(blogContentRoot, noteContentRoot);
  const relativeNoteToBlog = path.relative(noteContentRoot, blogContentRoot);
  const nestedRoots = !relativeBlogToNote || !relativeNoteToBlog ||
    (!relativeBlogToNote.startsWith("..") && !path.isAbsolute(relativeBlogToNote)) ||
    (!relativeNoteToBlog.startsWith("..") && !path.isAbsolute(relativeNoteToBlog));
  if (nestedRoots) throw new Error("BLOG_CONTENT_ROOT and NOTE_CONTENT_ROOT must be separate, non-nested paths");

  const google = {
    clientId: env.GOOGLE_CLIENT_ID?.trim() || "",
    clientSecret: env.GOOGLE_CLIENT_SECRET?.trim() || "",
  };
  const github = {
    clientId: env.GITHUB_CLIENT_ID?.trim() || "",
    clientSecret: env.GITHUB_CLIENT_SECRET?.trim() || "",
  };
  if (production && (!google.clientId || !google.clientSecret || !github.clientId || !github.clientSecret)) {
    throw new Error("Google and GitHub OAuth credentials are both required in production");
  }

  return {
    production,
    port,
    authUrl: authUrl.replace(/\/$/, ""),
    secret,
    databasePath,
    blogContentRoot,
    noteContentRoot,
    trustedOrigins: readList(env.TRUSTED_ORIGINS),
    upload: {
      maxFiles: readInteger(env, "UPLOAD_MAX_FILES", 32, 1, 128),
      maxMarkdownBytes: readInteger(env, "UPLOAD_MAX_MARKDOWN_BYTES", 2 * 1024 * 1024, 1024, 10 * 1024 * 1024),
      maxImageBytes: readInteger(env, "UPLOAD_MAX_IMAGE_BYTES", 10 * 1024 * 1024, 1024, 50 * 1024 * 1024),
      maxTotalBytes: readInteger(env, "UPLOAD_MAX_TOTAL_BYTES", 50 * 1024 * 1024, 1024, 200 * 1024 * 1024),
      maxImagePixels: readInteger(env, "UPLOAD_MAX_IMAGE_PIXELS", 40_000_000, 1, 100_000_000),
      csrfTtlSeconds: readInteger(env, "CSRF_TTL_SECONDS", 300, 60, 900),
      attemptsPerHour: readInteger(env, "UPLOAD_ATTEMPTS_PER_HOUR", 10, 1, 100),
    },
    google,
    github,
  };
}
