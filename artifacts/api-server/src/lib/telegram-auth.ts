import { createHmac } from "crypto";

export function verifyTelegramInitData(initData: string, botToken: string): { valid: boolean; user?: { id: number; first_name?: string; username?: string } } {
  if (!initData) return { valid: false };

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false };

    params.delete("hash");
    const entries = Array.from(params.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (computedHash !== hash) return { valid: false };

    const userData = params.get("user");
    if (userData) {
      const user = JSON.parse(userData);
      return { valid: true, user };
    }

    return { valid: true };
  } catch {
    return { valid: false };
  }
}

let webhookSecretToken: string | null = null;

export function getWebhookSecretToken(): string {
  if (!webhookSecretToken) {
    webhookSecretToken = createHmac("sha256", process.env.TELEGRAM_BOT_TOKEN || "").update("webhook_secret").digest("hex").slice(0, 32);
  }
  return webhookSecretToken;
}

export function verifyWebhookRequest(secretTokenHeader: string | undefined): boolean {
  if (!secretTokenHeader) return false;
  return secretTokenHeader === getWebhookSecretToken();
}
