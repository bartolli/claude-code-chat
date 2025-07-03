import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import { TipTapEditor } from '../TipTapEditor';
import { Lump } from './Lump';
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
    onStop?: () => void;
    placeholder?: string;
    disabled?: boolean;
    isProcessing?: boolean;
    messenger?: IIdeMessenger;
    isStreaming?: boolean;
    models?: Array<{ id: string; name: string }>;
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
    isMainInput?: boolean;
    planMode?: boolean;
    onPlanModeChange?: (active: boolean) => void;
}

export interface ContinueInputBoxHandle {
    focus: () => void;
}

export const ContinueInputBox = forwardRef<ContinueInputBoxHandle, ContinueInputBoxProps>(({
    onSubmit,
    onStop,
    placeholder = "Ask Claude anything...",
    disabled = false,
    isProcessing = false,
    messenger,
    isStreaming = false,
    models,
    selectedModelId,
    onModelChange,
    isMainInput = true,
    planMode = false,
    onPlanModeChange
}, ref) => {
    const [content, setContent] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const editorRef = useRef<Editor | null>(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            if (editorRef.current) {
                editorRef.current.commands.focus();
            }
        }
    }), []);

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

    const displayPlaceholder = disabled 
        ? "Processing..." 
        : planMode 
            ? "Ask Claude to plan changes (Plan mode active)..." 
            : placeholder;

    return (
        <Container>
            <Lump isMainInput={isMainInput} />
            <TipTapEditor
                placeholder={displayPlaceholder}
                onSubmit={handleSubmit}
                onUpdate={handleEditorUpdate}
                onStop={onStop}
                autoFocus={!disabled}
                editable={!disabled}
                isProcessing={isProcessing}
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
                hasLump={isMainInput}
                planMode={planMode}
                onPlanModeChange={onPlanModeChange}
            />
        </Container>
    );
});