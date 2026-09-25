import { betterAuth } from "better-auth";
import { config, database } from "./runtime.js";

const socialProviders = {
  ...(config.google.clientId && config.google.clientSecret
    ? { google: { clientId: config.google.clientId, clientSecret: config.google.clientSecret, prompt: "select_account" as const } }
    : {}),
  ...(config.github.clientId && config.github.clientSecret
    ? { github: { clientId: config.github.clientId, clientSecret: config.github.clientSecret } }
    : {}),
};

export const auth = betterAuth({
  appName: "Moqian",
  baseURL: config.authUrl,
  secret: config.secret,
  database,
  trustedOrigins: config.trustedOrigins,
  socialProviders,
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      requireLocalEmailVerified: true,
      trustedProviders: ["google", "github"],
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["user", "super_admin"],
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  advanced: {
    cookiePrefix: "moqian-auth",
    useSecureCookies: config.production,
    crossSubDomainCookies: { enabled: false },
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.production,
      path: "/",
    },
  },
});

export const providerStatus = {
  google: Boolean(config.google.clientId && config.google.clientSecret),
  github: Boolean(config.github.clientId && config.github.clientSecret),
};
