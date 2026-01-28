const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const FREE_LLM_API_URL = '/freellm/api/v1/chat';
export const FREE_LLM_API_KEY = env.VITE_FREE_LLM_API_KEY ?? env.API_KEY ?? '';
