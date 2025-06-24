import { createSlice } from "@reduxjs/toolkit";
import { EDIT_MODE_STREAM_ID } from "core/edit/constants";
export const INITIAL_EDIT_APPLY_STATE = {
    streamId: EDIT_MODE_STREAM_ID,
    status: "not-started",
};
const initialState = {
    applyState: INITIAL_EDIT_APPLY_STATE,
    codeToEdit: [],
    returnToMode: "chat",
    lastNonEditSessionWasEmpty: false,
    previousModeEditorContent: undefined,
};
export const editStateSlice = createSlice({
    name: "editState",
    initialState,
    reducers: {
        setReturnToModeAfterEdit: (state, { payload }) => {
            state.returnToMode = payload;
        },
        updateEditStateApplyState: (state, { payload }) => {
            state.applyState = {
                ...state.applyState,
                ...payload,
            };
        },
        setCodeToEdit: (state, { payload, }) => {
            state.codeToEdit = Array.isArray(payload.codeToEdit)
                ? payload.codeToEdit
                : [payload.codeToEdit];
        },
        clearCodeToEdit: (state) => {
            state.codeToEdit = [];
        },
        setLastNonEditSessionEmpty: (state, { payload }) => {
            state.lastNonEditSessionWasEmpty = payload;
        },
        setPreviousModeEditorContent: (state, { payload }) => {
            state.previousModeEditorContent = payload;
        },
    },
    selectors: {},
});
export const { setReturnToModeAfterEdit, clearCodeToEdit, setCodeToEdit, updateEditStateApplyState, setLastNonEditSessionEmpty, setPreviousModeEditorContent, } = editStateSlice.actions;
export default editStateSlice.reducer;
//# sourceMappingURL=editState.js.map