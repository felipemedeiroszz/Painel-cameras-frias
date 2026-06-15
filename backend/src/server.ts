import http from "node:http";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import { env } from "./shared/env";
import { createApiRouter } from "./web/apiRouter";
import { createSocketServer } from "./web/socket";
import { startOfflineMonitor } from "./workers/offlineMonitor";
import { createMockApiRouter } from "./mock/mockApiRouter";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", env.MOCK_MODE ? createMockApiRouter() : createApiRouter());

const server = http.createServer(app);
createSocketServer(server);
if (!env.MOCK_MODE) startOfflineMonitor();

server.listen(env.PORT, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT}`);
});
