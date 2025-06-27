import React from 'react';
import styled from 'styled-components';
import { 
    vscInputBackground, 
    vscCommandCenterInactiveBorder,
    defaultBorderRadius,
    lightGray,
    vscForeground
} from '../styled';
import '../../styles/components/Lump.css';

const LumpDiv = styled.div`
    background: ${vscInputBackground};
    border-top: 1px solid ${vscCommandCenterInactiveBorder};
    border-right: 1px solid ${vscCommandCenterInactiveBorder};
    border-bottom: 1px solid ${vscInputBackground};
    border-left: 1px solid ${vscCommandCenterInactiveBorder};
    border-radius: ${defaultBorderRadius} ${defaultBorderRadius} 0 0;
    margin: 0 8px 1px 8px;
    position: relative;
`;

const LumpContent = styled.div`
    padding: 0.125rem 0.25rem;
    
    @media (min-width: 640px) {
        padding: 0.125rem 0.5rem;
    }
`;

const LumpToolbar = styled.div`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
`;

const ToolbarSection = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.125rem;
`;

const ToolbarButton = styled.button`
    display: flex;
    align-items: center;
    gap: 2px;
    background: none;
    border: none;
    color: ${lightGray};
    font-size: 11px;
    padding: 2px 3px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
        color: ${vscForeground};
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    svg {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
    }
    
    @media (min-width: 640px) {
        padding: 2px 4px;
    }
`;

const ToolbarLabel = styled.span`
    display: none;
    white-space: nowrap;
    
    @media (min-width: 640px) {
        display: inline;
    }
`;

const ContentDiv = styled.div<{ isVisible?: boolean }>`
    max-height: ${props => props.isVisible ? '200px' : '0'};
    margin: ${props => props.isVisible ? '4px 0' : '0'};
    opacity: ${props => props.isVisible ? 1 : 0};
    overflow: auto;
    transition: max-height 0.3s ease-in-out, margin 0.3s ease-in-out, opacity 0.2s ease-in-out;
`;

interface LumpProps {
    isMainInput?: boolean;
}

export const Lump: React.FC<LumpProps> = ({ isMainInput = true }) => {
    if (!isMainInput) return null;
    
    return (
        <LumpDiv>
            <LumpContent>
                <LumpToolbar>
                    <ToolbarSection>
                        {/* Context options */}
                        <ToolbarButton title="Models">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                            </svg>
                            <ToolbarLabel>Models</ToolbarLabel>
                        </ToolbarButton>
                        
                        <ToolbarButton title="Rules">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                            <ToolbarLabel>Rules</ToolbarLabel>
                        </ToolbarButton>
                        
                        <ToolbarButton title="Docs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                            </svg>
                            <ToolbarLabel>Docs</ToolbarLabel>
                        </ToolbarButton>
                        
                        <ToolbarButton title="Prompts">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                            </svg>
                            <ToolbarLabel>Prompts</ToolbarLabel>
                        </ToolbarButton>
                    </ToolbarSection>
                    
                    <ToolbarSection>
                        {/* Additional options can be added here */}
                    </ToolbarSection>
                </LumpToolbar>
            </LumpContent>
        </LumpDiv>
    );
};