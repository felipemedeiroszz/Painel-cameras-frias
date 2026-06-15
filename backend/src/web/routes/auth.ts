import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/query";
import { signUserToken } from "../../auth/jwt";
import { verifyPassword } from "../../auth/password";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(1)
    })
    .safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const [user] = await query<{
    id: number;
    email: string;
    password_hash: string;
    loja_id: number | null;
    is_admin: boolean;
  }>("select id, email, password_hash, loja_id, is_admin from users where email = $1", [body.data.email]);

  if (!user) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  const ok = await verifyPassword(body.data.password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  const token = signUserToken({
    userId: user.id,
    email: user.email,
    lojaId: user.is_admin ? null : user.loja_id,
    isAdmin: user.is_admin
  });
  res.json({
    token,
    user: { id: user.id, email: user.email }
  });
});
