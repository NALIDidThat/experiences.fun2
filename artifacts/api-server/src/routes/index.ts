import { Router, type IRouter } from "express";
import healthRouter from "./health";
import onboardingRouter from "./onboarding";
import usersRouter from "./users";
import experiencesRouter from "./experiences";
import telegramRouter from "./telegram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onboardingRouter);
router.use(usersRouter);
router.use(experiencesRouter);
router.use(telegramRouter);

export default router;
