import { Router, type IRouter } from "express";
import healthRouter from "./health";
import onboardingRouter from "./onboarding";
import usersRouter from "./users";
import telegramRouter from "./telegram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onboardingRouter);
router.use(usersRouter);
router.use(telegramRouter);

export default router;
