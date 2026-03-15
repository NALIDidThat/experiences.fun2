import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/token/status", async (req: Request, res: Response): Promise<void> => {
  const launchDate = process.env.TOKEN_LAUNCH_DATE || null;
  const tokenInterest = req.currentUser?.token_interest ?? false;
  res.json({ launch_date: launchDate, token_interest: tokenInterest });
});

router.post("/token/notify-me", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }
  await db
    .update(usersTable)
    .set({ token_interest: true })
    .where(eq(usersTable.id, req.currentUser.id));
  res.json({ success: true, token_interest: true });
});

router.post("/admin/token-launch/notify", async (req: Request, res: Response): Promise<void> => {
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers["x-admin-secret"];
  if (!adminSecret || providedSecret !== adminSecret) {
    res.status(403).json({ error: "forbidden", message: "Invalid admin secret" });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    res.status(500).json({ error: "no_bot_token", message: "Telegram bot token not configured" });
    return;
  }

  const interestedUsers = await db
    .select({ id: usersTable.id, telegram_id: usersTable.telegram_id, name: usersTable.name })
    .from(usersTable)
    .where(and(eq(usersTable.token_interest, true)));

  const results = { sent: 0, skipped: 0 };
  for (const user of interestedUsers) {
    if (!user.telegram_id) { results.skipped++; continue; }
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.telegram_id,
          text: `🚀 The $EXP token is launching NOW!\n\nYour XP is about to become real value. Open experiences.fun to learn more.`,
          parse_mode: "Markdown",
        }),
      });
      results.sent++;
    } catch {
      results.skipped++;
    }
  }
  res.json({ success: true, ...results, total: interestedUsers.length });
});

export default router;
