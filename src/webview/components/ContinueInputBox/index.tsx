import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { TipTapEditor } from '../TipTapEditor';
import { InputToolbar } from '../TipTapEditor/InputToolbar';
import { Editor } from '@tiptap/react';
import { IIdeMessenger } from '../../../protocol/IdeMessenger';

const InputContainer = styled.div`
    width: 100%;
`;

interface ContinueInputBoxProps {
    onSubmit?: (message: string) => void;
    placeholder?: string;
    disabled?: boolean;
    messenger?: IIdeMessenger;
}

export const ContinueInputBox: React.FC<ContinueInputBoxProps> = ({
    onSubmit,
    placeholder = "Ask Claude anything...",
    disabled = false,
    messenger
}) => {
    const [content, setContent] = useState('');
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
        <InputContainer>
            <TipTapEditor
                placeholder={disabled ? "Processing..." : placeholder}
                onSubmit={handleSubmit}
                onUpdate={handleEditorUpdate}
                autoFocus={!disabled}
                editable={!disabled}
            />
            <InputToolbar
                onSubmit={() => {
                    if (editorRef.current && !disabled) {
                        const text = editorRef.current.getText();
                        handleSubmit(text);
                    }
                }}
                onAddContext={() => {
                    // TODO: Implement context menu
                    console.log('Add context clicked');
                }}
                canSubmit={content.trim().length > 0 && !disabled}
                tokenCount={estimateTokens(content)}
            />
        </InputContainer>
    );
};