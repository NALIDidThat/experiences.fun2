import { Router, type IRouter } from "express";
import healthRouter from "./health";
import onboardingRouter from "./onboarding";
import usersRouter from "./users";
import experiencesRouter from "./experiences";
import telegramRouter from "./telegram";
import tokenRouter from "./token";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onboardingRouter);
router.use(usersRouter);
router.use(aiRouter);
router.use(experiencesRouter);
router.use(telegramRouter);
router.use(tokenRouter);

export default router;
