import { createSlice } from "@reduxjs/toolkit";
const initialState = {
    indexing: {
        statuses: {},
        hiddenChatPeekTypes: {
            docs: false,
        },
    },
};
export const indexingSlice = createSlice({
    name: "indexing",
    initialState,
    reducers: {
        updateIndexingStatus: (state, { payload }) => {
            state.indexing.statuses = {
                ...state.indexing.statuses,
                [payload.id]: payload,
            };
            // This check is so that if all indexing is stopped for e.g. docs
            // The next time docs indexing starts the peek will show again
            const indexingThisType = Object.values(state.indexing.statuses).filter((status) => status.type === payload.type && status.status === "indexing");
            if (indexingThisType.length === 0) {
                state.indexing.hiddenChatPeekTypes = {
                    ...state.indexing.hiddenChatPeekTypes,
                    [payload.type]: false,
                };
            }
        },
        setIndexingChatPeekHidden: (state, { payload, }) => {
            state.indexing.hiddenChatPeekTypes = {
                ...state.indexing.hiddenChatPeekTypes,
                [payload.type]: payload.hidden,
            };
        },
    },
});
export const { updateIndexingStatus, setIndexingChatPeekHidden } = indexingSlice.actions;
export default indexingSlice.reducer;
//# sourceMappingURL=indexingSlice.js.map