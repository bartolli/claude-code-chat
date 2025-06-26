import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class SimpleErrorBoundary extends Component<Props, State> {
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
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    padding: '32px',
                    textAlign: 'center'
                }}>
                    <h2 style={{ color: 'var(--vscode-errorForeground, #f44336)', marginBottom: '16px' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: 'var(--vscode-descriptionForeground, #b3b3b3)', marginBottom: '24px' }}>
                        An unexpected error occurred. Please try refreshing the page.
                    </p>
                    {this.state.error && (
                        <pre style={{
                            backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
                            border: '1px solid var(--vscode-panel-border, #2a2a2a)',
                            borderRadius: '5px',
                            padding: '16px',
                            maxWidth: '600px',
                            overflowX: 'auto',
                            textAlign: 'left',
                            fontSize: '12px'
                        }}>
                            {this.state.error.toString()}
                            {this.state.error.stack && '\n\n' + this.state.error.stack}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}