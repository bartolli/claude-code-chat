import React from 'react';
import styled from 'styled-components';
import { TrashIcon, ArrowPathIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { lightGray } from '../styled';

interface ResponseActionsProps {
    isTruncated: boolean;
    onDelete?: () => void;
    onContinue?: () => void;
    messageContent: string;
}

const ActionsContainer = styled.div`
    margin: 0 8px;
    display: flex;
    cursor: default;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    background-color: transparent;
    padding-bottom: 0;
    font-size: 12px;
    color: ${lightGray};
`;

const ActionButton = styled.button`
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #6b7280; /* gray-500 */
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }

    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

export const ResponseActions: React.FC<ResponseActionsProps> = ({
    isTruncated,
    onDelete,
    onContinue,
    messageContent
}) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <ActionsContainer>
            {isTruncated && onContinue && (
                <ActionButton
                    onClick={onContinue}
                    title="Continue generation"
                    aria-label="Continue generation"
                >
                    <ArrowPathIcon />
                </ActionButton>
            )}

            {onDelete && (
                <ActionButton
                    onClick={onDelete}
                    title="Delete message"
                    aria-label="Delete message"
                >
                    <TrashIcon />
                </ActionButton>
            )}

            <ActionButton
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy message"}
                aria-label="Copy message"
            >
                {copied ? (
                    <CheckIcon style={{ color: '#10b981' }} />
                ) : (
                    <ClipboardIcon />
                )}
            </ActionButton>
        </ActionsContainer>
    );
};