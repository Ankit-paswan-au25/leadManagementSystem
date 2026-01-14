import React from 'react';

export interface SkeletonProps {
  className?: string;
  lines?: number;
  rows?: number; // Alias for lines for backward compatibility
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', lines, rows }) => {
  const lineCount = lines || rows || 1;
  if (lineCount > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lineCount }).map((_, index) => (
          <div
            key={index}
            className={`h-4 bg-background-tertiary rounded animate-pulse ${className}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`h-4 bg-background-tertiary rounded animate-pulse ${className}`} />
  );
};

export default Skeleton;

