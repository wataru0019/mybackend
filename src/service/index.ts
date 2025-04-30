import { ChatAnthropic } from '@langchain/anthropic'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

export async function getAiResponse(apikey: string) {
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
    const result = await chain.invoke({})
    return { content: result }
}