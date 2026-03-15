import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { experiencesTable, experienceParticipantsTable, usersTable } from "@workspace/db";
import {
  ListExperiencesQueryParams,
  ListExperiencesResponse,
  CreateExperienceBody,
  GetExperienceParams,
  GetExperienceResponse,
  JoinExperienceParams,
  JoinExperienceResponse,
  CompleteExperienceParams,
  CompleteExperienceResponse,
} from "@workspace/api-zod";

const PAGE_SIZE = 20;

const router: IRouter = Router();

router.get("/experiences", async (req: Request, res: Response): Promise<void> => {
  const query = ListExperiencesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "validation_error", message: query.error.message });
    return;
  }

  const { city, country, type, category, page = 1 } = query.data;
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [eq(experiencesTable.status, "active")];
  if (city) conditions.push(eq(experiencesTable.city, city));
  if (country) conditions.push(eq(experiencesTable.country, country));
  if (type) conditions.push(eq(experiencesTable.type, type));
  if (category) conditions.push(eq(experiencesTable.category, category));

  const where = and(...conditions);

  const [{ total: totalCount }] = await db
    .select({ total: count() })
    .from(experiencesTable)
    .where(where);

  const rows = await db
    .select({
      id: experiencesTable.id,
      title: experiencesTable.title,
      type: experiencesTable.type,
      category: experiencesTable.category,
      date: experiencesTable.date,
      city: experiencesTable.city,
      country: experiencesTable.country,
      xp_reward: experiencesTable.xp_reward,
      max_participants: experiencesTable.max_participants,
      status: experiencesTable.status,
      creator_name: usersTable.name,
      creator_username: usersTable.username,
    })
    .from(experiencesTable)
    .innerJoin(usersTable, eq(experiencesTable.creator_id, usersTable.id))
    .where(where)
    .orderBy(desc(experiencesTable.created_at))
    .limit(PAGE_SIZE)
    .offset(offset);

  const experienceIds = rows.map(r => r.id);
  let participantCounts: Record<number, number> = {};
  if (experienceIds.length > 0) {
    const counts = await db
      .select({
        experience_id: experienceParticipantsTable.experience_id,
        count: count(),
      })
      .from(experienceParticipantsTable)
      .where(sql`${experienceParticipantsTable.experience_id} IN (${sql.join(experienceIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(experienceParticipantsTable.experience_id);

    for (const c of counts) {
      participantCounts[c.experience_id] = c.count;
    }
  }

  const experiences = rows.map(r => ({
    id: r.id,
    title: r.title,
    type: r.type,
    category: r.category,
    date: r.date,
    city: r.city,
    country: r.country,
    xp_reward: r.xp_reward,
    participant_count: participantCounts[r.id] || 0,
    max_participants: r.max_participants,
    creator_name: r.creator_name,
    creator_username: r.creator_username,
    status: r.status,
  }));

  res.json(ListExperiencesResponse.parse({
    experiences,
    total: totalCount,
    page,
    page_size: PAGE_SIZE,
  }));
});

router.post("/experiences", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const parsed = CreateExperienceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { title, description, type, category, date, city, country, max_participants, xp_reward } = parsed.data;

  const [experience] = await db
    .insert(experiencesTable)
    .values({
      title,
      description,
      type,
      category,
      date,
      city,
      country,
      max_participants: max_participants ?? null,
      xp_reward: xp_reward ?? 100,
      creator_id: req.currentUser.id,
    })
    .returning();

  res.status(201).json(GetExperienceResponse.parse({
    id: experience.id,
    title: experience.title,
    description: experience.description,
    type: experience.type,
    category: experience.category,
    date: experience.date,
    city: experience.city,
    country: experience.country,
    xp_reward: experience.xp_reward,
    max_participants: experience.max_participants,
    participant_count: 0,
    completion_count: 0,
    status: experience.status,
    creator: {
      id: req.currentUser.id,
      name: req.currentUser.name,
      username: req.currentUser.username,
    },
    participants: [],
    joined: false,
    participation_status: null,
    created_at: experience.created_at.toISOString(),
  }));
});

router.get("/experiences/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [experience] = await db
    .select()
    .from(experiencesTable)
    .where(eq(experiencesTable.id, params.data.id))
    .limit(1);

  if (!experience) {
    res.status(404).json({ error: "not_found", message: "Experience not found" });
    return;
  }

  const [creator] = await db
    .select({ id: usersTable.id, name: usersTable.name, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, experience.creator_id))
    .limit(1);

  const [{ pCount }] = await db
    .select({ pCount: count() })
    .from(experienceParticipantsTable)
    .where(eq(experienceParticipantsTable.experience_id, experience.id));

  const [{ cCount }] = await db
    .select({ cCount: count() })
    .from(experienceParticipantsTable)
    .where(
      and(
        eq(experienceParticipantsTable.experience_id, experience.id),
        eq(experienceParticipantsTable.status, "completed")
      )
    );

  const participantRows = await db
    .select({ name: usersTable.name, username: usersTable.username })
    .from(experienceParticipantsTable)
    .innerJoin(usersTable, eq(experienceParticipantsTable.user_id, usersTable.id))
    .where(eq(experienceParticipantsTable.experience_id, experience.id))
    .orderBy(desc(experienceParticipantsTable.joined_at))
    .limit(10);

  let joined = false;
  let participationStatus: string | null = null;
  if (req.currentUser) {
    const [participation] = await db
      .select()
      .from(experienceParticipantsTable)
      .where(
        and(
          eq(experienceParticipantsTable.experience_id, experience.id),
          eq(experienceParticipantsTable.user_id, req.currentUser.id)
        )
      )
      .limit(1);

    if (participation) {
      joined = true;
      participationStatus = participation.status;
    }
  }

  res.json(GetExperienceResponse.parse({
    id: experience.id,
    title: experience.title,
    description: experience.description,
    type: experience.type,
    category: experience.category,
    date: experience.date,
    city: experience.city,
    country: experience.country,
    xp_reward: experience.xp_reward,
    max_participants: experience.max_participants,
    participant_count: pCount,
    completion_count: cCount,
    status: experience.status,
    creator: creator ? { id: creator.id, name: creator.name, username: creator.username } : { id: 0, name: "Unknown", username: "unknown" },
    participants: participantRows,
    joined,
    participation_status: participationStatus,
    created_at: experience.created_at.toISOString(),
  }));
});

router.post("/experiences/:id/join", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const params = JoinExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [experience] = await db
    .select()
    .from(experiencesTable)
    .where(eq(experiencesTable.id, params.data.id))
    .limit(1);

  if (!experience) {
    res.status(404).json({ error: "not_found", message: "Experience not found" });
    return;
  }

  if (experience.max_participants) {
    const [{ pCount }] = await db
      .select({ pCount: count() })
      .from(experienceParticipantsTable)
      .where(eq(experienceParticipantsTable.experience_id, experience.id));

    if (pCount >= experience.max_participants) {
      res.status(409).json({ error: "full", message: "Experience is full" });
      return;
    }
  }

  try {
    await db.insert(experienceParticipantsTable).values({
      experience_id: experience.id,
      user_id: req.currentUser.id,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "23505") {
      res.status(409).json({ error: "already_joined", message: "Already joined this experience" });
      return;
    }
    throw e;
  }

  const [{ pCount }] = await db
    .select({ pCount: count() })
    .from(experienceParticipantsTable)
    .where(eq(experienceParticipantsTable.experience_id, experience.id));

  res.json(JoinExperienceResponse.parse({ success: true, participant_count: pCount }));
});

router.post("/experiences/:id/complete", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const params = CompleteExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [experience] = await db
    .select()
    .from(experiencesTable)
    .where(eq(experiencesTable.id, params.data.id))
    .limit(1);

  if (!experience) {
    res.status(404).json({ error: "not_found", message: "Experience not found" });
    return;
  }

  const [participation] = await db
    .select()
    .from(experienceParticipantsTable)
    .where(
      and(
        eq(experienceParticipantsTable.experience_id, experience.id),
        eq(experienceParticipantsTable.user_id, req.currentUser.id)
      )
    )
    .limit(1);

  if (!participation) {
    res.status(400).json({ error: "not_joined", message: "You haven't joined this experience" });
    return;
  }

  if (participation.status === "completed") {
    res.status(409).json({ error: "already_completed", message: "Already completed this experience" });
    return;
  }

  await db
    .update(experienceParticipantsTable)
    .set({ status: "completed", completed_at: new Date() })
    .where(eq(experienceParticipantsTable.id, participation.id));

  const [updatedUser] = await db
    .update(usersTable)
    .set({ xp: sql`${usersTable.xp} + ${experience.xp_reward}` })
    .where(eq(usersTable.id, req.currentUser.id))
    .returning();

  if (req.currentUser.telegram_id) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: req.currentUser.telegram_id,
            text: `🎉 You completed "${experience.title}"!\n\n+${experience.xp_reward} XP earned\n⭐ Total XP: ${updatedUser.xp}`,
          }),
        });
      } catch (e) {
        console.error("Failed to send XP notification:", e);
      }
    }
  }

  res.json(CompleteExperienceResponse.parse({
    success: true,
    xp_earned: experience.xp_reward,
    total_xp: updatedUser.xp,
  }));
});

export default router;
