import React from 'react';
import { Button as StyledButton, SecondaryButton as StyledSecondaryButton, GhostButton as StyledGhostButton, ButtonSubtext } from './styled';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    subtext?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
    variant = 'primary', 
    children, 
    subtext,
    ...props 
}) => {
    const ButtonComponent = variant === 'secondary' ? StyledSecondaryButton :
                          variant === 'ghost' ? StyledGhostButton :
                          StyledButton;

    return (
        <ButtonComponent {...props}>
            {children}
            {subtext && <ButtonSubtext>{subtext}</ButtonSubtext>}
        </ButtonComponent>
    );
};