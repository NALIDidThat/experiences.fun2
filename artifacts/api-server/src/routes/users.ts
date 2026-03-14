import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import {
  GetUserProfileParams,
  GetUserProfileResponse,
  CheckUsernameParams,
  CheckUsernameResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/check-username/:username", async (req: Request, res: Response): Promise<void> => {
  const params = CheckUsernameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const raw = Array.isArray(params.data.username) ? params.data.username[0] : params.data.username;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, raw))
    .limit(1);

  res.json(
    CheckUsernameResponse.parse({
      available: existing.length === 0,
      username: raw,
    })
  );
});

router.get("/users/:username", async (req: Request, res: Response): Promise<void> => {
  const params = GetUserProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const raw = Array.isArray(params.data.username) ? params.data.username[0] : params.data.username;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, raw))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  res.json(
    GetUserProfileResponse.parse({
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
    })
  );
});

export default router;
