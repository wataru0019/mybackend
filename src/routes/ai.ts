import { Hono } from "hono";
import { getAiResponse } from "../service";

// Cloudflare Workers の型定義
type Bindings = {
    ANTHROPIC_API_KEY: string
    DATABASE_URL: string
  }

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
  const res = await getAiResponse(c.env.ANTHROPIC_API_KEY);
  return c.json(res);
});

export default app;