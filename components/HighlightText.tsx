import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className = '' }) => {
  if (!query) return <span className={className}>{text}</span>;

  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-yellow-500/40 text-yellow-100 rounded-[2px] px-0.5 font-bold shadow-[0_0_8px_rgba(234,179,8,0.2)]">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

export default HighlightText;
