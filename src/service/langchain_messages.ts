import { BaseMessage, HumanMessage, AIMessage, AIMessageChunk, ToolMessage } from "@langchain/core/messages";

export function convertMessages(ary: object[] = []): BaseMessage[] {
    const messages = ary.map((item) => {
        if (item.id.includes("HumanMessage")) {
            return new HumanMessage({
                content: item.kwargs.content,
                additional_kwargs: item.kwargs.additional_kwargs,
                response_metadata: item.kwargs.response_metadata,
            })
        } else if (item.id.includes("AIMessageChunk")) {
            return new AIMessageChunk({
                content: item.kwargs.content,
                additional_kwargs: item.kwargs.additional_kwargs,
                response_metadata: item.kwargs.response_metadata,
                tool_calls: item.kwargs.tool_calls,
                tool_call_chunks: item.kwargs.tool_call_chunks,
                invalid_tool_calls: item.kwargs.invalid_tool_calls,
            })
        } else if (item.id.includes("AIMessage")) {
            return new AIMessage(item.kwargs.content)
        } else {
            return new ToolMessage({
                content: item.kwargs.content,
                additional_kwargs: item.kwargs.additional_kwargs,
                response_metadata: item.kwargs.response_metadata,
                tool_call_id: item.kwargs.tool_call_id,
            })
        }
    })
    console.log("messages", messages)
    return messages
}