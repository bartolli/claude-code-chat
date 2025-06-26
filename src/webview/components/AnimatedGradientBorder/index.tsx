import React from 'react';
import styled, { keyframes, css } from 'styled-components';

interface AnimatedGradientBorderProps {
    active: boolean;
    children: React.ReactNode;
}

// Gradient animation from Continue GUI
const gradient = keyframes`
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
`;

const GradientBorderContainer = styled.div<{ active: boolean }>`
    position: relative;
    padding: 1px;
    border-radius: 8px;
    ${({ active }) =>
        active &&
        css`
            background: linear-gradient(
                90deg,
                #be185d,
                #7c3aed,
                #3b82f6,
                #10b981,
                #eab308,
                #dc2626
            );
            background-size: 400% 400%;
            animation: ${gradient} 6s ease infinite;
        `}
`;

const InnerContent = styled.div`
    background: var(--vscode-editor-background);
    border-radius: 7px;
    position: relative;
`;

export const AnimatedGradientBorder: React.FC<AnimatedGradientBorderProps> = ({ active, children }) => {
    if (!active) {
        return <>{children}</>;
    }

    return (
        <GradientBorderContainer active={active}>
            <InnerContent>{children}</InnerContent>
        </GradientBorderContainer>
    );
};