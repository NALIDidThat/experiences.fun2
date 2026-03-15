import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import {
  CompleteOnboardingBody,
  CompleteOnboardingResponse,
} from "@workspace/api-zod";
import { verifyTelegramInitData } from "../lib/telegram-auth";

const router: IRouter = Router();

function userToResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    city: user.city,
    country: user.country,
    interests: user.interests,
    role: user.role,
    bio: user.bio,
    xp: user.xp,
    upvote_count: user.upvote_count,
    created_at: user.created_at?.toISOString(),
  };
}

router.post("/onboarding/complete", async (req: Request, res: Response): Promise<void> => {
  const parsed = CompleteOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { name, username, city, country, interests, role, bio } = parsed.data;

  const privyId: string | null = req.privyUserId || null;
  const walletAddress: string | null = privyId ? ((req.body.wallet_address as string) || null) : null;

  let verifiedTelegramId: string | null = null;
  const telegramInitData = req.headers["x-telegram-init-data"];
  if (telegramInitData && typeof telegramInitData === "string") {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const verification = verifyTelegramInitData(telegramInitData, botToken);
      if (verification.valid && verification.user) {
        verifiedTelegramId = String(verification.user.id);
      }
    }
  }

  if (privyId) {
    const [existingByPrivy] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.privy_id, privyId))
      .limit(1);

    if (existingByPrivy) {
      if (username !== existingByPrivy.username) {
        const [conflict] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.username, username))
          .limit(1);
        if (conflict) {
          res.status(409).json({ error: "username_taken", message: "This username is already taken" });
          return;
        }
      }

      const session_token = existingByPrivy.session_token || randomBytes(32).toString("hex");

      try {
        const [updated] = await db
          .update(usersTable)
          .set({
            name, username, city, country, interests, role,
            bio: bio || null,
            session_token,
            wallet_address: walletAddress || existingByPrivy.wallet_address,
            telegram_id: verifiedTelegramId || existingByPrivy.telegram_id,
          })
          .where(eq(usersTable.id, existingByPrivy.id))
          .returning();

        res.json(CompleteOnboardingResponse.parse({
          success: true,
          user: userToResponse(updated),
          session_token,
        }));
      } catch (e: unknown) {
        if (e && typeof e === "object" && "code" in e && e.code === "23505") {
          res.status(409).json({ error: "username_taken", message: "This username is already taken" });
          return;
        }
        throw e;
      }
      return;
    }
  }

  if (verifiedTelegramId) {
    const [existingByTelegram] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegram_id, verifiedTelegramId))
      .limit(1);

    if (existingByTelegram) {
      if (username !== existingByTelegram.username) {
        const [conflict] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.username, username))
          .limit(1);
        if (conflict) {
          res.status(409).json({ error: "username_taken", message: "This username is already taken" });
          return;
        }
      }

      const session_token = existingByTelegram.session_token || randomBytes(32).toString("hex");

      try {
        const [updated] = await db
          .update(usersTable)
          .set({
            name, username, city, country, interests, role,
            bio: bio || null,
            session_token,
            privy_id: privyId || existingByTelegram.privy_id,
            wallet_address: walletAddress || existingByTelegram.wallet_address,
          })
          .where(eq(usersTable.id, existingByTelegram.id))
          .returning();

        res.json(CompleteOnboardingResponse.parse({
          success: true,
          user: userToResponse(updated),
          session_token,
        }));
      } catch (e: unknown) {
        if (e && typeof e === "object" && "code" in e && e.code === "23505") {
          res.status(409).json({ error: "username_taken", message: "This username is already taken" });
          return;
        }
        throw e;
      }
      return;
    }
  }

  if (req.currentUser) {
    if (username !== req.currentUser.username) {
      const [conflict] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);
      if (conflict) {
        res.status(409).json({ error: "username_taken", message: "This username is already taken" });
        return;
      }
    }

    try {
      const [updated] = await db
        .update(usersTable)
        .set({
          name, username, city, country, interests, role,
          bio: bio || null,
          privy_id: privyId || req.currentUser.privy_id,
          wallet_address: walletAddress || req.currentUser.wallet_address,
        })
        .where(eq(usersTable.id, req.currentUser.id))
        .returning();

      res.json(CompleteOnboardingResponse.parse({
        success: true,
        user: userToResponse(updated),
        session_token: req.currentUser.session_token!,
      }));
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && e.code === "23505") {
        res.status(409).json({ error: "username_taken", message: "This username is already taken" });
        return;
      }
      throw e;
    }
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "username_taken", message: "This username is already taken" });
    return;
  }

  const session_token = randomBytes(32).toString("hex");

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        username,
        city,
        country,
        interests,
        role,
        bio: bio || null,
        telegram_id: verifiedTelegramId,
        privy_id: privyId,
        wallet_address: walletAddress,
        xp: 50,
        upvote_count: 0,
        session_token,
      })
      .returning();

    if (verifiedTelegramId) {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: verifiedTelegramId,
              text: `Welcome to experiences.fun, ${name}! 🎉\n\nYou've earned +50 XP for completing your profile. Start exploring experiences near ${city}!`,
            }),
          });
        }
      } catch (e) {
        console.error("Failed to send Telegram welcome message:", e);
      }
    }

    res.json(CompleteOnboardingResponse.parse({
      success: true,
      user: userToResponse(user),
      session_token,
    }));
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "23505") {
      res.status(409).json({ error: "username_taken", message: "This username is already taken" });
      return;
    }
    throw e;
  }
});

export default router;
