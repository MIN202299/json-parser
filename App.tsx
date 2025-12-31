import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  X,
  ChevronUp,
  ChevronDown,
  Layers
} from 'lucide-react';
import JsonTree from './components/JsonTree';
import ActionButton from './components/ActionButton';
import HistoryPanel from './components/HistoryPanel';
import HighlightText from './components/HighlightText';
import { ParseResult, ViewMode, AiAction, HistoryItem, RecursiveConfig, JsonValue } from './types';
import { fixInvalidJson, generateTypeScriptInterfaces } from './services/geminiService';

const DEFAULT_JSON = `{
  "project": "Nexus JSON Forge",
  "config_string": "{\\"debug\\": true, \\"levels\\": [1, 2, 3]}",
  "nested_payload": "{\\"user\\": {\\"id\\": 123, \\"meta\\": \\"{\\\\\\"theme\\\\\\": \\\\\\"dark\\\\\\"}\\"}}",
  "active": true
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
  
  // Recursive Parsing Config
  const [recursiveConfig, setRecursiveConfig] = useState<RecursiveConfig>({
    enabled: true,
    maxDepth: 3
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Recursive Parsing Logic ---
  const processRecursive = useCallback((data: any, currentDepth: number, maxDepth: number): any => {
    if (currentDepth >= maxDepth) return data;

    // Handle Strings that might be JSON
    if (typeof data === 'string' && (data.trim().startsWith('{') || data.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(data);
        return processRecursive(parsed, currentDepth + 1, maxDepth);
      } catch {
        return data;
      }
    }

    // Handle Arrays
    if (Array.isArray(data)) {
      return data.map(item => processRecursive(item, currentDepth, maxDepth));
    }

    // Handle Objects
    if (data !== null && typeof data === 'object') {
      const result: any = {};
      for (const key in data) {
        result[key] = processRecursive(data[key], currentDepth, maxDepth);
      }
      return result;
    }

    return data;
  }, []);

  // Compute the final data to display based on recursive config
  const displayData = useMemo(() => {
    if (!parseResult.data || !recursiveConfig.enabled) return parseResult.data;
    return processRecursive(parseResult.data, 0, recursiveConfig.maxDepth);
  }, [parseResult.data, recursiveConfig, processRecursive]);

  // Global Keybindings (Cmd+F)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Initialize History
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsedHistory: HistoryItem[] = JSON.parse(stored);
        const now = Date.now();
        const cutoff = now - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
        const validHistory = parsedHistory.filter(item => item.timestamp > cutoff);
        setHistory(validHistory);
        if (validHistory.length !== parsedHistory.length) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
        }
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Parse JSON from Input
  useEffect(() => {
    try {
      if (!input.trim()) {
        setParseResult({ valid: true, data: null, error: null });
        return;
      }
      const parsed = JSON.parse(input);
      setParseResult({ valid: true, data: parsed, error: null });

      // Auto-save to history if valid and significant changes made
      if (parsed && input.length > 5) {
        const timer = setTimeout(() => {
          setHistory(prev => {
            const alreadyExists = prev.some(h => h.content === input);
            if (alreadyExists) return prev;
            
            const newItem: HistoryItem = {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              content: input
            };
            const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
            return updated;
          });
        }, 3000);
        return () => clearTimeout(timer);
      }
    } catch (e: any) {
      setParseResult({ valid: false, data: null, error: e.message });
    }
  }, [input]);

  // Handle Search Result Indexing
  useEffect(() => {
    if (!searchQuery) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      return;
    }
    const timer = setTimeout(() => {
      const matches = document.querySelectorAll('[data-search-match="true"]');
      setTotalMatches(matches.length);
      if (matches.length > 0) {
        setCurrentMatchIndex(1);
        updateActiveMatch(0);
      } else {
        setCurrentMatchIndex(0);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, input, displayData, viewMode]);

  const updateActiveMatch = (index: number) => {
    const matches = document.querySelectorAll('[data-search-match="true"]');
    matches.forEach(m => m.classList.remove('search-match-active'));
    if (matches[index]) {
      const activeEl = matches[index];
      activeEl.classList.add('search-match-active');
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (totalMatches === 0) return;
    let nextIndex = direction === 'next' ? currentMatchIndex : currentMatchIndex - 2;
    if (nextIndex >= totalMatches) nextIndex = 0;
    if (nextIndex < 0) nextIndex = totalMatches - 1;
    setCurrentMatchIndex(nextIndex + 1);
    updateActiveMatch(nextIndex);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateSearch(e.shiftKey ? 'prev' : 'next');
    }
  };

  const handleFormat = () => {
    if (parseResult.data) setInput(JSON.stringify(parseResult.data, null, 2));
  };
  const handleMinify = () => {
    if (parseResult.data) setInput(JSON.stringify(parseResult.data));
  };
  const handleClear = () => {
    setInput('');
    setGeneratedTypes(null);
  };
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') setInput(text);
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const handleAiFix = async () => {
    if (!input.trim()) return;
    setAiLoading('fix');
    try {
      const fixed = await fixInvalidJson(input);
      setInput(fixed);
    } catch (e) {
      alert("AI Repair failed.");
    } finally {
      setAiLoading('idle');
    }
  };

  const handleGenerateTypes = async () => {
    if (!parseResult.valid) return;
    setAiLoading('types');
    try {
      const types = await generateTypeScriptInterfaces(JSON.stringify(displayData));
      setGeneratedTypes(types);
      setViewMode('code');
    } catch (e) {
      alert("Type generation failed.");
    } finally {
      setAiLoading('idle');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
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
             <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded">v1.4</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden relative">
        <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0 relative">
          <HistoryPanel 
            isOpen={showHistory} 
            onClose={() => setShowHistory(false)}
            history={history}
            onSelect={(item) => { setInput(item.content); setShowHistory(false); }}
            onDelete={(id) => {
              const newH = history.filter(h => h.id !== id);
              setHistory(newH);
              localStorage.setItem(HISTORY_KEY, JSON.stringify(newH));
            }}
            onClear={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }}
          />

          <div className="h-12 border-b border-slate-800 bg-slate-900/30 flex items-center px-4 justify-between gap-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-2">
              <ActionButton icon={History} label="History" variant={showHistory ? "primary" : "secondary"} onClick={() => setShowHistory(!showHistory)} />
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
              <ActionButton icon={Maximize} label="Format" onClick={handleFormat} disabled={!parseResult.valid} />
              <ActionButton icon={Minimize} label="Minify" onClick={handleMinify} disabled={!parseResult.valid} />
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
               <ActionButton icon={Upload} label="Upload" onClick={() => fileInputRef.current?.click()} />
              <input type="file" ref={fileInputRef} className="hidden" accept=".json,.txt" onChange={handleFileUpload} />
            </div>
            <ActionButton icon={Trash2} label="Clear" variant="danger" onClick={handleClear} />
          </div>

          <div className="flex-1 relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your JSON here..."
              className="w-full h-full bg-slate-950 p-4 font-mono text-sm resize-none focus:outline-none text-slate-300 leading-6 selection:bg-indigo-500/30"
              spellCheck={false}
            />
            <div className="absolute bottom-4 right-4 pointer-events-none">
              {input && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-all ${
                  parseResult.valid ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-rose-900/20 border-rose-800 text-rose-400'
                }`}>
                  {parseResult.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span className="text-xs font-semibold">{parseResult.valid ? 'Valid JSON' : 'Invalid Syntax'}</span>
                </div>
              )}
            </div>
          </div>

          {!parseResult.valid && input && (
            <div className="bg-rose-950/30 border-t border-rose-900/50 p-4 flex flex-col gap-2 animate-in slide-in-from-bottom-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                   <p className="text-rose-200 text-sm font-medium">Syntax Error</p>
                   <p className="text-rose-300/80 text-xs font-mono mt-1">{parseResult.error}</p>
                </div>
                <ActionButton icon={Wand2} label="Fix with AI" variant="ai" onClick={handleAiFix} loading={aiLoading === 'fix'} />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-slate-925 min-w-0">
          <div className="h-12 border-b border-slate-800 bg-slate-900/30 flex items-center px-4 justify-between gap-4 shrink-0 overflow-x-auto no-scrollbar">
            {/* Left side: View Modes and Recursive Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex bg-slate-800 rounded-md p-1 gap-1">
                <button onClick={() => setViewMode('tree')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${viewMode === 'tree' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><FileJson size={13} /> Tree</button>
                <button onClick={() => { setViewMode('code'); setGeneratedTypes(null); }} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${viewMode === 'code' && !generatedTypes ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><FileCode size={13} /> Raw</button>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/40 px-2 py-1 rounded border border-slate-700/50">
                <button 
                  onClick={() => setRecursiveConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase transition-colors ${recursiveConfig.enabled ? 'text-indigo-400' : 'text-slate-500'}`}
                  title="Toggle Recursive Parsing"
                >
                  <Layers size={13} />
                  <span className="hidden sm:inline">Recursive</span>
                </button>
                {recursiveConfig.enabled && (
                  <div className="flex items-center gap-1.5 border-l border-slate-700/50 pl-2">
                    <input 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={recursiveConfig.maxDepth}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 1;
                        setRecursiveConfig(prev => ({ ...prev, maxDepth: Math.min(10, Math.max(1, val)) }));
                      }}
                      className="bg-slate-900 border border-slate-700/50 rounded text-[10px] font-bold text-center text-indigo-300 w-6 h-5 focus:outline-none focus:border-indigo-500/50"
                      title="Recursive Depth (1-10)"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Spacer to push search to the right */}
            <div className="flex-1"></div>
            
            {/* Right side: Search Bar and Actions */}
             <div className="w-full max-w-sm relative flex items-center bg-slate-900 border border-slate-700 rounded-md transition-all focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50">
                <div className="pl-2.5 text-slate-500"><Search size={14} /></div>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Find (Cmd+F)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="flex-1 bg-transparent py-1.5 px-2 text-xs text-slate-200 focus:outline-none placeholder:text-slate-600 min-w-[120px]"
                />
                
                {searchQuery && (
                  <div className="flex items-center gap-1 px-2 shrink-0 border-l border-slate-800 ml-1">
                    <span className="text-[10px] font-mono text-slate-500 mr-1 select-none">
                      {totalMatches > 0 ? `${currentMatchIndex}/${totalMatches}` : '0/0'}
                    </span>
                    <button onClick={() => navigateSearch('prev')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"><ChevronUp size={14} /></button>
                    <button onClick={() => navigateSearch('next')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"><ChevronDown size={14} /></button>
                    <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                )}
             </div>

            <div className="flex items-center gap-2 shrink-0">
              <ActionButton icon={Code2} label="TS" variant="ghost" onClick={handleGenerateTypes} loading={aiLoading === 'types'} disabled={!parseResult.valid} className="px-2!" />
              <div className="w-px h-6 bg-slate-700 mx-0.5"></div>
              <ActionButton icon={Copy} label="Copy" variant="primary" onClick={() => handleCopy(viewMode === 'code' && generatedTypes ? generatedTypes : JSON.stringify(displayData, null, 2) || '')} disabled={!parseResult.valid && !generatedTypes} className="px-2!" />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-slate-900/20">
            {viewMode === 'tree' ? (
               parseResult.valid && displayData !== null ? (
                <div className="animate-in fade-in duration-300">
                  <JsonTree data={displayData} searchQuery={searchQuery} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                   <Braces size={48} className="opacity-20 mb-4" />
                   <p className="text-sm">Enter valid JSON to view the tree structure</p>
                </div>
              )
            ) : (
              <div className="h-full relative overflow-auto">
                <pre className="w-full h-full bg-transparent font-mono text-sm text-slate-300 p-0 m-0 whitespace-pre-wrap">
                  <HighlightText text={generatedTypes || (displayData ? JSON.stringify(displayData, null, 2) : '')} query={searchQuery} />
                </pre>
              </div>
            )}
          </div>
          
          <div className="h-8 border-t border-slate-800 bg-slate-950 flex items-center px-4 text-[10px] font-medium text-slate-500 justify-between select-none shrink-0">
             <div className="flex gap-4">
                <span>INPUT SIZE: {new Blob([input]).size} B</span>
                {recursiveConfig.enabled && <span className="text-indigo-500">RECURSIVE MODE ACTIVE</span>}
             </div>
             <div>
                {aiLoading !== 'idle' ? (
                  <span className="flex items-center gap-2 text-indigo-400 animate-pulse">
                    GEMINI AI PROCESSING...
                  </span>
                ) : (
                  <span>READY</span>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;