import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { JsonValue, JsonObject, JsonArray } from '../types';

interface JsonTreeProps {
  data: JsonValue;
  name?: string;
  isLast?: boolean;
  depth?: number;
}

const JsonTree: React.FC<JsonTreeProps> = ({ data, name, isLast = true, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2); // Auto-expand first 2 levels

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data as object).length === 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderValue = (val: JsonValue) => {
    if (val === null) return <span className="text-rose-400">null</span>;
    if (typeof val === 'boolean') return <span className="text-purple-400">{val.toString()}</span>;
    if (typeof val === 'number') return <span className="text-blue-400">{val}</span>;
    if (typeof val === 'string') return <span className="text-emerald-400">"{val}"</span>;
    return null;
  };

  const renderSuffix = () => {
    if (isLast) return null;
    return <span className="text-slate-500">,</span>;
  };

  if (!isObject) {
    return (
      <div className="font-mono text-sm leading-6 hover:bg-slate-800/30 px-1 rounded">
        {name && <span className="text-sky-300 mr-1">"{name}":</span>}
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
         {name && <span className="text-sky-300 mr-1">"{name}":</span>}
         <span className="text-slate-400">{openBracket}{closeBracket}</span>
         {renderSuffix()}
      </div>
    );
  }

  return (
    <div className="font-mono text-sm">
      <div 
        className="flex items-center cursor-pointer hover:bg-slate-800/50 rounded px-1 select-none"
        onClick={handleToggle}
      >
        <span className="text-slate-500 mr-1">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {name && <span className="text-sky-300 mr-1">"{name}":</span>}
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