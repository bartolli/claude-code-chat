import React from 'react';
import { AnimatedEllipsis as StyledAnimatedEllipsis } from './styled';

interface AnimatedEllipsisProps {
    // No props needed, it's a pure CSS animation
}

export const AnimatedEllipsis: React.FC<AnimatedEllipsisProps> = () => {
    return <StyledAnimatedEllipsis />;
};