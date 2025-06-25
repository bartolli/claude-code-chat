import React from 'react';
import styled, { keyframes } from 'styled-components';
import { vscForeground } from '../styled';

const pulse = keyframes`
    0% {
        opacity: 0.3;
    }
    50% {
        opacity: 1;
    }
    100% {
        opacity: 0.3;
    }
`;

const WaitingContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    margin: 8px 16px;
    background-color: var(--vscode-editor-lineHighlightBackground);
    border-radius: 4px;
    color: ${vscForeground};
    font-size: 13px;
`;

const Dots = styled.div`
    display: flex;
    gap: 4px;
`;

const Dot = styled.div<{ delay: number }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--vscode-progressBar-background);
    animation: ${pulse} 1.4s ease-in-out infinite;
    animation-delay: ${props => props.delay}s;
`;

const Text = styled.span`
    color: var(--vscode-descriptionForeground);
`;

interface WaitingIndicatorProps {
    message?: string;
}

export const WaitingIndicator: React.FC<WaitingIndicatorProps> = ({ 
    message = "Claude is working" 
}) => {
    return (
        <WaitingContainer>
            <Dots>
                <Dot delay={0} />
                <Dot delay={0.2} />
                <Dot delay={0.4} />
            </Dots>
            <Text>{message}</Text>
        </WaitingContainer>
    );
};