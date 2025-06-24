import React, { createContext, useContext, useState, ReactNode } from 'react';
import styled from 'styled-components';
import { varWithFallback } from '../styles/theme';

const DialogOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

const DialogContent = styled.div`
    background-color: ${varWithFallback("background")};
    border: 1px solid ${varWithFallback("border")};
    border-radius: 8px;
    padding: 24px;
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

interface DialogContextType {
    showDialog: (content: ReactNode) => void;
    hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within DialogProvider');
    }
    return context;
};

interface DialogProviderProps {
    children: ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const [dialogContent, setDialogContent] = useState<ReactNode | null>(null);

    const showDialog = (content: ReactNode) => {
        setDialogContent(content);
    };

    const hideDialog = () => {
        setDialogContent(null);
    };

    return (
        <DialogContext.Provider value={{ showDialog, hideDialog }}>
            {children}
            {dialogContent && (
                <DialogOverlay onClick={hideDialog}>
                    <DialogContent onClick={(e) => e.stopPropagation()}>
                        {dialogContent}
                    </DialogContent>
                </DialogOverlay>
            )}
        </DialogContext.Provider>
    );
};