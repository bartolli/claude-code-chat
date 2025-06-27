import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { vscBackground, defaultBorderRadius } from '../styled';

// Gradient animation keyframes - horizontal scroll effect
const gradientAnimation = keyframes`
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
`;

// Styled component for the gradient border wrapper
const GradientBorderWrapper = styled.div<{ isStreaming: boolean; isFocused: boolean }>`
  padding: 1px;
  border-radius: ${defaultBorderRadius};
  background: ${props => props.isFocused ? 'var(--vscode-focusBorder)' : vscBackground};
  transition: background 0.15s ease-in-out;
  
  ${props => props.isStreaming && css`
    background: linear-gradient(
      90deg,
      #1BBE84 0%,
      #331BBE 16.67%,
      #BE1B55 33.33%,
      #A6BE1B 50%,
      #BE1B55 66.67%,
      #331BBE 83.33%,
      #1BBE84 100%
    );
    background-size: 200% 100%;
    animation: ${gradientAnimation} 6s linear infinite;
    transition: none;
  `}
`;

interface GradientBorderProps {
  isStreaming: boolean;
  isFocused?: boolean;
  children: React.ReactNode;
}

export const GradientBorder: React.FC<GradientBorderProps> = ({ 
  isStreaming, 
  isFocused = false,
  children 
}) => {
  return (
    <GradientBorderWrapper isStreaming={isStreaming} isFocused={isFocused}>
      {children}
    </GradientBorderWrapper>
  );
};