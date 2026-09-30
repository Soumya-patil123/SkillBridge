import { Router, type IRouter } from "express";
import healthRouter from "./health";
import skillbridgeRouter from "./skillbridge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(skillbridgeRouter);

export default router;
