import React from 'react';
import styled from 'styled-components';
import { varWithFallback } from '../styles/theme';
import { 
    AcademicCapIcon, 
    BeakerIcon, 
    CodeBracketIcon, 
    DocumentTextIcon 
} from '@heroicons/react/24/outline';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    min-height: 400px;
    color: ${varWithFallback('description')};
`;

const Title = styled.h2`
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 8px;
    color: ${varWithFallback('foreground')};
`;

const Subtitle = styled.p`
    font-size: 14px;
    margin-bottom: 32px;
    text-align: center;
    max-width: 500px;
`;

const StartersGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    width: 100%;
    max-width: 600px;
`;

const StarterCard = styled.button`
    background-color: ${varWithFallback('secondary-background')};
    border: 1px solid ${varWithFallback('border')};
    border-radius: 8px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    
    &:hover {
        background-color: ${varWithFallback('secondary-hover')};
        border-color: ${varWithFallback('accent')};
    }
    
    &:focus {
        outline: 2px solid ${varWithFallback('accent')};
        outline-offset: 1px;
    }
`;

const IconWrapper = styled.div`
    color: ${varWithFallback('accent')};
    width: 20px;
    height: 20px;
`;

const StarterTitle = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: ${varWithFallback('foreground')};
`;

const StarterDescription = styled.div`
    font-size: 12px;
    color: ${varWithFallback('description')};
    line-height: 1.4;
`;

interface EmptyChatBodyProps {
    showOnboardingCard?: boolean;
}

export const EmptyChatBody: React.FC<EmptyChatBodyProps> = ({ showOnboardingCard }) => {
    const conversationStarters = [
        {
            icon: <CodeBracketIcon />,
            title: "Debug my code",
            description: "Help me find and fix bugs in my code"
        },
        {
            icon: <BeakerIcon />,
            title: "Write tests",
            description: "Generate unit tests for my functions"
        },
        {
            icon: <DocumentTextIcon />,
            title: "Explain this code",
            description: "Break down how this code works"
        },
        {
            icon: <AcademicCapIcon />,
            title: "Learn a concept",
            description: "Teach me programming concepts"
        }
    ];
    
    return (
        <Container>
            <Title>Start a new conversation</Title>
            <Subtitle>
                Ask Claude anything about your code, or try one of these suggestions
            </Subtitle>
            
            <StartersGrid>
                {conversationStarters.map((starter, index) => (
                    <StarterCard
                        key={index}
                        onClick={() => {
                            // TODO: Populate input with starter prompt
                            console.log('Starter clicked:', starter.title);
                        }}
                    >
                        <IconWrapper>{starter.icon}</IconWrapper>
                        <StarterTitle>{starter.title}</StarterTitle>
                        <StarterDescription>{starter.description}</StarterDescription>
                    </StarterCard>
                ))}
            </StartersGrid>
        </Container>
    );
};