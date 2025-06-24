import { combineReducers, configureStore, } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import { createMigrate, persistReducer, persistStore, } from "redux-persist";
import { createFilter } from "redux-persist-transform-filter";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";
import storage from "redux-persist/lib/storage";
import { IdeMessenger } from "../context/IdeMessenger";
import configReducer from "./slices/configSlice";
import editModeStateReducer from "./slices/editState";
import indexingReducer from "./slices/indexingSlice";
import { profilesReducer } from "./slices/profilesSlice";
import sessionReducer from "./slices/sessionSlice";
import tabsReducer from "./slices/tabsSlice";
import uiReducer from "./slices/uiSlice";
const rootReducer = combineReducers({
    session: sessionReducer,
    ui: uiReducer,
    editModeState: editModeStateReducer,
    config: configReducer,
    indexing: indexingReducer,
    tabs: tabsReducer,
    profiles: profilesReducer,
});
const saveSubsetFilters = [
    createFilter("session", [
        "history",
        "id",
        "lastSessionId",
        "title",
        // Persist edit mode in case closes in middle
        "mode",
        // higher risk to persist
        // codeBlockApplyStates
        // symbols
    ]),
    createFilter("editModeState", [
        "returnToMode",
        "lastNonEditSessionWasEmpty",
        "codeToEdit",
    ]),
    createFilter("config", ["defaultModelTitle"]),
    createFilter("ui", ["toolSettings", "toolGroupSettings", "ruleSettings"]),
    createFilter("indexing", []),
    createFilter("tabs", ["tabs"]),
    createFilter("profiles", [
        "preferencesByProfileId",
        "selectedProfileId",
        "selectedOrganizationId",
        "organizations",
    ]),
];
const migrations = {
    "0": (state) => {
        const oldState = state;
        return {
            config: {
                defaultModelTitle: oldState?.state?.defaultModelTitle ?? undefined,
            },
            session: {
                history: oldState?.state?.history ?? [],
                id: oldState?.state?.sessionId ?? "",
            },
            tabs: {
                tabs: [
                    {
                        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
                        title: "Chat 1",
                        isActive: true,
                    },
                ],
            },
            _persist: oldState?._persist,
        };
    },
};
const persistConfig = {
    version: 1,
    key: "root",
    storage,
    transforms: [...saveSubsetFilters],
    stateReconciler: autoMergeLevel2,
    migrate: createMigrate(migrations, { debug: false }),
};
const persistedReducer = persistReducer(persistConfig, rootReducer);
export function setupStore(options) {
    const ideMessenger = options.ideMessenger ?? new IdeMessenger();
    const logger = createLogger({
        // Customize logger options if needed
        collapsed: true, // Collapse console groups by default
        timestamp: false, // Remove timestamps from log
        diff: true, // Show diff between states
    });
    return configureStore({
        // persistedReducer causes type errors with async thunks
        reducer: persistedReducer,
        // reducer: rootReducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({
            serializableCheck: false,
            thunk: {
                extraArgument: {
                    ideMessenger,
                },
            },
        }),
        // This can be uncommented to get detailed Redux logs
        // .concat(logger),
    });
}
export const store = setupStore({});
export const persistor = persistStore(store);
//# sourceMappingURL=store.js.map