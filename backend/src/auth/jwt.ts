import jwt from "jsonwebtoken";
import { env } from "../shared/env";

export type JwtUser = {
  userId: number;
  email: string;
  lojaId?: number | null;
  isAdmin?: boolean;
};

export function signUserToken(user: JwtUser): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: "12h" });
}

export function verifyUserToken(token: string): JwtUser {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}
