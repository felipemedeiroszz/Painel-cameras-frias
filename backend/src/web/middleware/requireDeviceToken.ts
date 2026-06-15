import type { RequestHandler } from "express";
import { env } from "../../shared/env";

export const requireDeviceToken: RequestHandler = (req, res, next) => {
  if (!env.DEVICE_INGEST_TOKEN) {
    next();
    return;
  }

  const token = req.header("x-device-token");
  if (token !== env.DEVICE_INGEST_TOKEN) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  next();
};

