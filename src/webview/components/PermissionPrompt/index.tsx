import React, { useState } from 'react';
import styled from 'styled-components';
import { vscButtonBackground, vscButtonForeground, vscButtonHoverBackground, vscErrorForeground, vscForeground } from '../styled';

interface PermissionPromptProps {
    toolName: string;
    toolInput: any;
    onApprove: () => void;
    onDeny: () => void;
}

const PromptContainer = styled.div`
    background-color: var(--vscode-notifications-background);
    border: 1px solid var(--vscode-notifications-border);
    border-radius: 4px;
    padding: 16px;
    margin: 8px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
`;

const PromptHeader = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    color: ${vscForeground};
`;

const WarningIcon = styled.span`
    color: var(--vscode-notificationsWarningIcon-foreground);
    margin-right: 8px;
    font-size: 20px;
`;

const ToolInfo = styled.div`
    margin: 12px 0;
    padding: 8px;
    background-color: var(--vscode-textBlockQuote-background);
    border-left: 3px solid var(--vscode-textBlockQuote-border);
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
`;

const InputDetails = styled.pre`
    margin: 8px 0;
    padding: 8px;
    background-color: var(--vscode-editor-background);
    border-radius: 4px;
    overflow-x: auto;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    white-space: pre-wrap;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 16px;
    justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' }>`
    padding: 6px 14px;
    background-color: ${props => 
        props.variant === 'danger' 
            ? 'var(--vscode-statusBarItem-errorBackground)' 
            : vscButtonBackground};
    color: ${props => 
        props.variant === 'danger' 
            ? 'var(--vscode-statusBarItem-errorForeground)' 
            : vscButtonForeground};
    border: none;
    border-radius: 2px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background-color 0.1s;

    &:hover {
        background-color: ${props => 
            props.variant === 'danger' 
                ? 'var(--vscode-statusBarItem-errorBackground)' 
                : vscButtonHoverBackground};
        opacity: ${props => props.variant === 'danger' ? 0.9 : 1};
    }

    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 2px;
    }
`;

const InfoText = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
`;

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
    toolName,
    toolInput,
    onApprove,
    onDeny
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApprove = () => {
        setIsProcessing(true);
        onApprove();
    };

    const handleDeny = () => {
        setIsProcessing(true);
        onDeny();
    };

    // Format the tool input for display
    const formatInput = () => {
        if (typeof toolInput === 'string') {
            return toolInput;
        }
        return JSON.stringify(toolInput, null, 2);
    };

    // Get a user-friendly description for common tools
    const getToolDescription = () => {
        switch (toolName) {
            case 'Bash':
                return 'Execute a shell command';
            case 'Write':
                return 'Create or overwrite a file';
            case 'Edit':
                return 'Modify an existing file';
            case 'MultiEdit':
                return 'Make multiple edits to a file';
            case 'Read':
                return 'Read file contents';
            default:
                return `Use the ${toolName} tool`;
        }
    };

    return (
        <PromptContainer>
            <PromptHeader>
                <WarningIcon>⚠️</WarningIcon>
                Permission Required
            </PromptHeader>
            
            <div>
                Claude wants to <strong>{getToolDescription()}</strong>
            </div>

            <ToolInfo>
                Tool: <strong>{toolName}</strong>
            </ToolInfo>

            {toolInput && (
                <InputDetails>
                    {formatInput()}
                </InputDetails>
            )}

            <InfoText>
                Review the requested action carefully before approving.
            </InfoText>

            <ButtonContainer>
                <Button 
                    variant="danger" 
                    onClick={handleDeny}
                    disabled={isProcessing}
                >
                    Deny
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleApprove}
                    disabled={isProcessing}
                >
                    Approve
                </Button>
            </ButtonContainer>
        </PromptContainer>
    );
};