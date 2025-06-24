import { createSlice } from "@reduxjs/toolkit";
import { BUILT_IN_GROUP_NAME, BuiltInToolNames } from "core/tools/builtIn";
import { defaultOnboardingCardState, } from "../../components/OnboardingCard";
import { getLocalStorage, LocalStorageKey } from "../../util/localStorage";
export const DEFAULT_TOOL_SETTING = "allowedWithPermission";
export const DEFAULT_RULE_SETTING = "on";
export const uiSlice = createSlice({
    name: "ui",
    initialState: {
        showDialog: false,
        dialogMessage: "",
        dialogEntryOn: false,
        onboardingCard: defaultOnboardingCardState,
        isExploreDialogOpen: getLocalStorage(LocalStorageKey.IsExploreDialogOpen),
        hasDismissedExploreDialog: getLocalStorage(LocalStorageKey.HasDismissedExploreDialog),
        shouldAddFileForEditing: false,
        ttsActive: false,
        toolSettings: {
            [BuiltInToolNames.ReadFile]: "allowedWithoutPermission",
            [BuiltInToolNames.EditExistingFile]: "allowedWithPermission",
            [BuiltInToolNames.CreateNewFile]: "allowedWithPermission",
            [BuiltInToolNames.RunTerminalCommand]: "allowedWithPermission",
            [BuiltInToolNames.GrepSearch]: "allowedWithoutPermission",
            [BuiltInToolNames.FileGlobSearch]: "allowedWithoutPermission",
            [BuiltInToolNames.SearchWeb]: "allowedWithoutPermission",
            [BuiltInToolNames.FetchUrlContent]: "allowedWithPermission",
            [BuiltInToolNames.ViewDiff]: "allowedWithoutPermission",
            [BuiltInToolNames.LSTool]: "allowedWithoutPermission",
            [BuiltInToolNames.CreateRuleBlock]: "allowedWithPermission",
            [BuiltInToolNames.RequestRule]: "disabled",
        },
        toolGroupSettings: {
            [BUILT_IN_GROUP_NAME]: "include",
        },
        ruleSettings: {},
    },
    reducers: {
        setOnboardingCard: (state, action) => {
            state.onboardingCard = { ...state.onboardingCard, ...action.payload };
        },
        setDialogMessage: (state, action) => {
            state.dialogMessage = action.payload;
        },
        setDialogEntryOn: (state, action) => {
            state.dialogEntryOn = action.payload;
        },
        setShowDialog: (state, action) => {
            state.showDialog = action.payload;
        },
        setIsExploreDialogOpen: (state, action) => {
            state.isExploreDialogOpen = action.payload;
        },
        setHasDismissedExploreDialog: (state, action) => {
            state.hasDismissedExploreDialog = action.payload;
        },
        // Tools
        addTool: (state, action) => {
            state.toolSettings[action.payload.function.name] =
                "allowedWithPermission";
        },
        toggleToolSetting: (state, action) => {
            const setting = state.toolSettings[action.payload];
            switch (setting) {
                case "allowedWithPermission":
                    state.toolSettings[action.payload] = "allowedWithoutPermission";
                    break;
                case "allowedWithoutPermission":
                    state.toolSettings[action.payload] = "disabled";
                    break;
                case "disabled":
                    state.toolSettings[action.payload] = "allowedWithPermission";
                    break;
                default:
                    state.toolSettings[action.payload] = DEFAULT_TOOL_SETTING;
                    break;
            }
        },
        toggleToolGroupSetting: (state, action) => {
            const setting = state.toolGroupSettings[action.payload] ?? "include";
            if (setting === "include") {
                state.toolGroupSettings[action.payload] = "exclude";
            }
            else {
                state.toolGroupSettings[action.payload] = "include";
            }
        },
        // Rules
        addRule: (state, action) => {
            state.ruleSettings[action.payload.name] = DEFAULT_RULE_SETTING;
        },
        toggleRuleSetting: (state, action) => {
            const setting = state.ruleSettings[action.payload];
            switch (setting) {
                case "on":
                    state.ruleSettings[action.payload] = "off";
                    break;
                case "off":
                    state.ruleSettings[action.payload] = "on";
                    break;
                default:
                    state.ruleSettings[action.payload] = DEFAULT_RULE_SETTING;
                    break;
            }
        },
        setTTSActive: (state, { payload }) => {
            state.ttsActive = payload;
        },
    },
});
export const { setOnboardingCard, setDialogMessage, setDialogEntryOn, setShowDialog, setIsExploreDialogOpen, setHasDismissedExploreDialog, toggleToolSetting, toggleToolGroupSetting, addTool, addRule, toggleRuleSetting, setTTSActive, } = uiSlice.actions;
export default uiSlice.reducer;
//# sourceMappingURL=uiSlice.js.map