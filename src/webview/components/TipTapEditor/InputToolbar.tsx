import React from 'react';
import styled from 'styled-components';
import { PaperAirplaneIcon, PlusIcon, StopIcon } from '@heroicons/react/24/outline';
import { Button } from '../Button';
import { lightGray, defaultBorderRadius } from '../styled';
import { ModelSelector } from './ModelSelector';
import { PlanModeToggle } from './PlanModeToggle';

const ToolbarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0.5rem;
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
    onStop?: () => void;
    canSubmit?: boolean;
    isProcessing?: boolean;
    tokenCount?: number;
    models?: Array<{ id: string; name: string }>;
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
    planMode?: boolean;
    onPlanModeChange?: (active: boolean) => void;
}

export const InputToolbar: React.FC<InputToolbarProps> = ({
    onSubmit,
    onAddContext,
    onStop,
    canSubmit = true,
    isProcessing = false,
    tokenCount = 0,
    models = [],
    selectedModelId = '',
    onModelChange,
    planMode = false,
    onPlanModeChange
}) => {
    return (
        <ToolbarContainer>
            <LeftSection>
                {models.length > 0 && onModelChange && (
                    <ModelSelector
                        models={models}
                        selectedModelId={selectedModelId}
                        onModelChange={onModelChange}
                    />
                )}
                {onPlanModeChange && (
                    <PlanModeToggle
                        isActive={planMode}
                        onChange={onPlanModeChange}
                    />
                )}
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
                {isProcessing && onStop ? (
                    <IconButton
                        onClick={onStop}
                        title="Stop processing (ESC)"
                        aria-label="Stop processing"
                        style={{ color: 'var(--vscode-errorForeground)' }}
                    >
                        <StopIcon />
                    </IconButton>
                ) : (
                    <IconButton
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        title="Send message (Enter)"
                        aria-label="Send message"
                    >
                        <PaperAirplaneIcon />
                    </IconButton>
                )}
            </RightSection>
        </ToolbarContainer>
    );
};