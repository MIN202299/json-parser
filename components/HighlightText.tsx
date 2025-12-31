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
          <span 
            key={i} 
            className="search-match"
            data-search-match="true"
          >
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