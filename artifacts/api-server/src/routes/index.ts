import { Router, type IRouter } from "express";
import healthRouter from "./health";
import staffRouter from "./staff";
import actsRouter from "./acts";
import scheduleRouter from "./schedule";
import actLogsRouter from "./act-logs";
import remunerationRouter from "./remuneration";

const router: IRouter = Router();

router.use(healthRouter);
router.use(staffRouter);
router.use(actsRouter);
router.use(scheduleRouter);
router.use(actLogsRouter);
router.use(remunerationRouter);

export default router;
