import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("uses safe local defaults", () => {
    const config = loadConfig({});
    expect(config.port).toBe(8787);
    expect(config.authUrl).toBe("http://localhost:8787");
    expect(config.trustedOrigins).toContain("http://localhost:8080");
    expect(config.production).toBe(false);
  });

  it("requires a production secret", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow("BETTER_AUTH_SECRET");
  });

  it("requires explicit secure production paths", () => {
    const base = {
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "a".repeat(32),
      BLOG_CONTENT_ROOT: "D:/content/blog",
      NOTE_CONTENT_ROOT: "D:/content/note",
      DATABASE_PATH: "D:/data/auth.sqlite",
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
      GITHUB_CLIENT_ID: "github-id",
      GITHUB_CLIENT_SECRET: "github-secret",
      TRUSTED_ORIGINS: "https://moqian.me,https://note.moqian.me",
    };
    expect(() => loadConfig({ ...base, BETTER_AUTH_URL: "http://api.moqian.me" })).toThrow("HTTPS");
    expect(loadConfig({ ...base, BETTER_AUTH_URL: "https://api.moqian.me" }).production).toBe(true);
  });

  it("requires explicit trusted origins in production", () => {
    expect(() => loadConfig({
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "a".repeat(32),
      BETTER_AUTH_URL: "https://api.moqian.me",
      BLOG_CONTENT_ROOT: "D:/content/blog",
      NOTE_CONTENT_ROOT: "D:/content/note",
      DATABASE_PATH: "D:/data/auth.sqlite",
    })).toThrow("TRUSTED_ORIGINS");
  });

  it("rejects placeholder secrets and nested production roots", () => {
    const production = {
      NODE_ENV: "production",
      BETTER_AUTH_URL: "https://api.moqian.me",
      DATABASE_PATH: "D:/data/auth.sqlite",
      GOOGLE_CLIENT_ID: "google-id",
      GOOGLE_CLIENT_SECRET: "google-secret",
      GITHUB_CLIENT_ID: "github-id",
      GITHUB_CLIENT_SECRET: "github-secret",
      TRUSTED_ORIGINS: "https://moqian.me",
    };
    expect(() => loadConfig({
      ...production,
      BETTER_AUTH_SECRET: "replace-with-at-least-32-random-characters",
      BLOG_CONTENT_ROOT: "D:/content/blog",
      NOTE_CONTENT_ROOT: "D:/content/note",
    })).toThrow("non-placeholder");
    expect(() => loadConfig({
      ...production,
      BETTER_AUTH_SECRET: "a".repeat(32),
      BLOG_CONTENT_ROOT: "D:/content",
      NOTE_CONTENT_ROOT: "D:/content/note",
    })).toThrow("non-nested");
  });

  it("rejects wildcard origins", () => {
    expect(() => loadConfig({ TRUSTED_ORIGINS: "https://*.moqian.me" })).toThrow("wildcards");
  });

  it("parses explicit trusted origins", () => {
    const config = loadConfig({ TRUSTED_ORIGINS: "https://moqian.me, https://note.moqian.me" });
    expect(config.trustedOrigins).toEqual(["https://moqian.me", "https://note.moqian.me"]);
  });
});
