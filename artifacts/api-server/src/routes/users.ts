import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, experiencesTable, experienceParticipantsTable, upvotesTable } from "@workspace/db";
import {
  GetUserProfileParams,
  CheckUsernameParams,
  CheckUsernameResponse,
  ToggleUpvoteParams,
  ToggleUpvoteResponse,
} from "@workspace/api-zod";

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
    created_at: user.created_at?.toISOString(),
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
      status: "completed" as const,
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

  res.json(ToggleUpvoteResponse.parse({
    upvoted,
    upvote_count: updatedTarget.upvote_count,
  }));
});

export default router;
