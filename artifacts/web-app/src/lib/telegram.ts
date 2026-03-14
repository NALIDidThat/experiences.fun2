// Type definitions for Telegram WebApp SDK
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
}

export function getTelegramUser() {
  if (!isTelegramWebApp()) return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

export function getTelegramInitData(): string | null {
  if (!isTelegramWebApp()) return null;
  return window.Telegram?.WebApp?.initData || null;
}
