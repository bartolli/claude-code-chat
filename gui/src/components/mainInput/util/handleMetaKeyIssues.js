import { getPlatform, isWebEnvironment } from "../../../util";
import { CodeBlock } from "../TipTapEditor/extensions";
const isWebEnv = isWebEnvironment();
/**
 * This handles various keypress issues when OSR is enabled
 */
export const handleJetBrainsOSRMetaKeyIssues = (e, editor) => {
    const selection = window.getSelection();
    const alter = e.shiftKey ? "extend" : "move";
    const platform = getPlatform();
    const handlers = {
        Backspace: () => handleJetBrainsMetaBackspace(editor),
        ArrowLeft: () => selection?.modify(alter, "backward", platform === "mac" ? "lineboundary" : "word"),
        ArrowRight: () => selection?.modify(alter, "forward", platform === "mac" ? "lineboundary" : "word"),
        ArrowDown: () => selection?.modify(alter, "forward", "documentboundary"),
        ArrowUp: () => {
            selection?.modify(alter, "backward", "documentboundary");
        },
    };
    if (e.key in handlers) {
        e.stopPropagation();
        e.preventDefault();
        handlers[e.key]();
    }
};
/**
 * This handles reported issues with cut/copy/paste in .ipynb files in VSC
 */
export const handleVSCMetaKeyIssues = async (e, editor) => {
    const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
    const handlers = {
        x: () => handleCutOperation(text, editor),
        c: () => handleCopyOperation(text),
        v: () => handlePasteOperation(editor),
        z: () => {
            return e.shiftKey
                ? handleRedoOperation(editor)
                : handleUndoOperation(editor);
        },
    };
    if (e.key in handlers) {
        e.stopPropagation();
        e.preventDefault();
        await handlers[e.key]();
    }
};
const deleteSingleWord = (editor) => {
    const textContent = editor.state.doc.resolve(editor.state.selection.from).parent.textContent ??
        "";
    const cursorPosition = editor.state.selection.from;
    const nodeStartPosition = editor.state.doc.resolve(cursorPosition).start();
    const textBeforeCursor = textContent.slice(0, cursorPosition - nodeStartPosition);
    // Match the last word including any trailing whitespace
    const lastWordMatch = textBeforeCursor.match(/\S+\s*$/);
    if (lastWordMatch) {
        const lastWordWithSpace = lastWordMatch[0];
        editor.commands.deleteRange({
            from: editor.state.selection.from - lastWordWithSpace.length,
            to: editor.state.selection.from,
        });
    }
};
export const handleJetBrainsMetaBackspace = (editor) => {
    const { doc } = editor.state;
    for (let i = doc.content.childCount - 1; i >= 0; i--) {
        const node = doc.content.child(i);
        if (node.type.name === CodeBlock.name) {
            continue;
        }
        // For Linux/Windows, only delete the word to the left of the cursor
        const platform = getPlatform();
        if (platform !== "mac") {
            deleteSingleWord(editor);
            break;
        }
        editor.commands.deleteNode(node.type.name);
    }
    // Add an empty string so the user can keep typing
    editor.commands.createParagraphNear();
};
export const handleCutOperation = async (text, editor) => {
    if (isWebEnv) {
        await navigator.clipboard.writeText(text);
        editor.commands.deleteSelection();
    }
    else {
        document.execCommand("cut");
    }
};
export const handleCopyOperation = async (text) => {
    if (isWebEnv) {
        await navigator.clipboard.writeText(text);
    }
    else {
        document.execCommand("copy");
    }
};
export const handlePasteOperation = async (editor) => {
    if (isWebEnv) {
        const clipboardText = await navigator.clipboard.readText();
        editor.commands.insertContent(clipboardText);
    }
    else {
        document.execCommand("paste");
    }
};
export const handleUndoOperation = async (editor) => {
    editor.commands.undo();
};
export const handleRedoOperation = async (editor) => {
    editor.commands.redo();
};
//# sourceMappingURL=handleMetaKeyIssues.js.map