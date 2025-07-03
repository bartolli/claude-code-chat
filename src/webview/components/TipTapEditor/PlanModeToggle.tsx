import React from 'react';
import styled from 'styled-components';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { DocumentTextIcon as DocumentTextIconSolid } from '@heroicons/react/24/solid';
import { defaultBorderRadius } from '../styled';

const ToggleButton = styled.button<{ isActive: boolean }>`
    background: ${props => props.isActive ? 'var(--vscode-button-background)' : 'transparent'};
    border: 1px solid ${props => props.isActive ? 'var(--vscode-focusBorder)' : 'var(--vscode-widget-border)'};
    padding: 4px 8px;
    cursor: pointer;
    color: ${props => props.isActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
    border-radius: ${defaultBorderRadius};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 11px;
    gap: 4px;
    min-width: 0;

    &:hover {
        background-color: ${props => props.isActive ? 'var(--vscode-button-hoverBackground)' : 'var(--vscode-toolbar-hoverBackground)'};
        border-color: ${props => props.isActive ? 'var(--vscode-focusBorder)' : 'var(--vscode-input-border)'};
    }

    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 1px;
    }

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }
`;

const ButtonText = styled.span`
    @media (max-width: 480px) {
        display: none;
    }
`;

interface PlanModeToggleProps {
    isActive: boolean;
    onChange: (active: boolean) => void;
}

export const PlanModeToggle: React.FC<PlanModeToggleProps> = ({ isActive, onChange }) => {
    const Icon = isActive ? DocumentTextIconSolid : DocumentTextIcon;
    
    return (
        <ToggleButton
            isActive={isActive}
            onClick={() => onChange(!isActive)}
            title={isActive ? "Plan mode active - Claude will present changes before execution" : "Enable plan mode - Review changes before execution"}
            aria-label={isActive ? "Disable plan mode" : "Enable plan mode"}
            aria-pressed={isActive}
        >
            <Icon />
            <ButtonText>Plan</ButtonText>
        </ToggleButton>
    );
};