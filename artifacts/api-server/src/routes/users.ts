import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, count, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, experiencesTable, experienceParticipantsTable, upvotesTable } from "@workspace/db";
import {
  GetUserProfileParams,
  CheckUsernameParams,
  CheckUsernameResponse,
  ToggleUpvoteParams,
  ToggleUpvoteResponse,
} from "@workspace/api-zod";
import { sendDM } from "../lib/telegram-notify";

const router: IRouter = Router();

router.get("/users/check-username/:username", async (req: Request, res: Response): Promise<void> => {
  const params = CheckUsernameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, params.data.username))
    .limit(1);

  res.json(
    CheckUsernameResponse.parse({
      available: existing.length === 0,
      username: params.data.username,
    })
  );
});

router.get("/users/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = req.currentUser;
  res.json({
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
    session_token: user.session_token,
    created_at: user.created_at?.toISOString(),
    user_type: user.user_type,
    node_name: user.node_name,
    node_type: user.node_type,
    telegram_group_id: user.telegram_group_id,
  });
});

router.get("/users/:username", async (req: Request, res: Response): Promise<void> => {
  const params = GetUserProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, params.data.username))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  const hostedExperiences = await db
    .select({
      id: experiencesTable.id,
      title: experiencesTable.title,
      type: experiencesTable.type,
      category: experiencesTable.category,
      date: experiencesTable.date,
      city: experiencesTable.city,
      status: experiencesTable.status,
      xp_reward: experiencesTable.xp_reward,
    })
    .from(experiencesTable)
    .where(eq(experiencesTable.creator_id, user.id));

  const joinedExperiences = await db
    .select({
      id: experiencesTable.id,
      title: experiencesTable.title,
      type: experiencesTable.type,
      category: experiencesTable.category,
      date: experiencesTable.date,
      city: experiencesTable.city,
      xp_reward: experiencesTable.xp_reward,
      participation_status: experienceParticipantsTable.status,
    })
    .from(experienceParticipantsTable)
    .innerJoin(experiencesTable, eq(experienceParticipantsTable.experience_id, experiencesTable.id))
    .where(eq(experienceParticipantsTable.user_id, user.id));

  const allExperiences = [
    ...hostedExperiences.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      category: e.category,
      role: "hosted" as const,
      status: (e.status === "completed" ? "completed" : "joined") as "joined" | "completed",
      xp_earned: 0,
      date: e.date,
      city: e.city,
    })),
    ...joinedExperiences.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      category: e.category,
      role: "joined" as const,
      status: e.participation_status as "joined" | "completed",
      xp_earned: e.participation_status === "completed" ? e.xp_reward : 0,
      date: e.date,
      city: e.city,
    })),
  ];

  const personalExperiences = allExperiences.filter(e => e.type === "personal");
  const professionalExperiences = allExperiences.filter(e => e.type === "professional");

  let hasUpvoted = false;
  if (req.currentUser && req.currentUser.id !== user.id) {
    const [existing] = await db
      .select({ id: upvotesTable.id })
      .from(upvotesTable)
      .where(and(
        eq(upvotesTable.from_user_id, req.currentUser.id),
        eq(upvotesTable.to_user_id, user.id)
      ))
      .limit(1);
    hasUpvoted = !!existing;
  }

  res.json({
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
    has_upvoted: hasUpvoted,
    created_at: user.created_at?.toISOString(),
    personal_experiences: personalExperiences,
    professional_experiences: professionalExperiences,
  });
});

router.post("/users/:username/upvote", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const params = ToggleUpvoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [targetUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, params.data.username))
    .limit(1);

  if (!targetUser) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  if (targetUser.id === req.currentUser.id) {
    res.status(400).json({ error: "self_upvote", message: "Cannot upvote yourself" });
    return;
  }

  const [existing] = await db
    .select()
    .from(upvotesTable)
    .where(and(
      eq(upvotesTable.from_user_id, req.currentUser.id),
      eq(upvotesTable.to_user_id, targetUser.id)
    ))
    .limit(1);

  let upvoted: boolean;
  if (existing) {
    await db.delete(upvotesTable).where(eq(upvotesTable.id, existing.id));
    await db
      .update(usersTable)
      .set({ upvote_count: targetUser.upvote_count - 1 })
      .where(eq(usersTable.id, targetUser.id));
    upvoted = false;
  } else {
    await db.insert(upvotesTable).values({
      from_user_id: req.currentUser.id,
      to_user_id: targetUser.id,
    });
    await db
      .update(usersTable)
      .set({ upvote_count: targetUser.upvote_count + 1 })
      .where(eq(usersTable.id, targetUser.id));
    upvoted = true;
  }

  const [updatedTarget] = await db
    .select({ upvote_count: usersTable.upvote_count })
    .from(usersTable)
    .where(eq(usersTable.id, targetUser.id))
    .limit(1);

  if (upvoted && targetUser.telegram_id) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      await sendDM(
        botToken,
        targetUser.telegram_id,
        `👍 *${req.currentUser.name}* gave you an upvote on experiences.fun!`,
      );
    }
  }

  res.json(ToggleUpvoteResponse.parse({
    upvoted,
    upvote_count: updatedTarget.upvote_count,
  }));
});

router.patch("/users/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const { name, bio, city, country, node_name, node_type } = req.body as {
    name?: string; bio?: string; city?: string; country?: string;
    node_name?: string; node_type?: string;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name?.trim()) updates.name = name.trim();
  if (bio !== undefined) updates.bio = bio?.trim() || null;
  if (city?.trim()) updates.city = city.trim();
  if (country?.trim()) updates.country = country.trim();
  if (node_name !== undefined) updates.node_name = node_name?.trim() || null;
  if (node_type !== undefined) updates.node_type = node_type?.trim() || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "validation_error", message: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.currentUser.id))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    username: updated.username,
    city: updated.city,
    country: updated.country,
    interests: updated.interests,
    role: updated.role,
    bio: updated.bio,
    xp: updated.xp,
    upvote_count: updated.upvote_count,
    user_type: updated.user_type,
    node_name: updated.node_name,
    node_type: updated.node_type,
  });
});

router.get("/users/me/node-stats", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const userId = req.currentUser.id;

  const [stats] = await db
    .select({
      total_experiences: count(experiencesTable.id),
      total_participants: sql<number>`COUNT(DISTINCT ${experienceParticipantsTable.user_id})`,
      total_completions: sql<number>`COUNT(CASE WHEN ${experienceParticipantsTable.status} = 'completed' THEN 1 END)`,
      total_xp_distributed: sql<number>`COALESCE(SUM(CASE WHEN ${experienceParticipantsTable.status} = 'completed' THEN ${experiencesTable.xp_reward} ELSE 0 END), 0)`,
    })
    .from(experiencesTable)
    .leftJoin(experienceParticipantsTable, eq(experienceParticipantsTable.experience_id, experiencesTable.id))
    .where(eq(experiencesTable.creator_id, userId));

  const experienceRows = await db
    .select({
      id: experiencesTable.id,
      title: experiencesTable.title,
      type: experiencesTable.type,
      category: experiencesTable.category,
      date: experiencesTable.date,
      status: experiencesTable.status,
      xp_reward: experiencesTable.xp_reward,
      participant_count: sql<number>`COUNT(${experienceParticipantsTable.id})`,
      completion_count: sql<number>`COUNT(CASE WHEN ${experienceParticipantsTable.status} = 'completed' THEN 1 END)`,
    })
    .from(experiencesTable)
    .leftJoin(experienceParticipantsTable, eq(experienceParticipantsTable.experience_id, experiencesTable.id))
    .where(eq(experiencesTable.creator_id, userId))
    .groupBy(experiencesTable.id)
    .orderBy(experiencesTable.id);

  res.json({
    total_experiences: Number(stats?.total_experiences ?? 0),
    total_participants: Number(stats?.total_participants ?? 0),
    total_completions: Number(stats?.total_completions ?? 0),
    total_xp_distributed: Number(stats?.total_xp_distributed ?? 0),
    experiences: experienceRows.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      category: e.category,
      date: e.date,
      status: e.status,
      xp_reward: e.xp_reward,
      participant_count: Number(e.participant_count),
      completion_count: Number(e.completion_count),
    })),
  });
});

router.post("/users/me/link-group", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const { telegram_group_id } = req.body as { telegram_group_id?: string };
  if (!telegram_group_id || typeof telegram_group_id !== "string") {
    res.status(400).json({ error: "validation_error", message: "telegram_group_id is required" });
    return;
  }

  await db
    .update(usersTable)
    .set({ telegram_group_id })
    .where(eq(usersTable.id, req.currentUser.id));

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL;
  const nodeName = req.currentUser.node_name || req.currentUser.name;
  if (botToken) {
    const appLink = miniAppUrl ? `\n\nOpen: ${miniAppUrl}` : "";
    await sendDM(
      botToken,
      telegram_group_id,
      `✅ This group is now linked to *${nodeName}* on experiences.fun! New experiences and completions will be announced here.${appLink}`,
    );
  }

  res.json({ success: true, telegram_group_id });
});

export default router;
