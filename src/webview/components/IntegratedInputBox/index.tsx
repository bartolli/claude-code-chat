import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { TipTapEditor } from '../TipTapEditor';
import { Editor } from '@tiptap/react';
import { IIdeMessenger } from '../../../protocol/IdeMessenger';
import { ChevronDownIcon, PlusIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { ModelOption as ModelOptionType } from '../ModelSelector';

const InputWrapper = styled.div`
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;

    &:focus-within {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
    }
`;

const InputHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-bottom: 1px solid var(--vscode-sideBar-border, #2a2a2a);
    gap: 8px;
    background: var(--vscode-input-background);
`;

const ModelSelectorButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border: none;
    background: var(--vscode-button-secondaryBackground, #303030);
    color: var(--vscode-button-secondaryForeground, #e6e6e6);
    border-radius: 5px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    max-width: 200px;

    &:hover {
        background: var(--vscode-button-secondaryHoverBackground, #3a3a3a);
    }

    svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
    }

    span {
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const EditorWrapper = styled.div`
    min-height: 60px;
    max-height: 300px;
    overflow-y: auto;
    padding: 8px 12px;
`;

const InputFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-top: 1px solid var(--vscode-sideBar-border, #2a2a2a);
    background: var(--vscode-input-background);
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #b3b3b3);
`;

const FooterLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const FooterRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ActionButton = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border: none;
    background: transparent;
    color: var(--vscode-descriptionForeground, #b3b3b3);
    cursor: pointer;
    border-radius: 3px;
    font-size: 11px;
    transition: all 0.2s ease;

    &:hover {
        background: var(--vscode-list-hoverBackground, #383838);
        color: var(--vscode-foreground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 13px;
        height: 13px;
    }
`;

const TokenCount = styled.span`
    color: var(--vscode-descriptionForeground, #b3b3b3);
`;

const SubmitHint = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const ModelDropdown = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: var(--vscode-commandCenter-background, #252525);
    border: 1px solid var(--vscode-commandCenter-inactiveBorder, #555555);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
    z-index: 1000;
    min-width: 200px;
    max-width: 300px;
`;

const ModelOption = styled.button`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: var(--vscode-commandCenter-foreground, #e6e6e6);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: var(--vscode-list-hoverBackground, #383838);
    }

    &:first-child {
        border-radius: 6px 6px 0 0;
    }

    &:last-child {
        border-radius: 0 0 6px 6px;
    }
`;

const ModelSelectorWrapper = styled.div`
    position: relative;
`;

interface IntegratedInputBoxProps {
    onSubmit?: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
    messenger?: IIdeMessenger;
    models: ModelOptionType[];
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
}

export const IntegratedInputBox: React.FC<IntegratedInputBoxProps> = ({
    onSubmit,
    placeholder = "Ask Claude anything...",
    disabled = false,
    messenger,
    models,
    selectedModelId,
    onModelChange
}) => {
    const [content, setContent] = useState('');
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const editorRef = useRef<Editor | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowModelDropdown(false);
            }
        };

        if (showModelDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showModelDropdown]);

    const handleSubmit = (text?: string) => {
        const messageText = text || content;
        if (messageText.trim() && !disabled) {
            if (onSubmit) {
                onSubmit(messageText);
                setContent('');
                if (editorRef.current) {
                    editorRef.current.commands.clearContent();
                }
            }
        }
    };

    const handleEditorUpdate = (editor: Editor) => {
        editorRef.current = editor;
        setContent(editor.getText());
    };

    const estimateTokens = (text: string): number => {
        return Math.ceil(text.length / 4);
    };

    const canSubmit = content.trim().length > 0 && !disabled;

    return (
        <InputWrapper>
            <InputHeader>
                <ModelSelectorWrapper ref={dropdownRef}>
                    <ModelSelectorButton 
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        title="Select model"
                    >
                        <span>{selectedModel?.name || 'Select model'}</span>
                        <ChevronDownIcon />
                    </ModelSelectorButton>
                    {showModelDropdown && (
                        <ModelDropdown>
                            {models.map(model => (
                                <ModelOption
                                    key={model.id}
                                    onClick={() => {
                                        onModelChange?.(model.id);
                                        setShowModelDropdown(false);
                                    }}
                                >
                                    {model.name}
                                </ModelOption>
                            ))}
                        </ModelDropdown>
                    )}
                </ModelSelectorWrapper>
            </InputHeader>

            <EditorWrapper>
                <TipTapEditor
                    placeholder={disabled ? "Processing..." : placeholder}
                    onSubmit={handleSubmit}
                    onUpdate={handleEditorUpdate}
                    autoFocus={!disabled}
                    editable={!disabled}
                />
            </EditorWrapper>

            <InputFooter>
                <FooterLeft>
                    <ActionButton 
                        onClick={() => console.log('Add context')}
                        title="Add context (@)"
                    >
                        <PlusIcon />
                        <span>Add Context</span>
                    </ActionButton>
                    {content && (
                        <TokenCount>
                            ~{estimateTokens(content).toLocaleString()} tokens
                        </TokenCount>
                    )}
                </FooterLeft>
                
                <FooterRight>
                    <SubmitHint>
                        {canSubmit ? '⏎ Enter' : 'Type a message...'}
                    </SubmitHint>
                    <ActionButton
                        onClick={() => handleSubmit()}
                        disabled={!canSubmit}
                        title="Send message"
                    >
                        <PaperAirplaneIcon />
                    </ActionButton>
                </FooterRight>
            </InputFooter>
        </InputWrapper>
    );
};