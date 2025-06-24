import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { varWithFallback } from '../styles/theme';
import { selectCurrentSessionTokens, selectCurrentSessionCost } from '../../state/slices/sessionSlice';
import { selectSelectedModel } from '../../state/slices/configSlice';
import { selectClaudeStatus } from '../../state/slices/claudeSlice';

const FooterContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-top: 1px solid ${varWithFallback("border")};
    background-color: ${varWithFallback("background")};
    font-size: 12px;
    color: ${varWithFallback("description")};
    min-height: 32px;
`;

const FooterSection = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const StatusIndicator = styled.span<{ $status: 'ready' | 'processing' | 'error' | 'disconnected' }>`
    color: ${props => {
        switch (props.$status) {
            case 'ready': return varWithFallback('success');
            case 'processing': return varWithFallback('warning');
            case 'error': return varWithFallback('error');
            case 'disconnected': return varWithFallback('description');
            default: return varWithFallback('description');
        }
    }};
`;

const Separator = styled.span`
    color: ${varWithFallback('description')};
    opacity: 0.5;
`;

const LinkButton = styled.button`
    background: none;
    border: none;
    color: ${varWithFallback('link')};
    cursor: pointer;
    font-size: 12px;
    padding: 0;
    text-decoration: none;
    
    &:hover {
        text-decoration: underline;
    }
    
    &:focus {
        outline: 1px solid ${varWithFallback('accent')};
        outline-offset: 2px;
    }
`;

const TokenCount = styled.span`
    font-variant-numeric: tabular-nums;
`;

const CostDisplay = styled.span`
    font-variant-numeric: tabular-nums;
    color: ${varWithFallback('warning')};
`;

export const Footer: React.FC = () => {
    // Get data from Redux store
    const selectedModel = useSelector(selectSelectedModel);
    const tokenCount = useSelector(selectCurrentSessionTokens);
    const cost = useSelector(selectCurrentSessionCost);
    const claudeStatus = useSelector(selectClaudeStatus);
    
    // Determine status
    const getStatus = () => {
        if (!claudeStatus.isConnected) return 'disconnected';
        if (claudeStatus.error) return 'error';
        if (claudeStatus.isProcessing) return 'processing';
        return 'ready';
    };
    
    const status = getStatus();
    const statusText = {
        ready: 'Ready',
        processing: 'Processing...',
        error: 'Error',
        disconnected: 'Disconnected'
    }[status];
    
    // Format numbers
    const formatTokens = (tokens: number) => {
        if (tokens >= 1000000) {
            return `${(tokens / 1000000).toFixed(1)}M`;
        } else if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}K`;
        }
        return tokens.toString();
    };
    
    const formatCost = (costInCents: number) => {
        return `$${(costInCents / 100).toFixed(4)}`;
    };
    
    return (
        <FooterContainer>
            <FooterSection>
                {selectedModel && (
                    <>
                        <span>Model: {selectedModel.name || selectedModel.id}</span>
                        <Separator>•</Separator>
                    </>
                )}
                <TokenCount>{formatTokens(tokenCount || 0)} tokens</TokenCount>
                {cost > 0 && (
                    <>
                        <Separator>•</Separator>
                        <CostDisplay>{formatCost(cost)}</CostDisplay>
                    </>
                )}
            </FooterSection>
            <FooterSection>
                <StatusIndicator $status={status}>
                    {statusText}
                </StatusIndicator>
                <Separator>|</Separator>
                <LinkButton 
                    onClick={() => {
                        // TODO: Open settings
                        console.log('Open settings');
                    }}
                    title="Open settings"
                >
                    Settings
                </LinkButton>
            </FooterSection>
        </FooterContainer>
    );
};