import { createVunaClient } from "@vuna/api";

/**
 * API client for Client Components. Requests go to our own /api/backend proxy, which
 * attaches the token from the httpOnly cookie, so the browser never sees it.
 */
export const clientApi = createVunaClient({ baseUrl: "/api/backend/api" });
