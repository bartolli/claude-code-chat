import { createSelector } from "@reduxjs/toolkit";
import { findCurrentToolCall } from "../util";
export const selectCurrentToolCall = createSelector((store) => store.session.history, (history) => {
    return findCurrentToolCall(history);
});
export const selectCurrentToolCallApplyState = createSelector([
    (store) => store.session.history,
    (store) => store.session.codeBlockApplyStates,
], (history, applyStates) => {
    const currentToolCall = findCurrentToolCall(history);
    if (!currentToolCall) {
        return undefined;
    }
    return applyStates.states.find((state) => state.toolCallId && state.toolCallId === currentToolCall.toolCallId);
});
//# sourceMappingURL=selectCurrentToolCall.js.map