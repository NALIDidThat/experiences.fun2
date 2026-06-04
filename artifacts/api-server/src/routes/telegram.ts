import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, experiencesTable, experienceParticipantsTable } from "@workspace/db";
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
    const text: string = update.message.text;
    const telegramId = String(update.message.from.id);
    const chatType: string = update.message.chat.type;
    const isGroup = chatType === "group" || chatType === "supergroup";
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const miniAppUrl = process.env.MINI_APP_URL;

    if (!botToken) {
      res.json({ ok: true });
      return;
    }

    // Strip bot mention from commands (e.g. "/start@botname" → "/start")
    const command = text.split("@")[0].trim();

    if (isGroup) {
      // --- Group chat commands ---
      const [educator] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.telegram_group_id, String(chatId)))
        .limit(1);

      if (command === "/experiences") {
        if (!educator) {
          await sendTelegramMessage(botToken, chatId, "This group isn't linked to a node yet. An educator can link it from the app.");
        } else {
          const experiences = await db
            .select({
              id: experiencesTable.id,
              title: experiencesTable.title,
              date: experiencesTable.date,
              city: experiencesTable.city,
              xp_reward: experiencesTable.xp_reward,
            })
            .from(experiencesTable)
            .where(and(eq(experiencesTable.creator_id, educator.id), eq(experiencesTable.status, "active")))
            .orderBy(desc(experiencesTable.created_at))
            .limit(5);

          if (experiences.length === 0) {
            await sendTelegramMessage(botToken, chatId, `No active experiences from *${educator.node_name || educator.name}* right now.`);
          } else {
            let msg = `📋 *Active experiences from ${educator.node_name || educator.name}:*\n\n`;
            const keyboard: Array<Array<{ text: string; web_app?: { url: string } }>> = [];
            for (const exp of experiences) {
              msg += `• *${exp.title}* — ${exp.date} · +${exp.xp_reward} XP\n`;
              if (miniAppUrl) keyboard.push([{ text: `Join "${exp.title}"`, web_app: { url: `${miniAppUrl}/experience/${exp.id}` } }]);
            }
            await sendTelegramMessageWithInlineKeyboard(botToken, chatId, msg, keyboard);
          }
        }
      } else if (command.startsWith("/join")) {
        const parts = command.split(" ");
        const expId = parts[1] ? parseInt(parts[1], 10) : NaN;
        if (isNaN(expId)) {
          await sendTelegramMessage(botToken, chatId, "Usage: /join [experience_id]");
        } else {
          const [sender] = await db.select().from(usersTable).where(eq(usersTable.telegram_id, telegramId)).limit(1);
          if (!sender) {
            await sendTelegramMessageWithWebApp(botToken, chatId, "You need to sign up first!", "Sign Up", miniAppUrl || undefined);
          } else {
            const [exp] = await db.select().from(experiencesTable).where(eq(experiencesTable.id, expId)).limit(1);
            if (!exp || exp.status !== "active") {
              await sendTelegramMessage(botToken, chatId, "Experience not found or no longer active.");
            } else {
              try {
                await db.insert(experienceParticipantsTable).values({ experience_id: expId, user_id: sender.id });
                const [{ pCount }] = await db.select({ pCount: count() }).from(experienceParticipantsTable).where(eq(experienceParticipantsTable.experience_id, expId));
                await sendTelegramMessage(botToken, chatId, `✅ *${sender.name}* joined *${exp.title}*! (${pCount} participants total)`);
              } catch {
                await sendTelegramMessage(botToken, chatId, `You've already joined *${exp.title}*.`);
              }
            }
          }
        }
      } else if (command === "/leaderboard") {
        if (!educator) {
          await sendTelegramMessage(botToken, chatId, "This group isn't linked to a node yet.");
        } else {
          const rows = await db
            .select({
              name: usersTable.name,
              username: usersTable.username,
              xp: usersTable.xp,
            })
            .from(experienceParticipantsTable)
            .innerJoin(usersTable, eq(experienceParticipantsTable.user_id, usersTable.id))
            .innerJoin(experiencesTable, eq(experienceParticipantsTable.experience_id, experiencesTable.id))
            .where(and(eq(experiencesTable.creator_id, educator.id), eq(experienceParticipantsTable.status, "completed")))
            .orderBy(usersTable.xp)
            .limit(5);

          if (rows.length === 0) {
            await sendTelegramMessage(botToken, chatId, "No completions yet — be the first! 🏆");
          } else {
            const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
            let msg = `🏆 *Top participants in ${educator.node_name || educator.name}:*\n\n`;
            rows.forEach((r, i) => { msg += `${medals[i]} *${r.name}* (@${r.username}) — ${r.xp} XP\n`; });
            await sendTelegramMessage(botToken, chatId, msg);
          }
        }
      }
    } else {
      // --- Private chat commands ---
      if (command === "/start") {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.telegram_id, telegramId)).limit(1);
        if (user) {
          await sendTelegramMessageWithWebApp(botToken, chatId,
            `Welcome back, ${user.name}! 🎉\n\nYou have ${user.xp} XP. Tap below to explore experiences!`,
            "Open App", miniAppUrl ? `${miniAppUrl}/home` : undefined);
        } else {
          await sendTelegramMessageWithWebApp(botToken, chatId,
            `Welcome to experiences.fun! 🌍\n\nTap below to get started and earn your first 50 XP!`,
            "Get Started", miniAppUrl || undefined);
        }
      } else if (command === "/me") {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.telegram_id, telegramId)).limit(1);
        if (user) {
          const typeLabel = user.user_type === "educator" ? `🏫 ${user.node_name || "Node Creator"}` : "🎓 Explorer";
          await sendTelegramMessageWithWebApp(botToken, chatId,
            `👤 ${user.name} (@${user.username})\n${typeLabel}\n⭐ ${user.xp} XP | 👍 ${user.upvote_count} upvotes\n📍 ${user.city}, ${user.country}`,
            "View Profile", miniAppUrl ? `${miniAppUrl}/u/${user.username}` : undefined);
        } else {
          await sendTelegramMessageWithWebApp(botToken, chatId, "You haven't signed up yet! Tap below to begin.", "Sign Up", miniAppUrl || undefined);
        }
      } else if (command === "/explore") {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.telegram_id, telegramId)).limit(1);
        const cityFilter = user ? eq(experiencesTable.city, user.city) : undefined;
        const experiences = await db
          .select({ id: experiencesTable.id, title: experiencesTable.title, type: experiencesTable.type, date: experiencesTable.date, city: experiencesTable.city, xp_reward: experiencesTable.xp_reward })
          .from(experiencesTable)
          .where(cityFilter)
          .orderBy(desc(experiencesTable.created_at))
          .limit(3);

        if (experiences.length === 0) {
          await sendTelegramMessage(botToken, chatId, user ? `No experiences near ${user.city} yet. Be the first! 🚀` : "No experiences yet. Sign up and create one! 🚀");
        } else {
          let message = user ? `🌍 Top experiences near ${user.city}:\n\n` : "🌍 Latest experiences:\n\n";
          const inlineKeyboard: Array<Array<{ text: string; web_app?: { url: string } }>> = [];
          for (const exp of experiences) {
            message += `${exp.type === "personal" ? "🌟" : "💼"} *${exp.title}*\n📍 ${exp.city} · 📅 ${exp.date} · ⭐ +${exp.xp_reward} XP\n\n`;
            if (miniAppUrl) inlineKeyboard.push([{ text: `View "${exp.title}" →`, web_app: { url: `${miniAppUrl}/experience/${exp.id}` } }]);
          }
          await sendTelegramMessageWithInlineKeyboard(botToken, chatId, message, inlineKeyboard);
        }
      } else if (command === "/create") {
        await sendTelegramMessageWithWebApp(botToken, chatId, "Ready to create a new experience? 🎉", "Create Experience", miniAppUrl ? `${miniAppUrl}/create` : undefined);
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
        scope: { type: "all_private_chats" },
      }),
    });

    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "experiences", description: "List active experiences from this node" },
          { command: "join", description: "Join an experience by ID" },
          { command: "leaderboard", description: "Top participants in this node" },
        ],
        scope: { type: "all_group_chats" },
      }),
    });
  } catch (e) {
    console.error("Failed to setup Telegram bot:", e);
  }
}

export default router;
