import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { verifyTelegramInitData } from "./telegram-auth";

declare global {
  namespace Express {
    interface Request {
      currentUser?: typeof usersTable.$inferSelect;
    }
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.session_token, token))
        .limit(1);
      if (user) {
        req.currentUser = user;
        next();
        return;
      }
    }
  }

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

  next();
}
