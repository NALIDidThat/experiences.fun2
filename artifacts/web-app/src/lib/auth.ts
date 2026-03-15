import { getTelegramInitData, isTelegramWebApp } from "./telegram";

let privyAccessToken: string | null = null;

export function getSessionToken(): string | null {
  return localStorage.getItem('session_token');
}

export function setSessionToken(token: string) {
  localStorage.setItem('session_token', token);
}

export function setPrivyAccessToken(token: string | null) {
  privyAccessToken = token;
}

export function getPrivyAccessToken(): string | null {
  return privyAccessToken;
}

export function isAuthenticated(): boolean {
  return !!privyAccessToken || !!getSessionToken() || isTelegramWebApp();
}

export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (privyAccessToken) {
    headers['Authorization'] = `Bearer ${privyAccessToken}`;
  } else {
    const token = getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const tgData = getTelegramInitData();
  if (tgData) {
    headers['X-Telegram-Init-Data'] = tgData;
  }

  return headers;
}
