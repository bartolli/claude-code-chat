import React from 'react';
import styled from 'styled-components';
import { vscForeground, vscInputBackground, vscButtonBackground, vscButtonForeground, vscButtonHoverBackground } from './styled';

const PlanContainer = styled.div`
    background-color: ${vscInputBackground};
    border: 1px solid var(--vscode-editorInfo-border);
    border-radius: 6px;
    padding: 16px;
    margin: 8px 0;
`;

const PlanHeader = styled.div`
    font-weight: 600;
    color: var(--vscode-editorInfo-foreground, ${vscForeground});
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const PlanContent = styled.div`
    color: ${vscForeground};
    line-height: 1.5;
    white-space: pre-wrap;
    margin-bottom: 16px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-start;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
    background-color: ${props => props.variant === 'primary' ? vscButtonBackground : 'transparent'};
    color: ${props => props.variant === 'primary' ? vscButtonForeground : vscForeground};
    border: 1px solid ${props => props.variant === 'primary' ? 'transparent' : 'var(--vscode-button-border, #5a5a5a)'};
    padding: 6px 14px;
    border-radius: 2px;
    font-size: 13px;
    cursor: pointer;
    transition: background-color 0.1s ease;

    &:hover {
        background-color: ${props => props.variant === 'primary' ? vscButtonHoverBackground : 'var(--vscode-toolbar-hoverBackground)'};
    }

    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 1px;
    }
`;

interface PlanData {
    type: 'plan';
    title: string;
    steps: string[];
    summary: string;
}

interface PlanApprovalProps {
    toolId?: string;
    plan: string | PlanData;
    isMarkdown?: boolean;
    onApprove?: () => void;
    onRefine?: () => void;
}

const PlanTitle = styled.h4`
    margin: 0 0 12px 0;
    color: ${vscForeground};
    font-size: 14px;
`;

const PlanSteps = styled.ol`
    margin: 0 0 12px 0;
    padding-left: 20px;
    
    li {
        margin-bottom: 8px;
        line-height: 1.5;
    }
`;

const PlanSummary = styled.p`
    margin: 12px 0;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
`;

const MarkdownPlanContent = styled.div`
    color: ${vscForeground};
    line-height: 1.6;
    margin-bottom: 16px;
    
    h2 {
        font-size: 16px;
        margin: 16px 0 12px 0;
        color: ${vscForeground};
    }
    
    strong {
        color: ${vscForeground};
        font-weight: 600;
    }
    
    ol, ul {
        margin: 8px 0;
        padding-left: 24px;
    }
    
    li {
        margin-bottom: 6px;
    }
    
    p {
        margin: 8px 0;
    }
`;

export const PlanApproval: React.FC<PlanApprovalProps> = ({ toolId, plan, isMarkdown, onApprove, onRefine }) => {
    const handleApprove = () => {
        if (onApprove) {
            onApprove();
        }
    };

    const handleRefine = () => {
        if (onRefine) {
            onRefine();
        }
    };

    // Check if plan is the new JSON format
    const isJsonPlan = typeof plan === 'object' && plan.type === 'plan';

    // For markdown plans, we show them without the header since it's already in the content
    if (isMarkdown && typeof plan === 'string') {
        return (
            <PlanContainer>
                <MarkdownPlanContent dangerouslySetInnerHTML={{ __html: plan }} />
                <ButtonGroup>
                    <Button variant="primary" onClick={handleApprove}>
                        ✓ Approve Plan
                    </Button>
                    <Button variant="secondary" onClick={handleRefine}>
                        ↻ Refine Plan
                    </Button>
                </ButtonGroup>
            </PlanContainer>
        );
    }

    return (
        <PlanContainer>
            <PlanHeader>
                📋 Proposed Plan
            </PlanHeader>
            {isJsonPlan ? (
                <>
                    <PlanTitle>{plan.title}</PlanTitle>
                    <PlanSteps>
                        {plan.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                        ))}
                    </PlanSteps>
                    {plan.summary && <PlanSummary>{plan.summary}</PlanSummary>}
                </>
            ) : (
                // Fallback for string plans (legacy)
                <PlanContent>{plan}</PlanContent>
            )}
            <ButtonGroup>
                <Button variant="primary" onClick={handleApprove}>
                    ✓ Approve Plan
                </Button>
                <Button variant="secondary" onClick={handleRefine}>
                    ↻ Refine Plan
                </Button>
            </ButtonGroup>
        </PlanContainer>
    );
};