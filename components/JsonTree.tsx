import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { JsonValue, JsonObject, JsonArray } from '../types';
import HighlightText from './HighlightText';

interface JsonTreeProps {
  data: JsonValue;
  name?: string;
  isLast?: boolean;
  depth?: number;
  searchQuery?: string;
}

// Helper to check if data contains the search query recursively
const containsMatch = (data: JsonValue, query: string, keyName?: string): boolean => {
  if (!query) return false;
  const q = query.toLowerCase();
  
  // Check key match
  if (keyName && keyName.toLowerCase().includes(q)) return true;

  // Check primitive value match
  if (typeof data === 'string' && data.toLowerCase().includes(q)) return true;
  if (typeof data === 'number' && String(data).includes(q)) return true;
  if (typeof data === 'boolean' && String(data).includes(q)) return true;

  // Check object/array children
  if (data !== null && typeof data === 'object') {
    return Object.entries(data).some(([key, value]) => 
      containsMatch(value, query, key)
    );
  }

  return false;
};

const JsonTree: React.FC<JsonTreeProps> = ({ 
  data, 
  name, 
  isLast = true, 
  depth = 0,
  searchQuery = ''
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2);

  // Determine if this node or its children have a match
  const hasMatch = useMemo(() => {
    return containsMatch(data, searchQuery, name);
  }, [data, searchQuery, name]);

  // Auto-expand if search query exists and there is a match deep inside
  useEffect(() => {
    if (searchQuery && hasMatch) {
      setIsExpanded(true);
    } else if (!searchQuery) {
      // Optional: Reset to default state or keep current. 
      // Keeping current is usually better UX, but here we revert to default depth logic if cleared
      // to avoid clutter, or just leave it. Let's leave it as user controlled unless searching.
      if (depth < 2) setIsExpanded(true);
    }
  }, [searchQuery, hasMatch, depth]);

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data as object).length === 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderValue = (val: JsonValue) => {
    if (val === null) return <span className="text-rose-400">null</span>;
    if (typeof val === 'boolean') return <HighlightText text={val.toString()} query={searchQuery} className="text-purple-400" />;
    if (typeof val === 'number') return <HighlightText text={val.toString()} query={searchQuery} className="text-blue-400" />;
    if (typeof val === 'string') return (
      <span className="text-emerald-400">
        "<HighlightText text={val} query={searchQuery} className="text-emerald-400" />"
      </span>
    );
    return null;
  };

  const renderSuffix = () => {
    if (isLast) return null;
    return <span className="text-slate-500">,</span>;
  };

  const renderKey = () => {
    if (!name) return null;
    return (
      <span className="text-sky-300 mr-1">
        "<HighlightText text={name} query={searchQuery} className="text-sky-300" />":
      </span>
    );
  };

  if (!isObject) {
    return (
      <div className={`font-mono text-sm leading-6 hover:bg-slate-800/30 px-1 rounded ${searchQuery && hasMatch ? 'bg-indigo-900/20' : ''}`}>
        {renderKey()}
        {renderValue(data)}
        {renderSuffix()}
      </div>
    );
  }

  const keys = Object.keys(data as JsonObject | JsonArray);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  if (isEmpty) {
    return (
      <div className="font-mono text-sm leading-6 hover:bg-slate-800/30 px-1 rounded">
         {renderKey()}
         <span className="text-slate-400">{openBracket}{closeBracket}</span>
         {renderSuffix()}
      </div>
    );
  }

  return (
    <div className="font-mono text-sm">
      <div 
        className={`flex items-center cursor-pointer hover:bg-slate-800/50 rounded px-1 select-none transition-colors ${searchQuery && hasMatch ? 'bg-indigo-900/10' : ''}`}
        onClick={handleToggle}
      >
        <span className={`mr-1 transition-colors ${searchQuery && hasMatch ? 'text-indigo-400' : 'text-slate-500'}`}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {renderKey()}
        <span className="text-slate-400">{openBracket}</span>
        {!isExpanded && (
           <span className="text-slate-600 ml-1 text-xs italic">
             {isArray ? `${keys.length} items` : `${keys.length} keys`}
           </span>
        )}
        {!isExpanded && <span className="text-slate-400 ml-1">{closeBracket}</span>}
        {!isExpanded && renderSuffix()}
      </div>

      {isExpanded && (
        <div className="pl-4 border-l border-slate-700/50 ml-1.5 my-1">
          {keys.map((key, index) => {
            const value = (data as any)[key];
            return (
              <JsonTree
                key={key}
                name={isArray ? undefined : key}
                data={value}
                isLast={index === keys.length - 1}
                depth={depth + 1}
                searchQuery={searchQuery}
              />
            );
          })}
        </div>
      )}
      
      {isExpanded && (
        <div className="pl-6 hover:bg-slate-800/30 rounded px-1">
            <span className="text-slate-400">{closeBracket}</span>
            {renderSuffix()}
        </div>
      )}
    </div>
  );
};

export default JsonTree;
