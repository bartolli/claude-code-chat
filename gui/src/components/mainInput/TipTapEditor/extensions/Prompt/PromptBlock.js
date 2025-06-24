import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MAIN_EDITOR_INPUT_ID } from "../../../../../pages/gui/Chat";
import { PromptBlockPreview } from "./PromptBlockPreview";
/**
 * Extension for adding prompt blocks to the TipTap editor
 */
export const PromptBlock = Node.create({
    name: "prompt-block",
    group: "block",
    content: "inline*",
    addOptions() {
        return {
            HTMLAttributes: {
                class: "prompt-block",
            },
        };
    },
    addAttributes() {
        return {
            item: {
                default: null,
            },
            inputId: {
                default: null,
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: "prompt-block",
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ["prompt-block", mergeAttributes(HTMLAttributes), 0];
    },
    addNodeView() {
        return ReactNodeViewRenderer(PromptBlockPreview);
    },
    addCommands() {
        return {
            insertPrompt: (prompt) => ({ chain }) => {
                const item = {
                    content: prompt.prompt ?? "",
                    name: prompt.name,
                    description: prompt.description,
                    id: {
                        providerTitle: "prompt",
                        itemId: prompt.name,
                    },
                };
                return chain()
                    .clearPrompt()
                    .insertContentAt(0, {
                    type: this.name,
                    attrs: {
                        item,
                        inputId: MAIN_EDITOR_INPUT_ID,
                    },
                })
                    .focus("end")
                    .run();
            },
            // TODO: This could probably be greatly simplified with something along the lines of
            // `editor.commands.deleteNode(this.name)`, but was unable to get it working
            clearPrompt: () => ({ state, commands }) => {
                // Find all prompt-block nodes in the document
                const promptNodes = [];
                state.doc.descendants((node, pos) => {
                    if (node.type.name === this.name) {
                        promptNodes.push({ pos, node });
                        return false; // Don't descend into this node
                    }
                    return true;
                });
                // Delete all found prompt blocks
                // We process them in reverse order so that deleting one doesn't affect the position of others
                for (let i = promptNodes.length - 1; i >= 0; i--) {
                    const { pos, node } = promptNodes[i];
                    commands.deleteRange({ from: pos, to: pos + node.nodeSize });
                }
                // Return true if we deleted any nodes
                return promptNodes.length > 0;
            },
        };
    },
});
//# sourceMappingURL=PromptBlock.js.map