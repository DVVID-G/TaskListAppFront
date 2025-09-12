/**
 * Base URL for API requests.
 * 
 * Loaded from Vite environment variables (`VITE_API_URL`).
 */
const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Generic HTTP request helper using Fetch API.
 *
 * Automatically stringifies the request body (if provided),
 * sets default headers (`Content-Type: application/json`),
 * and parses JSON responses.
 *
 * @async
 * @param {string} path - API path (relative to BASE_URL).
 * @param {Object} [options={}] - Request options.
 * @param {string} [options.method='GET'] - HTTP method (GET, POST, PUT, DELETE).
 * @param {Object} [options.headers={}] - Additional request headers.
 * @param {Object} [options.body] - Request body (will be JSON.stringified).
 * @returns {Promise<any>} The parsed response payload (JSON if available).
 * @throws {Error} If the response is not OK (status >= 400), throws with message.
 */
async function request(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJSON = res.headers.get('content-type')?.includes('application/json');
  const payload = isJSON ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg = payload?.message || payload?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return payload;
}

/**
 * Convenience HTTP client.
 * Provides shorthand methods for common HTTP verbs.
 */
export const http = {
  /**
   * Perform a GET request.
   * @param {string} path - API path.
   * @param {Object} [opts] - Optional fetch options.
   */
  get: (path, opts) => request(path, { method: 'GET', ...opts }),

  /**
   * Perform a POST request.
   * @param {string} path - API path.
   * @param {Object} body - Request body.
   * @param {Object} [opts] - Optional fetch options.
   */
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),

  /**
   * Perform a PUT request.
   * @param {string} path - API path.
   * @param {Object} body - Request body.
   * @param {Object} [opts] - Optional fetch options.
   */
  put: (path, body, opts) => request(path, { method: 'PUT', body, ...opts }),

  /**
   * Perform a DELETE request.
   * @param {string} path - API path.
   * @param {Object} [opts] - Optional fetch options.
   */
  del: (path, opts) => request(path, { method: 'DELETE', ...opts }),
};
