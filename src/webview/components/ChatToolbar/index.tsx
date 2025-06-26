import React from 'react';
import styled from 'styled-components';
import { PlusIcon, TrashIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const ToolbarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--vscode-sideBar-border, #2a2a2a);
    background: var(--vscode-editor-background);
`;

const ToolbarGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ToolbarButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
        background: var(--vscode-list-hoverBackground, #383838);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const SessionInfo = styled.div`
    color: var(--vscode-descriptionForeground, #b3b3b3);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

interface ChatToolbarProps {
    onNewChat: () => void;
    onClearHistory?: () => void;
    onOpenSettings?: () => void;
    sessionId?: string;
    messageCount?: number;
}

export const ChatToolbar: React.FC<ChatToolbarProps> = ({
    onNewChat,
    onClearHistory,
    onOpenSettings,
    sessionId,
    messageCount = 0
}) => {
    return (
        <ToolbarContainer>
            <ToolbarGroup>
                <ToolbarButton onClick={onNewChat} title="Start new chat">
                    <PlusIcon />
                    <span>New Chat</span>
                </ToolbarButton>
                {messageCount > 0 && (
                    <ToolbarButton 
                        onClick={onClearHistory} 
                        title="Clear chat history"
                        disabled={!onClearHistory}
                    >
                        <TrashIcon />
                        <span>Clear</span>
                    </ToolbarButton>
                )}
            </ToolbarGroup>
            
            <ToolbarGroup>
                {sessionId && (
                    <SessionInfo>
                        Session: {sessionId.substring(0, 8)}...
                    </SessionInfo>
                )}
                <ToolbarButton 
                    onClick={onOpenSettings} 
                    title="Open settings"
                    disabled={!onOpenSettings}
                >
                    <Cog6ToothIcon />
                </ToolbarButton>
            </ToolbarGroup>
        </ToolbarContainer>
    );
};