import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, experiencesTable } from "@workspace/db";

async function post(botToken: string, method: string, body: Record<string, unknown>) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`Telegram ${method} failed:`, e);
  }
}

export async function sendDM(
  botToken: string,
  telegramId: string,
  text: string,
  webAppButton?: { label: string; url: string },
) {
  const body: Record<string, unknown> = { chat_id: telegramId, text, parse_mode: "Markdown" };
  if (webAppButton) {
    body.reply_markup = { inline_keyboard: [[{ text: webAppButton.label, web_app: { url: webAppButton.url } }]] };
  }
  await post(botToken, "sendMessage", body);
}

export async function sendGroupMessage(
  botToken: string,
  groupId: string,
  text: string,
  inlineKeyboard?: Array<Array<{ text: string; web_app?: { url: string } }>>,
) {
  const body: Record<string, unknown> = { chat_id: groupId, text, parse_mode: "Markdown" };
  if (inlineKeyboard?.length) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  await post(botToken, "sendMessage", body);
}

export async function notifyCreatorOfJoin(
  experienceId: number,
  joinerName: string,
  participantCount: number,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;
  if (!botToken) return;

  const [experience] = await db
    .select({ title: experiencesTable.title, creator_id: experiencesTable.creator_id })
    .from(experiencesTable)
    .where(eq(experiencesTable.id, experienceId))
    .limit(1);
  if (!experience) return;

  const [creator] = await db
    .select({ telegram_id: usersTable.telegram_id })
    .from(usersTable)
    .where(eq(usersTable.id, experience.creator_id))
    .limit(1);
  if (!creator?.telegram_id) return;

  const button = miniAppUrl
    ? { label: "View Experience", url: `${miniAppUrl}/experience/${experienceId}` }
    : undefined;
  await sendDM(
    botToken,
    creator.telegram_id,
    `🎉 *${joinerName}* just joined *${experience.title}*!\n👥 Now ${participantCount} participant${participantCount !== 1 ? "s" : ""}.`,
    button,
  );
}

export async function notifyCreatorOfCompletion(
  experienceId: number,
  completerName: string,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;
  if (!botToken) return;

  const [experience] = await db
    .select({ title: experiencesTable.title, creator_id: experiencesTable.creator_id })
    .from(experiencesTable)
    .where(eq(experiencesTable.id, experienceId))
    .limit(1);
  if (!experience) return;

  const [creator] = await db
    .select({ telegram_id: usersTable.telegram_id })
    .from(usersTable)
    .where(eq(usersTable.id, experience.creator_id))
    .limit(1);
  if (!creator?.telegram_id) return;

  const button = miniAppUrl
    ? { label: "View Experience", url: `${miniAppUrl}/experience/${experienceId}` }
    : undefined;
  await sendDM(
    botToken,
    creator.telegram_id,
    `✅ *${completerName}* completed *${experience.title}*!`,
    button,
  );
}

export async function notifyGroupOfNewExperience(
  groupId: string,
  experience: { id: number; title: string; date: string; city: string; xp_reward: number },
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;
  if (!botToken) return;

  const keyboard = miniAppUrl
    ? [[{ text: `Join "${experience.title}" →`, web_app: { url: `${miniAppUrl}/experience/${experience.id}` } }]]
    : undefined;

  await sendGroupMessage(
    botToken,
    groupId,
    `📢 *New Experience*\n\n*${experience.title}*\n📅 ${experience.date} · 📍 ${experience.city} · ⭐ +${experience.xp_reward} XP`,
    keyboard,
  );
}

export async function notifyGroupOfCompletion(
  groupId: string,
  completerName: string,
  experienceTitle: string,
  xpEarned: number,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  await sendGroupMessage(
    botToken,
    groupId,
    `🎉 *${completerName}* just completed *${experienceTitle}* and earned +${xpEarned} XP!`,
  );
}
