import React from 'react';
import { X, Clock, Trash2, RotateCcw } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect, 
  onDelete, 
  onClear 
}) => {
  if (!isOpen) return null;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 24 hours
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="absolute top-0 left-0 bottom-0 w-80 bg-slate-900 border-r border-slate-700 shadow-2xl z-20 flex flex-col animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-slate-200 font-medium">
          <Clock size={18} className="text-indigo-400" />
          <span>History</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-800"
        >
          <X size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <Clock size={32} className="opacity-20 mb-3" />
            <p className="text-sm">No history yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Valid JSON edits are automatically saved here (max 7 days).
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="group p-4 hover:bg-slate-800/50 transition-colors cursor-pointer relative"
                onClick={() => onSelect(item)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-slate-400">
                    {formatTime(item.timestamp)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete item"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-300 line-clamp-3 break-all leading-relaxed opacity-80 group-hover:opacity-100">
                  {item.content.slice(0, 300)}
                </div>
                <div className="mt-2 flex items-center text-indigo-400 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <RotateCcw size={10} className="mr-1" />
                  Click to restore
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {history.length > 0 && (
        <div className="p-3 border-t border-slate-800 bg-slate-900 shrink-0">
          <button
            onClick={onClear}
            className="w-full flex items-center justify-center gap-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 py-2 rounded transition-colors"
          >
            <Trash2 size={14} />
            Clear All History
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
