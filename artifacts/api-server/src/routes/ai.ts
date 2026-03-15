import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { experiencesTable, experienceParticipantsTable, usersTable } from "@workspace/db";
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
      model: "gpt-5-nano",
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
    const countMap = new Map<number, number>();

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
          participant_count: countMap.get(exp.id) || 0,
          fit_score: rank.score,
          fit_reason: rank.reason,
        };
      });

    res.json({ experiences: result });
  } catch (err) {
    console.error("AI recommendations failed, falling back:", err);
    const fallback = candidates.slice(0, 10).map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      category: e.category,
      date: e.date,
      city: e.city,
      xp_reward: e.xp_reward,
      max_participants: e.max_participants,
      creator_name: e.creator_name,
      creator_username: e.creator_username,
      participant_count: 0,
      fit_score: 70,
      fit_reason: "Popular in your area",
    }));
    res.json({ experiences: fallback });
  }
});

export default router;
