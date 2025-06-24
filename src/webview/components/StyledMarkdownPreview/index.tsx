import React, { memo } from 'react';
import { useRemark } from 'react-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import styled from 'styled-components';
import {
    defaultBorderRadius,
    vscBackground,
    vscEditorBackground,
    vscForeground,
} from '../styled';
import { getFontSize } from '../../util';
// TODO: Add KaTeX fonts before enabling
// import '../../styles/components/katex.css';
import '../../styles/components/markdown.css';
import { rehypeHighlightPlugin } from './rehypeHighlightPlugin';
import { SyntaxHighlightedPre } from './SyntaxHighlightedPre';

const StyledMarkdown = styled.div<{
    fontSize?: number;
    bgColor: string;
}>`
    /* Heading sizes from GUI */
    h1 {
        font-size: 1.25em;
    }

    h2 {
        font-size: 1.15em;
    }

    h3 {
        font-size: 1.05em;
    }

    h4 {
        font-size: 1em;
    }

    h5 {
        font-size: 0.95em;
    }

    h6 {
        font-size: 0.9em;
    }

    /* Code block styling */
    pre {
        white-space: pre-wrap;
        background-color: ${vscEditorBackground};
        border-radius: ${defaultBorderRadius};
        max-width: calc(100vw - 24px);
        overflow-x: scroll;
        overflow-y: hidden;
        padding: 8px;
    }

    code {
        span.line:empty {
            display: none;
        }
        word-wrap: break-word;
        border-radius: ${defaultBorderRadius};
        background-color: ${vscEditorBackground};
        font-size: ${getFontSize() - 2}px;
        font-family: var(--vscode-editor-font-family);
    }

    code:not(pre > code) {
        font-family: var(--vscode-editor-font-family);
        color: var(--vscode-input-placeholderForeground);
    }

    /* Base styling */
    background-color: ${(props) => props.bgColor};
    font-family:
        var(--vscode-font-family),
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Oxygen,
        Ubuntu,
        Cantarell,
        "Open Sans",
        "Helvetica Neue",
        sans-serif;

    p {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: ${(props) =>
            props.fontSize ? `${props.fontSize}px` : "var(--vscode-font-size)"};
        line-height: 1.6;
    }

    a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }

    ul,
    ol {
        padding-left: 24px;
        margin-bottom: 16px;
    }

    blockquote {
        border-left: 4px solid var(--vscode-input-border);
        padding-left: 16px;
        margin-left: 0;
        color: var(--vscode-descriptionForeground);
    }
`;

interface StyledMarkdownPreviewProps {
    source: string;
    isRenderingInStepContainer?: boolean;
    itemIndex?: number;
}

export const StyledMarkdownPreview: React.FC<StyledMarkdownPreviewProps> = memo(({
    source,
    isRenderingInStepContainer = false,
    itemIndex
}) => {
    // Clean up the source text
    const processedSource = source.trim();

    // Configure remark with math support
    const [reactContent] = useRemark({
        remarkPlugins: [remarkMath],
        rehypePlugins: [
            rehypeKatex,
            [rehypeHighlightPlugin, { isRenderingInStepContainer }]
        ],
        // Custom components
        rehypeReactOptions: {
            components: {
                pre: ({ children, ...props }: any) => (
                    <SyntaxHighlightedPre {...props}>
                        {children}
                    </SyntaxHighlightedPre>
                ),
            },
        },
    }, processedSource);

    return (
        <StyledMarkdown
            fontSize={getFontSize()}
            bgColor={vscBackground}
            className="wmde-markdown"
        >
            {reactContent}
        </StyledMarkdown>
    );
});

StyledMarkdownPreview.displayName = 'StyledMarkdownPreview';