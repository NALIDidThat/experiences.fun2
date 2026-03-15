import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { verifyTelegramInitData } from "./telegram-auth";
import { PrivyClient } from "@privy-io/server-auth";

declare global {
  namespace Express {
    interface Request {
      currentUser?: typeof usersTable.$inferSelect;
      privyUserId?: string;
    }
  }
}

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  if (privyClient) return privyClient;
  const appId = process.env.PRIVY_APP_ID || process.env.VITE_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return null;
  privyClient = new PrivyClient(appId, appSecret);
  return privyClient;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      const [userBySession] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.session_token, token))
        .limit(1);
      if (userBySession) {
        req.currentUser = userBySession;
        next();
        return;
      }

      const client = getPrivyClient();
      if (client) {
        try {
          const verifiedClaims = await client.verifyAuthToken(token);
          const privyUserId = verifiedClaims.userId;
          req.privyUserId = privyUserId;

          const [userByPrivy] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.privy_id, privyUserId))
            .limit(1);
          if (userByPrivy) {
            req.currentUser = userByPrivy;
          }
        } catch {
        }
      }
    }
  }

  if (!req.currentUser) {
    const telegramInitData = req.headers["x-telegram-init-data"];
    if (telegramInitData && typeof telegramInitData === "string") {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const verification = verifyTelegramInitData(telegramInitData, botToken);
        if (verification.valid && verification.user) {
          const telegramId = String(verification.user.id);
          const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.telegram_id, telegramId))
            .limit(1);
          if (user) {
            req.currentUser = user;
          }
        }
      }
    }
  }

  next();
}
