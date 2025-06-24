import { createSelector } from "@reduxjs/toolkit";
export const selectActiveTools = createSelector([
    (store) => store.session.mode,
    (store) => store.config.config.tools,
    (store) => store.ui.toolSettings,
    (store) => store.ui.toolGroupSettings,
], (mode, tools, policies, groupPolicies) => {
    if (mode === "chat") {
        return [];
    }
    else if (mode === "agent") {
        return tools.filter((tool) => policies[tool.function.name] !== "disabled" &&
            groupPolicies[tool.group] !== "exclude");
    }
    else {
        return [];
    }
});
//# sourceMappingURL=selectActiveTools.js.map