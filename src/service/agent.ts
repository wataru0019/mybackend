import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
    START,
    END,
    MessagesAnnotation,
    StateGraph,
  } from "@langchain/langgraph";

import { insertMessage, readMessages, updateMessage } from "./crud";
import { convertMessages } from "./langchain_messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export async function superAgent(openAiApikey: string, supabaseUrl: string, supabaseKey: string, chat_id: string) {

    const thread_id = chat_id

    async function callModel(state: typeof MessagesAnnotation.State) {
        const read_messages = await readMessages(supabaseUrl, supabaseKey, thread_id)
        console.log("read_messages", read_messages)
        if (read_messages.length) {
            const past_messages = convertMessages(read_messages[0].messages)
            const new_messages = [...past_messages, ...state.messages]
            const response = await llm.invoke(new_messages)
            return { messages: [response] }
        }
        const response = await llm.invoke(state.messages)
        return { messages: [response] }
    }

    const getWeather = tool((location) => {
        return `${location.location} is Sunny`
    }, {
        name: "get_weather",
        description: "Call to get the current weather in anywhere.",
        schema: z.object({
            location: z.string().describe("Location to get the weather for.")
        })
    })

    const calc = tool((input: { a: number, b: number }) => {
        const result = input.a + input.b
        return `${input.a} + ${input.b} = ${result}`
    }, {
        name: "calc",
        description: "Call to calculate a + b.",
        schema: z.object({
            a: z.number().describe("number a"),
            b: z.number().describe("number b")
        })
    })
    const tools = [getWeather, calc]
    const toolNode = new ToolNode(tools)

    const llm = new ChatOpenAI({
        model: "gpt-4o-mini-2024-07-18",
        apiKey: openAiApikey,
        temperature: 0.7,
    }).bindTools(tools)

    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
            return "tools";
        }
        return "insertMessageToDB";
    }

    const insertMessageToDB = async (state: typeof MessagesAnnotation.State) => {
        const { messages } = state;
        const read_messages = await readMessages(supabaseUrl, supabaseKey, thread_id)
        if (read_messages.length) {
            const past_messages = convertMessages(read_messages[0].messages)
            const new_messages = [...past_messages ,...messages]
            await updateMessage(supabaseUrl, supabaseKey, thread_id, new_messages)
            return
        }
        const content = messages[messages.length - 1].content
        const prompt = PromptTemplate.fromTemplate(
            `contentを要約してタイトルをつけてください。
            以下例示のとおり、余計なフィラーは省いてタイトルのみ出力しなさい。
            
            content例：　こんにちは、今日はどのようなお手伝いができますか？
            出力例：　支援の提案

            {content}`
        )
        const parser = new StringOutputParser()
        const chain = prompt.pipe(llm).pipe(parser)
        const title = await chain.invoke({ content: content })
        await insertMessage(supabaseUrl, supabaseKey, thread_id, messages, title)
        return
    }

    const workflow = new StateGraph(MessagesAnnotation)
        .addNode('callmodel', callModel)
        .addNode('tools', toolNode)
        .addNode('insertMessageToDB', insertMessageToDB)
        .addEdge(START, 'callmodel')
        .addConditionalEdges("callmodel", shouldContinue, ["tools", "insertMessageToDB"])
        // .addEdge('callmodel', 'insertMessageToDB')
        .addEdge('tools', 'callmodel')
        .addEdge('insertMessageToDB', END)

    const memory = new MemorySaver()
    const app = workflow.compile({ checkpointer: memory })
    return app
    // const config = { configurable: { thread_id: thread_id } };
    // const result = await app.stream(
    //     {messages: [new HumanMessage("東京の観光地を教えて")]},
    //     {streamMode: "messages", ...config} // streamMode: "messages" to get the messages,
    // )
    // for await ( const chunk of result ) {
    //     console.log(chunk[0].content)
    //     // return chunk
    // }
    // return result
}