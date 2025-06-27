import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { TipTapEditor } from '../TipTapEditor';
import { GradientBorder } from './GradientBorder';
import { Editor } from '@tiptap/react';
import { IIdeMessenger } from '../../../protocol/IdeMessenger';

const Container = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0 8px;
`;

interface ContinueInputBoxProps {
    onSubmit?: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
    messenger?: IIdeMessenger;
    isStreaming?: boolean;
    models?: Array<{ id: string; name: string }>;
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
}

export const ContinueInputBox: React.FC<ContinueInputBoxProps> = ({
    onSubmit,
    placeholder = "Ask Claude anything...",
    disabled = false,
    messenger,
    isStreaming = false,
    models,
    selectedModelId,
    onModelChange
}) => {
    const [content, setContent] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const editorRef = useRef<Editor | null>(null);

    const handleSubmit = (text?: string) => {
        const messageText = text || content;
        if (messageText.trim() && !disabled) {
            // Send all messages (including slash commands) through the normal flow
            if (onSubmit) {
                onSubmit(messageText);
                setContent('');
            }
        }
    };

    const handleEditorUpdate = (editor: Editor) => {
        editorRef.current = editor;
        setContent(editor.getText());
    };

    // Simple token estimation (rough approximation)
    const estimateTokens = (text: string): number => {
        return Math.ceil(text.length / 4);
    };

    return (
        <Container>
            <GradientBorder isStreaming={isStreaming} isFocused={isFocused}>
                <TipTapEditor
                    placeholder={disabled ? "Processing..." : placeholder}
                    onSubmit={handleSubmit}
                    onUpdate={handleEditorUpdate}
                    autoFocus={!disabled}
                    editable={!disabled}
                    onAddContext={() => {
                        // TODO: Implement context menu
                        console.log('Add context clicked');
                    }}
                    tokenCount={estimateTokens(content)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    models={models}
                    selectedModelId={selectedModelId}
                    onModelChange={onModelChange}
                />
            </GradientBorder>
        </Container>
    );
};