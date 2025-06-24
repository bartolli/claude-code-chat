import React from 'react';
import styled from 'styled-components';
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '../Button';
import { lightGray, defaultBorderRadius } from '../styled';

const ToolbarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    gap: 8px;
`;

const LeftSection = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const RightSection = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const TokenCount = styled.span`
    color: ${lightGray};
    font-size: 12px;
`;

const IconButton = styled.button`
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    color: ${lightGray};
    border-radius: ${defaultBorderRadius};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

interface InputToolbarProps {
    onSubmit?: () => void;
    onAddContext?: () => void;
    canSubmit?: boolean;
    tokenCount?: number;
}

export const InputToolbar: React.FC<InputToolbarProps> = ({
    onSubmit,
    onAddContext,
    canSubmit = true,
    tokenCount = 0
}) => {
    return (
        <ToolbarContainer>
            <LeftSection>
                <IconButton 
                    onClick={onAddContext}
                    title="Add context (@)"
                    aria-label="Add context"
                >
                    <PlusIcon />
                </IconButton>
                <TokenCount>
                    {tokenCount > 0 && `${tokenCount.toLocaleString()} tokens`}
                </TokenCount>
            </LeftSection>
            
            <RightSection>
                <IconButton
                    onClick={onSubmit}
                    disabled={!canSubmit}
                    title="Send message (Enter)"
                    aria-label="Send message"
                >
                    <PaperAirplaneIcon />
                </IconButton>
            </RightSection>
        </ToolbarContainer>
    );
};