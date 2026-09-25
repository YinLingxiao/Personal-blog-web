import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

const roleSchema = {
  user: {
    role: { type: ['user', 'super_admin'] as ['user', 'super_admin'], required: false, defaultValue: 'user', input: false },
  },
};

export const authBaseURL =
  import.meta.env.VITE_AUTH_BASE_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:8787' : 'https://api.moqian.me');

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  fetchOptions: { credentials: 'include' },
  plugins: [inferAdditionalFields(roleSchema)],
});
