import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { 
    vscInputBackground, 
    vscForeground, 
    defaultBorderRadius,
    lightGray,
    vscListActiveBackground
} from '../styled';

const SelectorButton = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: ${lightGray};
    font-size: 11px;
    padding: 2px 6px;
    border-radius: ${defaultBorderRadius};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
        color: ${vscForeground};
        background-color: var(--vscode-toolbar-hoverBackground);
    }
    
    svg {
        width: 10px;
        height: 10px;
    }
`;

const DropdownContainer = styled.div`
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 4px;
    background-color: ${vscInputBackground};
    border: 1px solid var(--vscode-widget-border);
    border-radius: ${defaultBorderRadius};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    min-width: 150px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
`;

const ModelOption = styled.div<{ isSelected: boolean }>`
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    color: ${vscForeground};
    background-color: ${props => props.isSelected ? vscListActiveBackground : 'transparent'};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const CheckIconStyled = styled(CheckIcon)`
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    color: var(--vscode-charts-green, #89d185);
`;

interface ModelSelectorProps {
    models: Array<{ id: string; name: string }>;
    selectedModelId: string;
    onModelChange: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    models,
    selectedModelId,
    onModelChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const selectedModel = models.find(m => m.id === selectedModelId);
    const displayName = selectedModel?.name || 'Select Model';
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSelect = (modelId: string) => {
        onModelChange(modelId);
        setIsOpen(false);
    };
    
    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <SelectorButton
                onClick={() => setIsOpen(!isOpen)}
                title="Select model"
            >
                <span>{displayName}</span>
                <ChevronDownIcon />
            </SelectorButton>
            
            {isOpen && (
                <DropdownContainer>
                    {models.map(model => (
                        <ModelOption
                            key={model.id}
                            isSelected={model.id === selectedModelId}
                            onClick={() => handleSelect(model.id)}
                        >
                            <span>{model.name}</span>
                            {model.id === selectedModelId && <CheckIconStyled />}
                        </ModelOption>
                    ))}
                </DropdownContainer>
            )}
        </div>
    );
};