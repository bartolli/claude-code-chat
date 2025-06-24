import { createAsyncThunk } from "@reduxjs/toolkit";
import { resetNextCodeBlockToApplyIndex } from "../slices/sessionSlice";
export const resetStateForNewMessage = createAsyncThunk("chat/resetStateForNewMessage", async (_, { dispatch }) => {
    dispatch(resetNextCodeBlockToApplyIndex());
});
//# sourceMappingURL=resetStateForNewMessage.js.map