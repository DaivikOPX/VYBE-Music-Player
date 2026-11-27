import React from 'react';

interface ClickSparkProps {
  children: React.ReactNode;
  sparkColor?: string;
  sparkCount?: number;
  sparkRadius?: number;
  className?: string;
}

/**
 * ClickSpark — passthrough wrapper (spark effect disabled).
 */
export const ClickSpark: React.FC<ClickSparkProps> = ({
  children,
  className = '',
}) => {
  return <div className={`inline-flex ${className}`}>{children}</div>;
};
