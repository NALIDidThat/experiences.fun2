import { getTelegramInitData } from "./telegram";

export function getSessionToken(): string | null {
  return localStorage.getItem('session_token');
}

export function setSessionToken(token: string) {
  localStorage.setItem('session_token', token);
}

export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const tgData = getTelegramInitData();
  if (tgData) {
    headers['X-Telegram-Init-Data'] = tgData;
  }
  
  return headers;
}
