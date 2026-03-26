import { auth } from './firebase';

/**
 * Wrapper around fetch that automatically adds Firebase auth token.
 * Use this for all authenticated API calls from client components.
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}

/**
 * Convenience wrapper for JSON POST requests with auth.
 */
export async function authPost(
  url: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Convenience wrapper for JSON PUT requests with auth.
 */
export async function authPut(
  url: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Convenience wrapper for JSON PATCH requests with auth.
 */
export async function authPatch(
  url: string,
  body: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Convenience wrapper for DELETE requests with auth.
 */
export async function authDelete(
  url: string,
  options?: Omit<RequestInit, 'method'>
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'DELETE',
  });
}

/**
 * Convenience wrapper for GET requests with auth.
 */
export async function authGet(
  url: string,
  options?: Omit<RequestInit, 'method'>
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'GET',
  });
}
