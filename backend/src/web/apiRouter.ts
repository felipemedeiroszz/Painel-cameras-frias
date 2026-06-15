import { Router } from "express";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { ingestRouter } from "./routes/ingest";

export function createApiRouter(): Router {
  const router = Router();

  router.use("/auth", authRouter);
  router.use(ingestRouter);
  router.use(dashboardRouter);

  return router;
}
