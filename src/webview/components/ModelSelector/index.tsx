import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from '@headlessui/react';
import {
    ChevronDownIcon,
    CheckIcon,
    CubeIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { 
    defaultBorderRadius, 
    vscCommandCenterInactiveBorder,
    vscInputBackground,
    vscForeground,
    vscListActiveBackground,
    vscListActiveForeground,
    lightGray
} from '../styled';

// Styled components for exact GUI match
const StyledListboxButton = styled(ListboxButton)`
    background-color: ${vscInputBackground};
    color: ${vscForeground};
    border: 1px solid ${vscCommandCenterInactiveBorder};
    margin: 0;
    display: flex;
    flex: 1;
    cursor: pointer;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    text-align: left;
    transition: border-color 0.2s;
    border-radius: ${defaultBorderRadius};
    font-size: 12px;
    min-width: 160px;

    &:hover {
        border-color: var(--vscode-focusBorder);
    }

    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
    }
`;

const StyledListboxOptions = styled(ListboxOptions)`
    background-color: ${vscInputBackground};
    border: 1px solid ${vscCommandCenterInactiveBorder};
    border-radius: ${defaultBorderRadius};
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-top: 4px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 50;
`;

const StyledListboxOption = styled(ListboxOption)<{ $isSelected?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;

    ${props => props.$isSelected && `
        background-color: ${vscListActiveBackground};
        color: ${vscListActiveForeground};
    `}

    &:hover {
        background-color: ${vscListActiveBackground};
        color: ${vscListActiveForeground};
    }

    &[aria-disabled="true"] {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const OptionContent = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
`;

const ModelName = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const MissingKeyText = styled.span`
    font-size: 10px;
    font-style: italic;
    color: ${lightGray};
    margin-left: 8px;
`;

const AddModelOption = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-top: 1px solid ${vscCommandCenterInactiveBorder};
    cursor: pointer;
    font-size: 12px;
    color: var(--vscode-textLink-foreground);
    transition: background-color 0.2s;

    &:hover {
        background-color: ${vscListActiveBackground};
    }
`;

export interface ModelOption {
    id: string;
    name: string;
    provider?: string;
    hasApiKey?: boolean;
    description?: string;
}

interface ModelSelectorProps {
    models: ModelOption[];
    selectedModelId?: string;
    onModelChange?: (modelId: string) => void;
    onAddModel?: () => void;
    placeholder?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    models,
    selectedModelId,
    onModelChange,
    onAddModel,
    placeholder = "Select a model"
}) => {
    const selectedModel = models.find(m => m.id === selectedModelId);

    return (
        <Listbox value={selectedModelId} onChange={onModelChange}>
            <StyledListboxButton>
                <CubeIcon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">
                    {selectedModel?.name || placeholder}
                </span>
                <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
            </StyledListboxButton>

            <StyledListboxOptions>
                {models.map((model) => (
                    <StyledListboxOption
                        key={model.id}
                        value={model.id}
                        disabled={!model.hasApiKey}
                        $isSelected={model.id === selectedModelId}
                    >
                        <OptionContent>
                            <CubeIcon className="h-3 w-3 flex-shrink-0" />
                            <ModelName>
                                {model.name}
                                {!model.hasApiKey && (
                                    <MissingKeyText>(Missing API key)</MissingKeyText>
                                )}
                            </ModelName>
                        </OptionContent>
                        {model.id === selectedModelId && (
                            <CheckIcon className="h-3 w-3 flex-shrink-0" />
                        )}
                    </StyledListboxOption>
                ))}
                
                {onAddModel && (
                    <AddModelOption onClick={onAddModel}>
                        <PlusIcon className="h-3 w-3" />
                        <span>Add model</span>
                    </AddModelOption>
                )}
            </StyledListboxOptions>
        </Listbox>
    );
};