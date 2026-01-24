/**
 * Utility functions for handling authentication tokens
 */

/**
 * Gets the access token from localStorage or cookies
 * @returns The access token string or null if not found
 */
export function getAccessToken(): string | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  // Try localStorage first
  const localStorageToken = localStorage.getItem('accessToken');
  if (localStorageToken) {
    return localStorageToken;
  }

  // Fall back to cookies
  try {
    const cookieToken = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith('accessToken='))
      ?.split('=')[1];

    return cookieToken || null;
  } catch (error) {
    console.warn('Could not access document.cookie:', error);
    return null;
  }
}

/**
 * Sets the access token in both localStorage and cookies
 * @param token The access token to store
 */
export function setAccessToken(token: string): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Store in localStorage
  localStorage.setItem('accessToken', token);

  // Store in cookies as backup (with 7 days expiration)
  const expires = new Date();
  expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  document.cookie = `accessToken=${token};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Removes the access token from both localStorage and cookies
 */
export function removeAccessToken(): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Remove from localStorage
  localStorage.removeItem('accessToken');

  // Remove from cookies
  document.cookie = 'accessToken=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
}