import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import {
    START,
    END,
    Annotation,
    MessagesAnnotation,
    StateGraph,
  } from "@langchain/langgraph";

export async function getAiResponse(apikey: string, input: string) {
    const llm = new ChatAnthropic({
        model: "claude-3-5-haiku-20241022",
        apiKey: apikey,
        temperature: 0.7,
    })
    const prompt = ChatPromptTemplate.fromMessages([
        ["user", input]
    ])
    const parser = new StringOutputParser()
    const chain = prompt.pipe(llm).pipe(parser)
    const result = await chain.invoke({})
    return { content: result }
}

export async function getAiStream(apikey: string) {
    const llm = new ChatAnthropic({
        model: "claude-3-5-haiku-20241022",
        apiKey: apikey,
        temperature: 0.7,
    })
    const prompt = ChatPromptTemplate.fromMessages([
        ["user", "What is the capital of France?"]
    ])
    const parser = new StringOutputParser()
    const chain = prompt.pipe(llm).pipe(parser)
    const result = await chain.stream({})
    for await (const chunk of result) {
        console.log(chunk)
        return chunk
    }
}

export async function agent(apikey: string) {
    const getWeather = tool((location) => {
            return `${location.location} is Sunny`
        }, {
            name: "get_weather",
            description: "Call to get the current weather in anywhere.",
            schema: z.object({
                location: z.string().describe("Location to get the weather for.")
            })
        }
    )

    const tools = [getWeather]
    const toolNode = new ToolNode(tools)

    const llm = new ChatOpenAI({
        model: "gpt-4o-mini-2024-07-18",
        apiKey: apikey,
        temperature: 0.7,
    }).bindTools(tools)

    async function callModel(state: typeof MessagesAnnotation.State) {
        const response = await llm.invoke(state.messages)
        return { messages: [response] }
    }

    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
            return "tools";
        }
        return END
    }

    const workflow = new StateGraph(MessagesAnnotation)
        .addNode('callmodel', callModel)
        .addNode("tools", toolNode)
        .addEdge(START, 'callmodel')
        .addConditionalEdges("callmodel", shouldContinue, ["tools", END])
        .addEdge('callmodel', END)

    const app = workflow.compile()
    return app
    // const result = await app.invoke({messages: [new HumanMessage("お腹が空きました" )]})
    // return result
}