import { Hono } from "hono";
import { getAiResponse, agent } from "../service";
import { superAgent } from "../service/agent";
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { HumanMessage } from "@langchain/core/messages";
import { readThreadId } from "../service/crud";

// Cloudflare Workers の型定義
type Bindings = {
    ANTHROPIC_API_KEY: string
    OPENAI_API_KEY: string
    DATABASE_URL: string
    SUPABASE_URL: string
    SUPABASE_KEY: string
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

app.get('/agent', async (c) => {
    const instance = await agent(c.env.OPENAI_API_KEY);

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const result = await instance.stream(
                    { messages: new HumanMessage("お腹すいたよ") },
                    { streamMode: "messages" }
                );
                for await (const chunk of result) {
                    //   controller.enqueue(new TextEncoder().encode(`content: ${JSON.stringify({ content: chunk })}\n\n`));
                    controller.enqueue(new TextEncoder().encode(chunk[0].content));
                }
                  
                  // ストリーム終了
                controller.enqueue(new TextEncoder().encode(''));
                controller.close();
            } catch (error) {
                controller.error(error);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
})

app.post('/agent/memory', async (c) => {
    const body = await c.req.json();
    // console.log(body)
    const message = body.messages
    const chat_id = body.chatId
    const user_id = body.userId
    const nextChatId = await readThreadId(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)
    const thread_id = chat_id === 0 ? nextChatId : chat_id
    // console.log("message:" + message)
    const instance = await superAgent(c.env.OPENAI_API_KEY, c.env.SUPABASE_URL, c.env.SUPABASE_KEY, thread_id, user_id);
    const config = { configurable: { thread_id: thread_id } };

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const result = await instance.stream(
                    { messages: new HumanMessage(message) },
                    { streamMode: "messages", ...config }
                );
                for await (const chunk of result) {
                    //   controller.enqueue(new TextEncoder().encode(`content: ${JSON.stringify({ content: chunk })}\n\n`));
                    controller.enqueue(new TextEncoder().encode(chunk[0].content));
                }
                  
                  // ストリーム終了
                controller.enqueue(new TextEncoder().encode(''));
                controller.close();
            } catch (error) {
                controller.error(error);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
})

app.get('/chatid', async (c) => {
    const nextChatId = await readThreadId(c.env.SUPABASE_URL, c.env.SUPABASE_KEY)
    return c.json({ chat_id: nextChatId })
})

export default app;