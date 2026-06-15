import type { RequestHandler } from "express";
import { verifyUserToken } from "../../auth/jwt";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      userId: number;
      email: string;
      lojaId?: number | null;
      isAdmin?: boolean;
    };
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    req.auth = verifyUserToken(token);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
};
