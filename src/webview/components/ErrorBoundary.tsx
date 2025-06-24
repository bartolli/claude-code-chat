import React, { Component, ReactNode } from 'react';
import styled from 'styled-components';
import { varWithFallback } from '../styles/theme';

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 32px;
    text-align: center;
`;

const ErrorTitle = styled.h2`
    color: ${varWithFallback("error")};
    margin-bottom: 16px;
`;

const ErrorMessage = styled.p`
    color: ${varWithFallback("description")};
    margin-bottom: 24px;
`;

const ErrorDetails = styled.pre`
    background-color: ${varWithFallback("command-background")};
    border: 1px solid ${varWithFallback("command-border")};
    border-radius: 5px;
    padding: 16px;
    max-width: 600px;
    overflow-x: auto;
    text-align: left;
    font-size: 12px;
`;

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorContainer>
                    <ErrorTitle>Something went wrong</ErrorTitle>
                    <ErrorMessage>
                        An unexpected error occurred. Please try refreshing the page.
                    </ErrorMessage>
                    {this.state.error && (
                        <ErrorDetails>
                            {this.state.error.toString()}
                            {this.state.error.stack && '\n\n' + this.state.error.stack}
                        </ErrorDetails>
                    )}
                </ErrorContainer>
            );
        }

        return this.props.children;
    }
}