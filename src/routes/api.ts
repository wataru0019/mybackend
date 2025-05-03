import { Hono } from "hono";
import { getAiResponse } from "../service";
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

// Cloudflare Workers の型定義
type Bindings = {
    ANTHROPIC_API_KEY: string
    DATABASE_URL: string
  }

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
    const res = { message: "Hello Hono!" }
  return c.json(res);
});

app.post("/chat", async (c) => {
    const body = await c.req.json();
    console.log(body)
    const res = await getAiResponse(c.env.ANTHROPIC_API_KEY, body);
    return c.json(res);
});

app.post('/stream', async (c) => {
    const body = await c.req.json();
  // ストリーミングレスポンスを作成
  const stream = new ReadableStream({
      async start(controller) {
          try {
              const llm = new ChatAnthropic({
                  model: "claude-3-5-haiku-20241022",
                  apiKey: c.env.ANTHROPIC_API_KEY,
                  temperature: 0.7,
              });
              
              const prompt = ChatPromptTemplate.fromMessages([
                  ["user", body]
              ]);
              
              const parser = new StringOutputParser();
              const chain = prompt.pipe(llm).pipe(parser);
              const result = await chain.stream({});
              
              // 各チャンクをストリームに送信
              for await (const chunk of result) {
                //   controller.enqueue(new TextEncoder().encode(`content: ${JSON.stringify({ content: chunk })}\n\n`));
                  controller.enqueue(new TextEncoder().encode(chunk));
              }
              
              // ストリーム終了
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
          } catch (error) {
              controller.error(error);
          }
      }
  });

  // ストリーミングレスポンスを返す
  return new Response(stream, {
      headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
      },
  });
});

export default app;