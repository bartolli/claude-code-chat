import React from 'react';
import { varWithFallback } from '../styles/theme';

interface IconProps {
    icon: React.ComponentType<{ className?: string }>;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    color?: 'default' | 'muted' | 'success' | 'error' | 'warning';
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
};

const colorClasses = {
    default: '',
    muted: 'opacity-60',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400'
};

export const Icon: React.FC<IconProps> = ({ 
    icon: IconComponent, 
    className = '', 
    size = 'md',
    color = 'default'
}) => {
    const classes = `${sizeClasses[size]} ${colorClasses[color]} ${className}`.trim();
    
    return <IconComponent className={classes} />;
};