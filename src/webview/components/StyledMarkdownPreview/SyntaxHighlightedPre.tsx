import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { vscEditorBackground, defaultBorderRadius } from '../styled';

const PreContainer = styled.div`
    position: relative;
    margin: 16px 0;
    
    &:hover .copy-button {
        opacity: 1;
    }
`;

const StyledPre = styled.pre`
    background-color: ${vscEditorBackground};
    border-radius: ${defaultBorderRadius};
    padding: 16px;
    overflow-x: auto;
    margin: 0;
    position: relative;
`;

const CopyButton = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 8px;
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    border-radius: ${defaultBorderRadius};
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    
    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
    }
    
    &.copied {
        opacity: 1;
    }
`;

const LanguageLabel = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    padding: 2px 8px;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 0 ${defaultBorderRadius} 0 ${defaultBorderRadius};
    font-size: 11px;
    font-family: var(--vscode-editor-font-family);
    opacity: 0.7;
`;

interface SyntaxHighlightedPreProps {
    children: React.ReactNode;
    'data-language'?: string;
}

export const SyntaxHighlightedPre: React.FC<SyntaxHighlightedPreProps> = ({ 
    children, 
    'data-language': language,
    ...props 
}) => {
    const [copied, setCopied] = useState(false);
    const preRef = useRef<HTMLPreElement>(null);

    const handleCopy = async () => {
        if (preRef.current) {
            const text = preRef.current.textContent || '';
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    return (
        <PreContainer>
            {language && <LanguageLabel>{language}</LanguageLabel>}
            <StyledPre ref={preRef} {...props}>
                {children}
            </StyledPre>
            <CopyButton 
                className={`copy-button ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy code'}
            >
                {copied ? (
                    <>
                        <CheckIcon className="h-3 w-3" />
                        Copied
                    </>
                ) : (
                    <>
                        <ClipboardIcon className="h-3 w-3" />
                        Copy
                    </>
                )}
            </CopyButton>
        </PreContainer>
    );
};