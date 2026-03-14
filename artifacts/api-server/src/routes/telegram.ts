import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, experiencesTable } from "@workspace/db";
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
    const miniAppUrl = process.env.MINI_APP_URL;

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
        await sendTelegramMessageWithWebApp(
          botToken, chatId,
          `Welcome back, ${user.name}! 🎉\n\nYou have ${user.xp} XP. Tap below to explore experiences!`,
          "Open App", miniAppUrl ? `${miniAppUrl}/home` : undefined
        );
      } else {
        await sendTelegramMessageWithWebApp(
          botToken, chatId,
          `Welcome to experiences.fun! 🌍\n\nTap below to get started and earn your first 50 XP!`,
          "Get Started", miniAppUrl || undefined
        );
      }
    } else if (text === "/me") {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.telegram_id, telegramId))
        .limit(1);

      if (user) {
        await sendTelegramMessageWithWebApp(
          botToken, chatId,
          `👤 ${user.name} (@${user.username})\n⭐ ${user.xp} XP | 👍 ${user.upvote_count} upvotes\n📍 ${user.city}, ${user.country}\n\nTap below to view your full profile.`,
          "View Profile", miniAppUrl ? `${miniAppUrl}/u/${user.username}` : undefined
        );
      } else {
        await sendTelegramMessageWithWebApp(
          botToken, chatId,
          "You haven't signed up yet! Tap below to begin.",
          "Sign Up", miniAppUrl || undefined
        );
      }
    } else if (text === "/explore") {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.telegram_id, telegramId))
        .limit(1);

      const cityFilter = user ? eq(experiencesTable.city, user.city) : undefined;

      const experiences = await db
        .select({
          id: experiencesTable.id,
          title: experiencesTable.title,
          type: experiencesTable.type,
          category: experiencesTable.category,
          date: experiencesTable.date,
          city: experiencesTable.city,
          xp_reward: experiencesTable.xp_reward,
        })
        .from(experiencesTable)
        .where(cityFilter)
        .orderBy(desc(experiencesTable.created_at))
        .limit(3);

      if (experiences.length === 0) {
        await sendTelegramMessage(botToken, chatId,
          user
            ? `No experiences found near ${user.city} yet. Be the first to create one! 🚀`
            : "No experiences found yet. Sign up and create one! 🚀"
        );
      } else {
        let message = user
          ? `🌍 Top experiences near ${user.city}:\n\n`
          : "🌍 Latest experiences:\n\n";

        const inlineKeyboard: Array<Array<{ text: string; web_app?: { url: string } }>> = [];

        for (const exp of experiences) {
          const typeEmoji = exp.type === "personal" ? "🌟" : "💼";
          message += `${typeEmoji} **${exp.title}**\n📍 ${exp.city} · 📅 ${exp.date} · ⭐ +${exp.xp_reward} XP\n\n`;

          if (miniAppUrl) {
            inlineKeyboard.push([{
              text: `View "${exp.title}" →`,
              web_app: { url: `${miniAppUrl}/experience/${exp.id}` },
            }]);
          }
        }

        await sendTelegramMessageWithInlineKeyboard(botToken, chatId, message, inlineKeyboard);
      }
    } else if (text === "/create") {
      await sendTelegramMessageWithWebApp(
        botToken, chatId,
        "Ready to create a new experience? 🎉\n\nTap below to set it up!",
        "Create Experience", miniAppUrl ? `${miniAppUrl}/create` : undefined
      );
    }
  }

  res.json({ ok: true });
});

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (e) {
    console.error("Failed to send Telegram message:", e);
  }
}

async function sendTelegramMessageWithWebApp(
  botToken: string, chatId: number, text: string,
  buttonText: string, webAppUrl?: string
) {
  try {
    const body: Record<string, unknown> = { chat_id: chatId, text };

    if (webAppUrl) {
      body.reply_markup = {
        inline_keyboard: [[{
          text: buttonText,
          web_app: { url: webAppUrl }
        }]]
      };
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Failed to send Telegram message:", e);
  }
}

async function sendTelegramMessageWithInlineKeyboard(
  botToken: string, chatId: number, text: string,
  inlineKeyboard: Array<Array<{ text: string; web_app?: { url: string } }>>
) {
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    };

    if (inlineKeyboard.length > 0) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Start the bot" },
          { command: "explore", description: "Discover nearby experiences" },
          { command: "create", description: "Create a new experience" },
          { command: "me", description: "View your profile" },
        ],
      }),
    });
  } catch (e) {
    console.error("Failed to setup Telegram bot:", e);
  }
}

export default router;
