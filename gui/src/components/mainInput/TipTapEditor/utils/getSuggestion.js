import { ReactRenderer } from "@tiptap/react";
import tippy from "tippy.js";
import AtMentionDropdown from "../../AtMentionDropdown";
import { TIPPY_DIV_ID } from "../TipTapEditor";
import { SlashCommand } from "../extensions";
function getSuggestion(items, enterSubmenu = (editor) => { }, onClose = () => { }, onOpen = () => { }) {
    return {
        items,
        allowSpaces: true,
        render: () => {
            let component;
            let popup;
            const onExit = () => {
                popup?.[0]?.destroy();
                component?.destroy();
                onClose();
            };
            return {
                onStart: (props) => {
                    component = new ReactRenderer(AtMentionDropdown, {
                        props: { ...props, enterSubmenu, onClose: onExit },
                        editor: props.editor,
                    });
                    if (!props.clientRect) {
                        console.log("no client rect");
                        return;
                    }
                    const container = document.getElementById(TIPPY_DIV_ID);
                    if (!container) {
                        console.log("no container");
                        return;
                    }
                    popup = tippy("body", {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => container,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: "manual",
                        placement: "bottom-start",
                        maxWidth: `${window.innerWidth - 24}px`,
                    });
                    onOpen();
                },
                onUpdate(props) {
                    component.updateProps({ ...props, enterSubmenu });
                    if (!props.clientRect) {
                        return;
                    }
                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect,
                    });
                },
                onKeyDown(props) {
                    if (props.event.key === "Escape") {
                        popup[0].hide();
                        return true;
                    }
                    return component.ref?.onKeyDown(props);
                },
                onExit,
            };
        },
    };
}
function getSubActionsForSubmenuItem(item, ideMessenger) {
    if (item.providerTitle === "docs") {
        return [
            {
                label: "Open in new tab",
                icon: "trash",
                action: () => {
                    ideMessenger.post("context/removeDocs", { startUrl: item.id });
                },
            },
        ];
    }
    return undefined;
}
export function getContextProviderDropdownOptions(availableContextProvidersRef, getSubmenuContextItemsRef, enterSubmenu, onClose, onOpen, inSubmenu, ideMessenger) {
    const items = async ({ query }) => {
        if (inSubmenu.current) {
            const results = getSubmenuContextItemsRef.current(inSubmenu.current, query);
            return results.map((result) => {
                return {
                    ...result,
                    label: result.title,
                    type: inSubmenu.current,
                    query: result.id,
                    subActions: getSubActionsForSubmenuItem(result, ideMessenger),
                };
            });
        }
        const contextProviderMatches = availableContextProvidersRef.current
            ?.filter((provider) => provider.title.toLowerCase().startsWith(query.toLowerCase()) ||
            provider.displayTitle.toLowerCase().startsWith(query.toLowerCase()))
            .map((provider) => ({
            name: provider.displayTitle,
            description: provider.description,
            id: provider.title,
            title: provider.displayTitle,
            label: provider.displayTitle,
            renderInlineAs: provider.renderInlineAs,
            type: "contextProvider",
            contextProvider: provider,
        }))
            .sort((c, _) => (c.id === "file" ? -1 : 1)) || [];
        if (contextProviderMatches.length) {
            contextProviderMatches.push({
                title: "Add more context providers",
                type: "action",
                action: () => {
                    ideMessenger.post("openUrl", "https://docs.continue.dev/customization/context-providers#built-in-context-providers");
                },
                description: "",
            });
            return contextProviderMatches;
        }
        // No provider matches -> search all providers
        const results = getSubmenuContextItemsRef.current(undefined, query);
        return results.map((result) => {
            return {
                ...result,
                label: result.title,
                type: result.providerTitle,
                query: result.id,
                icon: result.icon,
            };
        });
    };
    return getSuggestion(items, enterSubmenu, onClose, onOpen);
}
export function getSlashCommandDropdownOptions(availableSlashCommandsRef, onClose, onOpen, ideMessenger, dispatch, inputId) {
    const items = async ({ query }) => {
        const options = [...availableSlashCommandsRef.current];
        const filteredCommands = query.length > 0
            ? options.filter((slashCommand) => {
                const sc = slashCommand.title.toLowerCase();
                const iv = query.toLowerCase();
                return sc.startsWith(iv);
            })
            : options;
        const commandItems = (filteredCommands || []).map((provider) => ({
            name: provider.title,
            description: provider.description,
            id: provider.title,
            title: provider.title,
            label: provider.title,
            type: (provider.type ?? SlashCommand.name),
            content: provider.content,
            action: provider.action,
        }));
        if (query.length === 0 && commandItems.length === 0) {
            commandItems.push({
                title: "Explore prompts",
                type: "action",
                action: () => ideMessenger.post("openUrl", "https://hub.continue.dev/explore/prompts"),
                description: "",
                name: "",
                id: "",
                label: "",
                content: "",
            });
        }
        return commandItems;
    };
    return getSuggestion(items, undefined, onClose, onOpen);
}
//# sourceMappingURL=getSuggestion.js.map