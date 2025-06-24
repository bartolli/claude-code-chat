export function findCurrentToolCall(chatHistory) {
    return chatHistory[chatHistory.length - 1]?.toolCallState;
}
export function findToolCall(chatHistory, toolCallId) {
    return chatHistory.find((item) => item.toolCallState?.toolCallId === toolCallId)?.toolCallState;
}
//# sourceMappingURL=index.js.map