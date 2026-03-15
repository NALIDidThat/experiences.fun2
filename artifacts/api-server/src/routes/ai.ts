import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  experiencesTable,
  experienceParticipantsTable,
  usersTable,
  experienceReflectionsTable,
  aiProfilesTable,
} from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();

function getOpenAIClient() {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("OpenAI integration not configured");
  }
  return new OpenAI({ apiKey, baseURL });
}

router.post("/experiences/:id/reflect", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const experienceId = Number(req.params.id);
  if (isNaN(experienceId)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid experience ID" });
    return;
  }

  const { moods, free_text } = req.body;
  if (!Array.isArray(moods) || moods.length === 0) {
    res.status(400).json({ error: "validation_error", message: "At least one mood is required" });
    return;
  }

  const validMoods = ["energised", "connected", "challenged", "relaxed"];
  const filteredMoods = moods.filter((m: string) => validMoods.includes(m));
  if (filteredMoods.length === 0) {
    res.status(400).json({ error: "validation_error", message: "Invalid mood values" });
    return;
  }

  const [participation] = await db
    .select()
    .from(experienceParticipantsTable)
    .where(
      and(
        eq(experienceParticipantsTable.experience_id, experienceId),
        eq(experienceParticipantsTable.user_id, req.currentUser.id)
      )
    )
    .limit(1);

  if (!participation) {
    res.status(400).json({ error: "not_joined", message: "You must join or complete this experience first" });
    return;
  }

  const existing = await db
    .select()
    .from(experienceReflectionsTable)
    .where(
      and(
        eq(experienceReflectionsTable.experience_id, experienceId),
        eq(experienceReflectionsTable.user_id, req.currentUser.id)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "already_reflected", message: "You already reflected on this experience" });
    return;
  }

  await db.insert(experienceReflectionsTable).values({
    user_id: req.currentUser.id,
    experience_id: experienceId,
    moods: filteredMoods,
    free_text: typeof free_text === "string" && free_text.trim() ? free_text.trim().slice(0, 500) : null,
  });

  updateAiProfileAsync(req.currentUser.id).catch(err =>
    console.error("Failed to update AI profile:", err)
  );

  res.json({ success: true });
});

router.get("/ai/recommendations", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = req.currentUser;

  const reflections = await db
    .select({
      moods: experienceReflectionsTable.moods,
      free_text: experienceReflectionsTable.free_text,
      category: experiencesTable.category,
      type: experiencesTable.type,
      title: experiencesTable.title,
    })
    .from(experienceReflectionsTable)
    .innerJoin(experiencesTable, eq(experienceReflectionsTable.experience_id, experiencesTable.id))
    .where(eq(experienceReflectionsTable.user_id, user.id))
    .orderBy(desc(experienceReflectionsTable.created_at))
    .limit(20);

  const allExperiences = await db
    .select({
      id: experiencesTable.id,
      title: experiencesTable.title,
      description: experiencesTable.description,
      type: experiencesTable.type,
      category: experiencesTable.category,
      date: experiencesTable.date,
      city: experiencesTable.city,
      xp_reward: experiencesTable.xp_reward,
      max_participants: experiencesTable.max_participants,
      creator_name: usersTable.name,
      creator_username: usersTable.username,
    })
    .from(experiencesTable)
    .innerJoin(usersTable, eq(experiencesTable.creator_id, usersTable.id))
    .where(eq(experiencesTable.status, "active"))
    .orderBy(desc(experiencesTable.created_at))
    .limit(30);

  const joinedIds = await db
    .select({ experience_id: experienceParticipantsTable.experience_id })
    .from(experienceParticipantsTable)
    .where(eq(experienceParticipantsTable.user_id, user.id));

  const joinedSet = new Set(joinedIds.map(j => j.experience_id));
  const candidates = allExperiences.filter(e => !joinedSet.has(e.id)).slice(0, 20);

  if (candidates.length === 0) {
    res.json({ experiences: [], reason: "No new experiences available." });
    return;
  }

  try {
    const openai = getOpenAIClient();

    const reflectionSummary = reflections.length > 0
      ? reflections.map(r =>
        `"${r.title}" (${r.category}, ${r.type}) — felt: ${r.moods.join(", ")}${r.free_text ? `, note: "${r.free_text}"` : ""}`
      ).join("\n")
      : "No reflections yet.";

    const userProfile = `Name: ${user.name}
City: ${user.city}
Role: ${user.role}
Interests: ${Array.isArray(user.interests) ? user.interests.join(", ") : user.interests || "general"}
XP: ${user.xp}
Bio: ${user.bio || "Not provided"}

Past reflections:
${reflectionSummary}`;

    const experienceList = candidates.map((e, i) =>
      `${i + 1}. [ID:${e.id}] "${e.title}" — ${e.type}, ${e.category}, ${e.city}, +${e.xp_reward} XP`
    ).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      max_completion_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are a personalization engine for experiences.fun. Rank experiences by analyzing the user's reflection patterns (what emotions they felt, what categories they enjoy) alongside their profile. Return ONLY valid JSON.`,
        },
        {
          role: "user",
          content: `User profile and history:
${userProfile}

Available experiences:
${experienceList}

Return JSON: {"ranked": [{"id": number, "score": 0-100, "reason": "short sentence max 60 chars"}]}
Rank top 10. Higher score = better fit. Weight reflection moods heavily — if user felt "energised" at community events, rank similar ones higher.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";
    let ranked: Array<{ id: number; score: number; reason: string }> = [];
    try {
      const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
      ranked = parsed.ranked || [];
    } catch {
      ranked = candidates.slice(0, 10).map((e, i) => ({
        id: e.id, score: 80 - i * 5, reason: "Matches your interests",
      }));
    }

    const rankedMap = new Map(ranked.map(r => [r.id, r]));
    const candidateMap = new Map(candidates.map(e => [e.id, e]));
    const result = ranked
      .filter(r => candidateMap.has(r.id))
      .map(r => {
        const exp = candidateMap.get(r.id)!;
        return {
          id: exp.id,
          title: exp.title,
          type: exp.type,
          category: exp.category,
          date: exp.date,
          city: exp.city,
          xp_reward: exp.xp_reward,
          max_participants: exp.max_participants,
          creator_name: exp.creator_name,
          creator_username: exp.creator_username,
          participant_count: 0,
          fit_score: r.score,
          fit_reason: r.reason,
        };
      });

    res.json({ experiences: result });
  } catch (err) {
    console.error("AI recommendations failed:", err);
    const fallback = candidates.slice(0, 10).map(e => ({
      id: e.id, title: e.title, type: e.type, category: e.category,
      date: e.date, city: e.city, xp_reward: e.xp_reward,
      max_participants: e.max_participants, creator_name: e.creator_name,
      creator_username: e.creator_username, participant_count: 0,
      fit_score: 70, fit_reason: "Popular in your area",
    }));
    res.json({ experiences: fallback });
  }
});

router.get("/experiences/for-you", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const user = req.currentUser;

  const allExperiences = await db
    .select({
      id: experiencesTable.id,
      title: experiencesTable.title,
      description: experiencesTable.description,
      type: experiencesTable.type,
      category: experiencesTable.category,
      date: experiencesTable.date,
      city: experiencesTable.city,
      xp_reward: experiencesTable.xp_reward,
      max_participants: experiencesTable.max_participants,
      creator_name: usersTable.name,
      creator_username: usersTable.username,
    })
    .from(experiencesTable)
    .innerJoin(usersTable, eq(experiencesTable.creator_id, usersTable.id))
    .where(eq(experiencesTable.status, "active"))
    .orderBy(desc(experiencesTable.created_at))
    .limit(30);

  const joinedIds = await db
    .select({ experience_id: experienceParticipantsTable.experience_id })
    .from(experienceParticipantsTable)
    .where(eq(experienceParticipantsTable.user_id, user.id));

  const joinedSet = new Set(joinedIds.map(j => j.experience_id));
  const candidates = allExperiences.filter(e => !joinedSet.has(e.id)).slice(0, 20);

  if (candidates.length === 0) {
    res.json({ experiences: [], reason: "No new experiences available in your area." });
    return;
  }

  try {
    const openai = getOpenAIClient();

    const userProfile = `Name: ${user.name}
City: ${user.city}
Role preference: ${user.role}
Interests: ${Array.isArray(user.interests) ? user.interests.join(", ") : user.interests || "general"}
XP: ${user.xp}
Bio: ${user.bio || "Not provided"}`;

    const experienceList = candidates.map((e, i) =>
      `${i + 1}. [ID:${e.id}] "${e.title}" — ${e.type}, ${e.category}, ${e.city}, +${e.xp_reward} XP`
    ).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      max_completion_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are a personalization engine for experiences.fun — a platform where people join local real-world experiences. Rank experiences for a user based on their profile. Return ONLY valid JSON, no explanation.`,
        },
        {
          role: "user",
          content: `User profile:
${userProfile}

Available experiences:
${experienceList}

Return a JSON object with key "ranked" containing an array of objects, each with:
- "id": the experience ID (number)
- "score": fit score 0-100 (number)
- "reason": one short sentence why this fits the user (string, max 60 chars)

Rank the top 10 most relevant experiences. Higher score = better fit. Prioritize city match, interest alignment, and role preference.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";
    let ranked: Array<{ id: number; score: number; reason: string }> = [];
    try {
      const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
      ranked = parsed.ranked || [];
    } catch {
      ranked = candidates.slice(0, 10).map((e, i) => ({ id: e.id, score: 80 - i * 5, reason: "Matches your interests" }));
    }

    const rankedIds = ranked.map(r => r.id);
    const rankedMap = new Map(ranked.map(r => [r.id, r]));
    const candidateMap = new Map(candidates.map(e => [e.id, e]));
    const result = rankedIds
      .filter(id => candidateMap.has(id))
      .map(id => {
        const exp = candidateMap.get(id)!;
        const rank = rankedMap.get(id)!;
        return {
          id: exp.id,
          title: exp.title,
          type: exp.type,
          category: exp.category,
          date: exp.date,
          city: exp.city,
          xp_reward: exp.xp_reward,
          max_participants: exp.max_participants,
          creator_name: exp.creator_name,
          creator_username: exp.creator_username,
          participant_count: 0,
          fit_score: rank.score,
          fit_reason: rank.reason,
        };
      });

    res.json({ experiences: result });
  } catch (err) {
    console.error("AI recommendations failed, falling back:", err);
    const fallback = candidates.slice(0, 10).map(e => ({
      id: e.id, title: e.title, type: e.type, category: e.category,
      date: e.date, city: e.city, xp_reward: e.xp_reward,
      max_participants: e.max_participants, creator_name: e.creator_name,
      creator_username: e.creator_username, participant_count: 0,
      fit_score: 70, fit_reason: "Popular in your area",
    }));
    res.json({ experiences: fallback });
  }
});

router.get("/ai/insights", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const [profile] = await db
    .select()
    .from(aiProfilesTable)
    .where(eq(aiProfilesTable.user_id, req.currentUser.id))
    .limit(1);

  if (profile) {
    res.json({
      summary: profile.preference_summary,
      last_updated: profile.last_updated.toISOString(),
    });
    return;
  }

  const reflections = await db
    .select()
    .from(experienceReflectionsTable)
    .where(eq(experienceReflectionsTable.user_id, req.currentUser.id))
    .limit(1);

  if (reflections.length === 0) {
    res.json({ summary: null, last_updated: null });
    return;
  }

  await updateAiProfileAsync(req.currentUser.id);

  const [updated] = await db
    .select()
    .from(aiProfilesTable)
    .where(eq(aiProfilesTable.user_id, req.currentUser.id))
    .limit(1);

  res.json({
    summary: updated?.preference_summary || null,
    last_updated: updated?.last_updated?.toISOString() || null,
  });
});

router.get("/ai/reflection-status/:id", async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }

  const experienceId = Number(req.params.id);
  if (isNaN(experienceId)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const [existing] = await db
    .select({ id: experienceReflectionsTable.id })
    .from(experienceReflectionsTable)
    .where(
      and(
        eq(experienceReflectionsTable.experience_id, experienceId),
        eq(experienceReflectionsTable.user_id, req.currentUser.id)
      )
    )
    .limit(1);

  res.json({ has_reflected: !!existing });
});

async function updateAiProfileAsync(userId: number) {
  try {
    const reflections = await db
      .select({
        moods: experienceReflectionsTable.moods,
        free_text: experienceReflectionsTable.free_text,
        category: experiencesTable.category,
        type: experiencesTable.type,
        title: experiencesTable.title,
      })
      .from(experienceReflectionsTable)
      .innerJoin(experiencesTable, eq(experienceReflectionsTable.experience_id, experiencesTable.id))
      .where(eq(experienceReflectionsTable.user_id, userId))
      .orderBy(desc(experienceReflectionsTable.created_at))
      .limit(30);

    if (reflections.length === 0) return;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return;

    const openai = getOpenAIClient();

    const reflectionData = reflections.map(r =>
      `"${r.title}" (${r.category}, ${r.type}) — moods: ${r.moods.join(", ")}${r.free_text ? `, note: "${r.free_text}"` : ""}`
    ).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are an insight generator for experiences.fun. Write a brief 2-3 sentence natural-language summary of a user's emerging preferences based on their experience reflections. Be warm, observant, and specific. Mention categories, moods, and patterns you notice. Address them as "you".`,
        },
        {
          role: "user",
          content: `User: ${user.name}, interests: ${user.interests.join(", ")}, city: ${user.city}

Their experience reflections:
${reflectionData}

Write a 2-3 sentence preference summary.`,
        },
      ],
    });

    const summary = response.choices[0]?.message?.content?.trim();
    if (!summary) return;

    const existing = await db
      .select()
      .from(aiProfilesTable)
      .where(eq(aiProfilesTable.user_id, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(aiProfilesTable)
        .set({ preference_summary: summary, last_updated: new Date() })
        .where(eq(aiProfilesTable.user_id, userId));
    } else {
      await db.insert(aiProfilesTable).values({
        user_id: userId,
        preference_summary: summary,
      });
    }
  } catch (err) {
    console.error("Failed to update AI profile for user", userId, err);
  }
}

export default router;
