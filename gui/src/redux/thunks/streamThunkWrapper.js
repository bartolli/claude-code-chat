import { createAsyncThunk } from "@reduxjs/toolkit";
import StreamErrorDialog from "../../pages/gui/StreamError";
import { setInactive } from "../slices/sessionSlice";
import { setDialogMessage, setShowDialog } from "../slices/uiSlice";
import { cancelStream } from "./cancelStream";
import { saveCurrentSession } from "./session";
export const streamThunkWrapper = createAsyncThunk("chat/streamWrapper", async (runStream, { dispatch, extra, getState }) => {
    try {
        await runStream();
        const state = getState();
        if (state.session.mode === "chat" || state.session.mode === "agent") {
            await dispatch(saveCurrentSession({
                openNewSession: false,
                generateTitle: true,
            }));
        }
        dispatch(setInactive());
    }
    catch (e) {
        dispatch(cancelStream());
        dispatch(setDialogMessage(<StreamErrorDialog error={e}/>));
        dispatch(setShowDialog(true));
    }
});
//# sourceMappingURL=streamThunkWrapper.js.map