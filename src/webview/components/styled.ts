// EXACT COPY of styled components from GUI for consistent look and feel
import styled from 'styled-components';
import { varWithFallback } from '../styles/theme';

// Constants from GUI
export const defaultBorderRadius = '5px';
export const lightGray = '#999998';
export const greenButtonColor = '#189e72';

// Theme variable shortcuts from GUI
export const vscInputBackground = varWithFallback('input-background');
export const vscQuickInputBackground = varWithFallback('input-background');
export const vscBackground = varWithFallback('background');
export const vscForeground = varWithFallback('foreground');
export const vscButtonBackground = varWithFallback('primary-background');
export const vscButtonForeground = varWithFallback('primary-foreground');
export const vscButtonHoverBackground = varWithFallback('primary-hover');
export const vscErrorForeground = varWithFallback('error');
export const vscEditorBackground = varWithFallback('editor-background');
export const vscListActiveBackground = varWithFallback('list-active');
export const vscFocusBorder = varWithFallback('border-focus');
export const vscListActiveForeground = varWithFallback('list-active-foreground');
export const vscInputBorder = varWithFallback('input-border');
export const vscInputBorderFocus = varWithFallback('border-focus');
export const vscBadgeBackground = varWithFallback('badge-background');
export const vscBadgeForeground = varWithFallback('badge-foreground');
export const vscCommandCenterActiveBorder = varWithFallback('command-border-focus');
export const vscCommandCenterInactiveBorder = varWithFallback('command-border');

// Button components from GUI
export const Button = styled.button`
  padding: 6px 12px;
  margin: 8px 0;
  border-radius: ${defaultBorderRadius};

  border: none;
  color: ${vscBackground};
  background-color: ${vscForeground};

  &:disabled {
    color: ${vscBackground};
    opacity: 0.5;
    pointer-events: none;
  }

  &:hover:enabled {
    cursor: pointer;
    filter: brightness(1.2);
  }
`;

export const SecondaryButton = styled.button`
  padding: 6px 12px;
  margin: 8px;
  border-radius: ${defaultBorderRadius};

  border: 1px solid ${lightGray};
  color: ${vscForeground};
  background-color: ${vscInputBackground};

  &:disabled {
    color: gray;
  }

  &:hover:enabled {
    cursor: pointer;
    background-color: ${vscBackground};
    opacity: 0.9;
  }
`;

export const GhostButton = styled.button`
  padding: 6px 8px;
  border-radius: ${defaultBorderRadius};

  border: none;
  color: ${vscForeground};
  background-color: rgba(128, 128, 128, 0.4);
  &:disabled {
    color: gray;
    pointer-events: none;
  }

  &:hover:enabled {
    cursor: pointer;
    filter: brightness(125%);
  }
`;

export const ButtonSubtext = styled.span`
  display: block;
  margin-top: 0;
  text-align: center;
  color: ${lightGray};
  font-size: 0.75rem;
`;

// Scrollbar styling from GUI
export const CustomScrollbarDiv = styled.div`
  scrollbar-base-color: transparent;
  scrollbar-width: thin;
  background-color: ${vscBackground};

  & * {
    ::-webkit-scrollbar {
      width: 4px;
    }

    ::-webkit-scrollbar:horizontal {
      height: 4px;
    }

    ::-webkit-scrollbar-thumb {
      border-radius: 2px;
    }
  }
`;

// Input component from GUI
export const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  box-sizing: border-box;
  margin: 4px 0px;
  border-radius: ${defaultBorderRadius};
  outline: 1px solid ${lightGray};
  border: none;
  background-color: ${vscBackground};
  color: ${vscForeground};

  &:focus {
    background: ${vscInputBackground};
    outline: 1px solid ${lightGray};
  }

  &:invalid {
    outline: 1px solid red;
  }
`;

// Header button from GUI
export const HeaderButton = styled.button<{
  /** Whether to invert the button colors (dark button on light background vs light on dark) */
  inverted: boolean | undefined;
  /** Custom background color to override default theme colors */
  backgroundColor?: string;
  /** Custom hover background color to override default theme hover colors */
  hoverBackgroundColor?: string;
}>`
  background-color: ${({ inverted, backgroundColor }) => {
    return backgroundColor ?? (inverted ? vscForeground : 'transparent');
  }};
  color: ${({ inverted }) => (inverted ? vscBackground : vscForeground)};

  border: none;
  border-radius: ${defaultBorderRadius};
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};

  &:focus {
    outline: none;
    border: none;
  }

  &:hover {
    background-color: ${({ inverted, hoverBackgroundColor }) =>
      typeof inverted === 'undefined' || inverted
        ? (hoverBackgroundColor ?? vscInputBackground)
        : 'transparent'};
  }

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px;
`;

// Action button from GUI
export const StyledActionButton = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 200ms;
  border-radius: ${defaultBorderRadius};
  padding: 2px 12px;
  background-color: ${lightGray}33;
  background-opacity: 0.1;

  &:hover {
    background-color: ${lightGray}55;
  }
`;

// Close button from GUI
export const CloseButton = styled.button`
  border: none;
  background-color: inherit;
  color: ${lightGray};
  position: absolute;
  top: 0.6rem;
  right: 1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

// Animated ellipsis from GUI
export const AnimatedEllipsis = styled.span`
  &::after {
    content: '.';
    animation: ellipsis 2.5s infinite;
    animation-fill-mode: forwards;
    animation-play-state: running;
    will-change: content;
    display: inline-block;
    width: 16px;
    text-align: left;
  }

  @keyframes ellipsis {
    0% {
      content: '.';
    }
    33% {
      content: '..';
    }
    66% {
      content: '...';
    }
    100% {
      content: '.';
    }
  }
`;

// Layout components (from our initial implementation + GUI patterns)
export const LayoutTopDiv = styled(CustomScrollbarDiv)`
  height: 100%;
  border-radius: ${defaultBorderRadius};
  position: relative;
  overflow-x: hidden;
`;

export const GridDiv = styled.div`
  display: grid;
  grid-template-rows: 1fr auto;
  height: 100%;
  min-height: 100vh;
  overflow-x: visible;
`;

// Additional utility components
export const StyledCard = styled.div`
  background-color: ${vscInputBackground};
  border: 1px solid ${varWithFallback('border')};
  border-radius: ${defaultBorderRadius};
  padding: 16px;
  margin-bottom: 8px;
`;

export const MutedText = styled.span`
  color: ${varWithFallback('description')};
  font-size: 12px;
`;

export const ErrorText = styled.span`
  color: ${varWithFallback('error')};
  font-size: 12px;
`;

export const SuccessText = styled.span`
  color: ${varWithFallback('success')};
  font-size: 12px;
`;

export const StyledLink = styled.a`
  color: ${varWithFallback('link')};
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

export const CodeBlockContainer = styled.div`
  background-color: ${varWithFallback('command-background')};
  border: 1px solid ${varWithFallback('command-border')};
  border-radius: ${defaultBorderRadius};
  padding: 12px;
  margin: 8px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  overflow-x: auto;
`;

export const HoverContainer = styled.div`
  transition: all 0.2s ease;

  &:hover {
    background-color: ${varWithFallback('list-hover')};
  }
`;

export const SelectableContainer = styled.div<{
  /** Whether the container is currently selected, shows active styling when true */
  isSelected?: boolean;
}>`
  padding: 8px;
  border-radius: ${defaultBorderRadius};
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.isSelected &&
    `
    background-color: ${vscListActiveBackground};
    color: ${vscListActiveForeground};
  `}

  &:hover {
    background-color: ${varWithFallback('list-hover')};
  }
`;
