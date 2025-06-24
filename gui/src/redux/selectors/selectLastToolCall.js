import { createSelector } from "@reduxjs/toolkit";
export const selectLastToolCall = createSelector([(store) => store.session.history], (history) => {
    let lastToolCallHistoryItem = null;
    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (item.message.role === "assistant" && item.message.toolCalls?.length) {
            lastToolCallHistoryItem = item;
            break;
        }
    }
    return lastToolCallHistoryItem?.toolCallState ?? null;
});
//# sourceMappingURL=selectLastToolCall.js.map