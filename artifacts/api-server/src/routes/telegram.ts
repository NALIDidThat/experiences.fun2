import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { getWebhookSecretToken, verifyWebhookRequest } from "../lib/telegram-auth";

const router: IRouter = Router();

router.post("/telegram/webhook", async (req: Request, res: Response): Promise<void> => {
  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (!verifyWebhookRequest(typeof secretHeader === "string" ? secretHeader : undefined)) {
    res.status(403).json({ error: "forbidden", message: "Invalid secret token" });
    return;
  }

  const update = req.body;

  if (update?.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const telegramId = String(update.message.from.id);
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      res.json({ ok: true });
      return;
    }

    if (text === "/start") {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.telegram_id, telegramId))
        .limit(1);

      if (user) {
        await sendTelegramMessage(botToken, chatId, `Welcome back, ${user.name}! 🎉\n\nYou have ${user.xp} XP. Open the app to explore experiences!`);
      } else {
        await sendTelegramMessage(botToken, chatId, `Welcome to experiences.fun! 🌍\n\nTap the button below to get started and earn your first 50 XP!`);
      }
    } else if (text === "/me") {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.telegram_id, telegramId))
        .limit(1);

      if (user) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `👤 ${user.name} (@${user.username})\n⭐ ${user.xp} XP | 👍 ${user.upvote_count} upvotes\n📍 ${user.city}, ${user.country}\n\nOpen your profile in the app!`,
        );
      } else {
        await sendTelegramMessage(botToken, chatId, "You haven't signed up yet! Use /start to begin.");
      }
    }
  }

  res.json({ ok: true });
});

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("Failed to send Telegram message:", e);
  }
}

export async function setupTelegramBot() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;

  if (!botToken) {
    console.log("TELEGRAM_BOT_TOKEN not set, skipping Telegram bot setup");
    return;
  }

  if (!miniAppUrl) {
    console.log("MINI_APP_URL not set, skipping webhook and menu button setup");
    return;
  }

  try {
    const secretToken = getWebhookSecretToken();
    const webhookUrl = `${miniAppUrl}/api/telegram/webhook`;
    const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: secretToken }),
    });
    const webhookData = await webhookRes.json();
    console.log("Telegram webhook set:", webhookData);

    const menuRes = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "Open App",
          web_app: { url: miniAppUrl },
        },
      }),
    });
    const menuData = await menuRes.json();
    console.log("Telegram menu button set:", menuData);
  } catch (e) {
    console.error("Failed to setup Telegram bot:", e);
  }
}

export default router;
