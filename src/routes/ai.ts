import { Hono } from "hono";
import { getAiResponse, getAiStream } from "../service";
import { streamText } from 'hono/streaming'
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
  const res = await getAiResponse(c.env.ANTHROPIC_API_KEY);
  return c.json(res);
});
app.get('/ai-stream', async (c) => {
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
                  ["user", "なぜ空が青いのかを説明せよ"]
              ]);
              
              const parser = new StringOutputParser();
              const chain = prompt.pipe(llm).pipe(parser);
              const result = await chain.stream({});
              
              // 各チャンクをストリームに送信
              for await (const chunk of result) {
                  // controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
                  controller.enqueue(new TextEncoder().encode(chunk));
                  console.log(chunk);
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
// app.get('/ai-stream', async (c) => {
//     // SSEのためのヘッダーを設定
//     c.header('Content-Type', 'text/event-stream');
//     c.header('Cache-Control', 'no-cache');
//     c.header('Connection', 'keep-alive');

//     const llm = new ChatAnthropic({
//         model: "claude-3-5-haiku-20241022",
//         apiKey: c.env.ANTHROPIC_API_KEY,
//         temperature: 0.7,
//     })
//     const prompt = ChatPromptTemplate.fromMessages([
//         ["user", "なぜ空が青いのかを説明せよ"]
//     ])
//     const parser = new StringOutputParser()

//     return streamText(c, async (stream) => {
//         const chain = prompt.pipe(llm).pipe(parser)
//         const result = await chain.stream({})
//         for await (const chunk of result) {
//             // SSE形式でデータを送信
//             await stream.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
//             console.log(chunk);
//         }
        
//         // ストリーム終了を示す
//         await stream.write(`data: [DONE]\n\n`);
//     })
// })

export default app;