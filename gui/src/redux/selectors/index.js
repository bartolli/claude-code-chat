import { createSelector } from "@reduxjs/toolkit";
export const selectSlashCommandComboBoxInputs = createSelector([(state) => state.config.config.slashCommands], (slashCommands) => {
    return (slashCommands?.map((cmd) => {
        return {
            title: cmd.name,
            description: cmd.description,
            type: "slashCommand",
            content: cmd.prompt,
        };
    }) || []);
});
export const selectSlashCommands = createSelector([(state) => state.config.config.slashCommands], (slashCommands) => {
    return slashCommands || [];
});
export const selectSubmenuContextProviders = createSelector([(state) => state.config.config.contextProviders], (providers) => {
    return providers?.filter((desc) => desc.type === "submenu") || [];
});
export const selectDefaultContextProviders = createSelector([(state) => state.config.config.experimental?.defaultContext], (defaultProviders) => {
    return defaultProviders ?? [];
});
export const selectUseActiveFile = createSelector([(state) => state.config.config.experimental?.defaultContext], (defaultContext) => defaultContext?.includes("activeFile"));
//# sourceMappingURL=index.js.map