import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { lightGray } from '../styled';

const ThinkingText = styled.span`
    color: ${lightGray};
    font-style: italic;
    padding: 8px;
    display: inline-block;
`;

export const ThinkingIndicator: React.FC = () => {
    const [dots, setDots] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev === 3 ? 0 : prev + 1));
        }, 600);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '8px 8px' }}>
            <ThinkingText>
                Thinking{'.'.repeat(dots)}
            </ThinkingText>
        </div>
    );
};