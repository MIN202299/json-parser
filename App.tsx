import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Braces, 
  Trash2, 
  Copy, 
  Minimize, 
  Maximize, 
  FileJson, 
  AlertCircle, 
  Wand2, 
  Code2, 
  FileCode,
  CheckCircle2,
  Upload,
  History,
  Search,
  X
} from 'lucide-react';
import JsonTree from './components/JsonTree';
import ActionButton from './components/ActionButton';
import HistoryPanel from './components/HistoryPanel';
import HighlightText from './components/HighlightText';
import { ParseResult, ViewMode, AiAction, HistoryItem } from './types';
import { fixInvalidJson, generateTypeScriptInterfaces } from './services/geminiService';

const DEFAULT_JSON = `{
  "project": "Nexus JSON Forge",
  "active": true,
  "version": 1.0,
  "features": [
    "Syntax Highlighting",
    "Tree Visualization",
    "AI Repair",
    "Type Generation"
  ],
  "author": {
    "role": "Engineer",
    "skills": ["React", "TypeScript", "Tailwind"]
  },
  "metrics": null
}`;

const HISTORY_KEY = 'nexus_json_history';
const MAX_HISTORY_DAYS = 7;
const MAX_HISTORY_ITEMS = 50;

const App: React.FC = () => {
  const [input, setInput] = useState<string>(DEFAULT_JSON);
  const [parseResult, setParseResult] = useState<ParseResult>({ valid: true, data: null, error: null });
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [aiLoading, setAiLoading] = useState<AiAction>('idle');
  const [generatedTypes, setGeneratedTypes] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize History on Mount (Cleanup older than 7 days)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsedHistory: HistoryItem[] = JSON.parse(stored);
        const now = Date.now();
        const cutoff = now - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
        
        // Filter valid items within 7 days
        const validHistory = parsedHistory.filter(item => item.timestamp > cutoff);
        
        setHistory(validHistory);
        
        // Update storage if cleanup happened
        if (validHistory.length !== parsedHistory.length) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
        }
      }
    } catch (e) {
      console.error("Failed to load history", e);
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  // Parse JSON effect
  useEffect(() => {
    try {
      if (!input.trim()) {
        setParseResult({ valid: true, data: null, error: null });
        return;
      }
      const parsed = JSON.parse(input);
      setParseResult({ valid: true, data: parsed, error: null });
    } catch (e: any) {
      setParseResult({ valid: false, data: null, error: e.message });
    }
  }, [input]);

  // Auto-save to History Effect (Debounced)
  useEffect(() => {
    if (!parseResult.valid || !input.trim()) return;

    const timeoutId = setTimeout(() => {
      setHistory(prev => {
        // Don't save if it's identical to the latest entry
        if (prev.length > 0 && prev[0].content === input) {
          return prev;
        }

        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          content: input
        };

        const newHistory = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
    }, 2000); // Wait 2 seconds of inactivity before saving

    return () => clearTimeout(timeoutId);
  }, [input, parseResult.valid]);

  // Actions
  const handleFormat = () => {
    if (parseResult.data) {
      setInput(JSON.stringify(parseResult.data, null, 2));
    }
  };

  const handleMinify = () => {
    if (parseResult.data) {
      setInput(JSON.stringify(parseResult.data));
    }
  };

  const handleClear = () => {
    setInput('');
    setGeneratedTypes(null);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // Could add toast here
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInput(text);
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // History Actions
  const handleRestoreHistory = (item: HistoryItem) => {
    setInput(item.content);
    setShowHistory(false);
  };

  const handleDeleteHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  // AI Actions
  const handleAiFix = async () => {
    if (!input.trim()) return;
    setAiLoading('fix');
    try {
      const fixed = await fixInvalidJson(input);
      setInput(fixed);
    } catch (e) {
      alert("AI Repair failed. Please try again.");
    } finally {
      setAiLoading('idle');
    }
  };

  const handleGenerateTypes = async () => {
    if (!parseResult.valid) return;
    setAiLoading('types');
    try {
      const types = await generateTypeScriptInterfaces(input);
      setGeneratedTypes(types);
      setViewMode('code'); // Switch to view types
    } catch (e) {
      alert("Type generation failed.");
    } finally {
      setAiLoading('idle');
    }
  };

  // Render logic for the Code view to support highlighting
  const renderCodeView = () => {
    const content = generatedTypes || (parseResult.data ? JSON.stringify(parseResult.data, null, 2) : '');
    
    return (
      <div className="h-full relative overflow-auto">
        <pre className="w-full h-full bg-transparent font-mono text-sm text-slate-300 p-0 m-0 whitespace-pre-wrap">
          <HighlightText text={content} query={searchQuery} />
        </pre>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
              <Braces className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">Nexus JSON Forge</h1>
              <p className="text-xs text-slate-400">Intelligent JSON Toolkit</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              v1.1.0
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden relative">
        
        {/* Editor Pane (Left) */}
        <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0 relative">
          
          {/* History Panel Overlay */}
          <HistoryPanel 
            isOpen={showHistory} 
            onClose={() => setShowHistory(false)}
            history={history}
            onSelect={handleRestoreHistory}
            onDelete={handleDeleteHistory}
            onClear={handleClearHistory}
          />

          {/* Toolbar */}
          <div className="h-12 border-b border-slate-800 bg-slate-900/30 flex items-center px-4 justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2">
              <ActionButton 
                icon={History} 
                label="History" 
                variant={showHistory ? "primary" : "secondary"}
                onClick={() => setShowHistory(!showHistory)} 
              />
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
              <ActionButton 
                icon={Maximize} 
                label="Format" 
                onClick={handleFormat} 
                disabled={!parseResult.valid}
              />
              <ActionButton 
                icon={Minimize} 
                label="Minify" 
                onClick={handleMinify} 
                disabled={!parseResult.valid}
              />
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
               <ActionButton 
                icon={Upload} 
                label="Upload" 
                onClick={() => fileInputRef.current?.click()} 
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json,.txt" 
                onChange={handleFileUpload}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <ActionButton 
                icon={Trash2} 
                label="Clear" 
                variant="danger" 
                onClick={handleClear} 
              />
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-1 relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your JSON here..."
              className="w-full h-full bg-slate-950 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-slate-300 leading-6"
              spellCheck={false}
            />
            {/* Validation Badge Overlay */}
            <div className="absolute bottom-4 right-4 pointer-events-none">
              {input && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-md ${
                  parseResult.valid 
                    ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' 
                    : 'bg-rose-900/20 border-rose-800 text-rose-400'
                }`}>
                  {parseResult.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span className="text-xs font-semibold">
                    {parseResult.valid ? 'Valid JSON' : 'Invalid Syntax'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message Panel */}
          {!parseResult.valid && input && (
            <div className="bg-rose-950/30 border-t border-rose-900/50 p-4 flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                   <p className="text-rose-200 text-sm font-medium">Syntax Error</p>
                   <p className="text-rose-300/80 text-xs font-mono mt-1">{parseResult.error}</p>
                </div>
                <ActionButton 
                  icon={Wand2} 
                  label="Fix with AI" 
                  variant="ai" 
                  onClick={handleAiFix}
                  loading={aiLoading === 'fix'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Viewer Pane (Right) */}
        <div className="flex-1 flex flex-col bg-slate-925 min-w-0">
          {/* Toolbar */}
          <div className="h-12 border-b border-slate-800 bg-slate-900/30 flex items-center px-4 justify-between gap-4">
            <div className="flex bg-slate-800 rounded-md p-1 gap-1 shrink-0">
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'tree' 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileJson size={14} /> Tree
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'code' 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode size={14} /> 
                {generatedTypes ? 'TypeScript' : 'Raw'}
              </button>
            </div>
            
            {/* Search Input */}
             <div className="flex-1 max-w-xs relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Search size={14} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 pl-8 pr-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
             </div>

            <div className="flex items-center gap-2 shrink-0">
              <ActionButton 
                icon={Code2} 
                label="Gen Types" 
                variant="ghost"
                onClick={handleGenerateTypes}
                loading={aiLoading === 'types'}
                disabled={!parseResult.valid}
                title="Generate TypeScript Interfaces"
              />
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
              <ActionButton 
                icon={Copy} 
                label="Copy" 
                variant="primary" 
                onClick={() => handleCopy(
                  viewMode === 'code' && generatedTypes 
                    ? generatedTypes 
                    : JSON.stringify(parseResult.data, null, 2) || ''
                )}
                disabled={!parseResult.valid && !generatedTypes}
              />
            </div>
          </div>

          {/* Output Area */}
          <div className="flex-1 overflow-auto p-4 bg-slate-900/20">
            {viewMode === 'tree' ? (
               parseResult.valid && parseResult.data !== null ? (
                <div className="animate-in fade-in duration-300">
                  <JsonTree data={parseResult.data} searchQuery={searchQuery} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                   <Braces size={48} className="opacity-20 mb-4" />
                   <p className="text-sm">Enter valid JSON to view the tree structure</p>
                </div>
              )
            ) : (
              // Code View (Raw or Types)
              renderCodeView()
            )}
          </div>
          
          {/* Status Bar */}
          <div className="h-8 border-t border-slate-800 bg-slate-950 flex items-center px-4 text-xs text-slate-500 justify-between select-none">
             <div className="flex gap-4">
                <span>
                   Size: {new Blob([input]).size} bytes
                </span>
                {parseResult.valid && parseResult.data && typeof parseResult.data === 'object' && (
                  <span>
                    Keys: {Object.keys(parseResult.data).length} (Root)
                  </span>
                )}
             </div>
             <div>
                {aiLoading !== 'idle' ? (
                  <span className="flex items-center gap-2 text-indigo-400">
                    <Loader2 size={10} className="animate-spin" />
                    Gemini 2.5 Processing...
                  </span>
                ) : (
                  <span>Ready</span>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper for status bar loader
const Loader2 = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default App;
