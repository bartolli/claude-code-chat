import React from 'react';
import styled from 'styled-components';
import { ModelSelector, ModelOption } from '../ModelSelector';
import { Button } from '../Button';
import { PlusIcon } from '@heroicons/react/24/outline';

const HeaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-editor-background);
`;

const LeftSection = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const RightSection = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

interface ChatHeaderProps {
    models: ModelOption[];
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
    onNewChat?: () => void;
    onAddModel?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    models,
    selectedModelId,
    onModelChange,
    onNewChat,
    onAddModel
}) => {
    return (
        <HeaderContainer>
            <LeftSection>
                <Title>Claude Code Chat</Title>
                <ModelSelector
                    models={models}
                    selectedModelId={selectedModelId}
                    onModelChange={onModelChange}
                    onAddModel={onAddModel}
                />
            </LeftSection>
            
            <RightSection>
                <Button
                    variant="ghost"
                    onClick={onNewChat}
                    title="New chat"
                    aria-label="New chat"
                >
                    <PlusIcon className="h-4 w-4" />
                    New Chat
                </Button>
            </RightSection>
        </HeaderContainer>
    );
};