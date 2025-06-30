import React from 'react';

interface GradientBorderProps {
  isStreaming: boolean;
  isFocused?: boolean;
  hasLump?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const GradientBorder: React.FC<GradientBorderProps> = ({ 
  isStreaming, 
  isFocused = false,
  hasLump = false,
  children,
  className = ''
}) => {
  // Build className string based on conditions
  const classes = [
    isStreaming ? 'glowing-border' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};