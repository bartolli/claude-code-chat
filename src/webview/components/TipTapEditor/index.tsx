import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import styled from 'styled-components';
import { 
    vscInputBackground, 
    vscInputBorder, 
    vscForeground,
    defaultBorderRadius,
    vscCommandCenterInactiveBorder,
    vscCommandCenterActiveBorder 
} from '../styled';
import { InputToolbar } from './InputToolbar';
import '../../styles/components/TipTapEditor.css';

const EditorContainer = styled.div<{ isFocused: boolean; hasLump?: boolean; planMode?: boolean }>`
    background-color: ${vscInputBackground};
    border: 1px solid ${props => props.planMode ? 'var(--vscode-editorInfo-border)' : props.isFocused ? vscCommandCenterActiveBorder : vscCommandCenterInactiveBorder};
    border-radius: ${props => props.hasLump ? `5px 5px ${defaultBorderRadius} ${defaultBorderRadius}` : defaultBorderRadius};
    display: flex;
    flex-direction: column;
    height: 90px;
    max-height: 70vh;
    transition: all 0.15s ease-in-out;
    color: ${vscForeground};
    font-size: var(--vscode-font-size);
    font-family: var(--vscode-font-family);
    margin: ${props => props.hasLump ? '0px 4px 4px 4px' : '0'};

    .ProseMirror {
        outline: none;
        min-height: 60px;
        
        p {
            margin: 0;
            line-height: 1.5;
        }

        /* Placeholder styling from GUI */
        p.is-editor-empty:first-child::before {
            color: var(--vscode-input-placeholderForeground);
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
        }
    }

    /* Mention styling */
    .mention {
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 3px;
        padding: 0.05em 0.15em;
        font-size: 0.9em;
    }

    /* Image styling */
    img {
        max-width: 96%;
        height: auto;
        border-radius: ${defaultBorderRadius};
        margin: 8px 0;
        
        &.ProseMirror-selectednode {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
    }
`;

const EditorContentWrapper = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    padding-bottom: 4px;
`;

interface TipTapEditorProps {
    placeholder?: string;
    onSubmit?: (content: string) => void;
    onUpdate?: (editor: Editor) => void;
    onStop?: () => void;
    autoFocus?: boolean;
    editable?: boolean;
    isProcessing?: boolean;
    onAddContext?: () => void;
    tokenCount?: number;
    onFocus?: () => void;
    onBlur?: () => void;
    models?: Array<{ id: string; name: string }>;
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
    hasLump?: boolean;
    planMode?: boolean;
    onPlanModeChange?: (active: boolean) => void;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({ 
    placeholder = "Ask Claude anything...",
    onSubmit,
    onUpdate,
    onStop,
    autoFocus = true,
    editable = true,
    isProcessing = false,
    onAddContext,
    tokenCount = 0,
    onFocus,
    onBlur,
    models,
    selectedModelId,
    onModelChange,
    hasLump = false,
    planMode = false,
    onPlanModeChange
}) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder,
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention',
                },
                suggestion: {
                    // Simple suggestion for demo
                    items: ({ query }) => {
                        return ['claude', 'help', 'code', 'explain']
                            .filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
                            .slice(0, 5);
                    },
                    render: () => {
                        let component: any;
                        let popup: any;
                        
                        return {
                            onStart: (props: any) => {
                                // Simple dropdown implementation
                                console.log('Mention started', props);
                            },
                            onUpdate: (props: any) => {
                                console.log('Mention updated', props);
                            },
                            onKeyDown: (props: any) => {
                                if (props.event.key === 'Escape') {
                                    props.event.stopPropagation();
                                    return true;
                                }
                                return false;
                            },
                            onExit: () => {
                                console.log('Mention exited');
                            },
                        };
                    },
                },
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
        ],
        content: '',
        autofocus: autoFocus,
        editable,
        editorProps: {
            attributes: {
                class: 'tiptap-editor',
            },
            handlePaste: (view, event) => {
                // Prevent default paste handling for images
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (const item of items) {
                    if (item.type.indexOf('image') === 0) {
                        return true; // Let our custom handler deal with it
                    }
                }
                return false;
            },
        },
        onFocus: () => {
            setIsFocused(true);
            onFocus?.();
        },
        onBlur: () => {
            setIsFocused(false);
            onBlur?.();
        },
        onUpdate: ({ editor }) => {
            if (onUpdate) {
                onUpdate(editor);
            }
        },
    });

    // Handle Enter key for submission
    useEffect(() => {
        if (!editor || !onSubmit) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                const content = editor.getText();
                if (content.trim()) {
                    onSubmit(content);
                    editor.commands.clearContent();
                }
            }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener('keydown', handleKeyDown);

        return () => {
            editorElement.removeEventListener('keydown', handleKeyDown);
        };
    }, [editor, onSubmit]);
    
    // Update editable state when prop changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);

    // Handle paste for images
    useEffect(() => {
        if (!editor) return;

        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.indexOf('image') === 0) {
                    event.preventDefault();
                    const blob = item.getAsFile();
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64 = e.target?.result as string;
                            editor.chain().focus().setImage({ src: base64 }).run();
                        };
                        reader.readAsDataURL(blob);
                    }
                }
            }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener('paste', handlePaste);

        return () => {
            editorElement.removeEventListener('paste', handlePaste);
        };
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <EditorContainer isFocused={isFocused} hasLump={hasLump} planMode={planMode}>
            <EditorContentWrapper>
                <EditorContent editor={editor} />
            </EditorContentWrapper>
            <InputToolbar
                onSubmit={() => {
                    if (editor && !editable) return;
                    const text = editor.getText();
                    if (text.trim() && onSubmit) {
                        onSubmit(text);
                        editor.commands.clearContent();
                    }
                }}
                onAddContext={onAddContext}
                onStop={onStop}
                canSubmit={editor ? editor.getText().trim().length > 0 && editable : false}
                isProcessing={isProcessing}
                tokenCount={tokenCount}
                models={models}
                selectedModelId={selectedModelId}
                onModelChange={onModelChange}
                planMode={planMode}
                onPlanModeChange={onPlanModeChange}
            />
        </EditorContainer>
    );
};