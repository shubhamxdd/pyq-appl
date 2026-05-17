import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourcesApi } from '../api/resources';
import { solverApi, type ChatMessage } from '../api/solver';
import { Send, Zap, BookOpen, User, Bot, Loader2, ExternalLink, Plus, MessageSquare, Trash2, History, Edit2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

export default function Solver() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- QUERIES ---
  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesApi.list,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: solverApi.listSessions,
  });

  const { data: history, isFetching: historyLoading } = useQuery({
    queryKey: ['history', activeSessionId],
    queryFn: () => activeSessionId ? solverApi.getSessionHistory(activeSessionId) : Promise.resolve([]),
    enabled: !!activeSessionId,
  });

  const readyResources = resources?.filter(r => r.status === 'ready') || [];

  // --- MUTATIONS ---
  const createSessionMutation = useMutation({
    mutationFn: solverApi.createSession,
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setActiveSessionId(newSession.id);
      setMessages([]);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: solverApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (activeSessionId) setActiveSessionId(null);
      setMessages([]);
      toast.success('Session deleted');
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => solverApi.updateSession(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setEditingSessionId(null);
      toast.success('Chat renamed');
    },
  });

  // Sync history to messages state
  useEffect(() => {
    if (history) {
      setMessages(history);
    }
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || selectedResources.length === 0 || isStreaming) {
      if (selectedResources.length === 0) toast.error('Please select at least one resource.');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: question, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsStreaming(true);

    // Assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', created_at: new Date().toISOString() }]);

    try {
      const response = await solverApi.ask({
        content: userMessage.content,
        resource_ids: selectedResources,
        session_id: activeSessionId || undefined,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to connect to solver.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  accumulatedResponse += data.chunk;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = accumulatedResponse;
                    return newMessages;
                  });
                }
                if (data.session_id && !activeSessionId) {
                  setActiveSessionId(data.session_id);
                  queryClient.invalidateQueries({ queryKey: ['sessions'] });
                }
                if (data.error) toast.error(data.error);
              } catch (e) { /* ignore partial */ }
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  };

  const toggleResource = (id: string) => {
    setSelectedResources(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const startRenamingSession = (id: string, currentTitle: string) => {
    setEditingSessionId(id);
    setNewSessionTitle(currentTitle);
  };

  const handleRenameSession = (id: string) => {
    if (!newSessionTitle.trim()) return;
    renameSessionMutation.mutate({ id, title: newSessionTitle });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar: Chat History */}
      <div className="w-72 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => createSessionMutation.mutate()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            <History className="w-4 h-4" />
            Recent Chats
          </div>
          {sessionsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : sessions?.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400 italic">No history yet.</p>
          ) : (
            sessions?.map(sess => (
              <div key={sess.id} className="group relative">
                {editingSessionId === sess.id ? (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="text"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      className="bg-white dark:bg-gray-700 border border-blue-500 rounded px-2 py-1 text-xs w-full focus:outline-none dark:text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSession(sess.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveSessionId(sess.id)}
                      className={clsx(
                        "w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-start gap-3",
                        activeSessionId === sess.id
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
                      <span className="truncate pr-12">{sess.title}</span>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startRenamingSession(sess.id, sess.title)}
                        className="p-1.5 text-gray-400 hover:text-blue-500"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete chat?')) deleteSessionMutation.mutate(sess.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header / Config */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-blue-600" />
            <h2 className="font-bold text-gray-900 dark:text-white truncate max-w-md">
              {activeSessionId ? sessions?.find(s => s.id === activeSessionId)?.title : 'New Chat Session'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              {selectedResources.length} Sources Selected
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col relative">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
              {activeSessionId && historyLoading ? (
                 <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 opacity-20" /></div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-6">
                  <div className="relative">
                    <Zap className="w-16 h-12 opacity-10 text-blue-600 animate-pulse" />
                    <Bot className="w-12 h-12 absolute -top-4 -right-4 opacity-20" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-gray-500">How can I help you today?</p>
                    <p className="text-sm opacity-60">Pick your resources on the right and ask away.</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={clsx("flex gap-6", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                      msg.role === 'user' ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-blue-600 dark:text-blue-400"
                    )}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={clsx(
                      "max-w-[85%] p-5 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none prose dark:prose-invert prose-blue max-w-3xl"
                    )}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.role === 'assistant' && !msg.content && isStreaming && (
                         <div className="flex gap-1 mt-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                         </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
              <form onSubmit={handleAsk} className="max-w-4xl mx-auto relative group">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk(e);
                    }
                  }}
                  placeholder="Ask anything about your documents..."
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 pr-14 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 resize-none dark:text-white transition-all shadow-inner"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={isStreaming || !question.trim() || selectedResources.length === 0}
                  className="absolute right-3.5 bottom-3.5 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:grayscale transition-all shadow-md active:scale-95"
                >
                  {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
              <div className="mt-3 flex items-center justify-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
                 <p className="text-[9px] uppercase tracking-[0.2em] font-bold dark:text-white">Powered by OWL-ALPHA AI</p>
                 <p className="text-[9px] uppercase tracking-[0.2em] font-bold dark:text-white">Grounding Mode: ACTIVE</p>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Context Selector */}
          <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shadow-sm">
             <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Context Library
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {readyResources.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                    <p className="text-[11px] text-gray-400 italic leading-tight">Waiting for resources to be "Ready" status...</p>
                  </div>
                ) : (
                  readyResources.map(res => (
                    <div key={res.id} className="relative group">
                      <button
                        onClick={() => toggleResource(res.id)}
                        className={clsx(
                          "w-full text-left p-3 rounded-xl text-xs transition-all border leading-normal pr-8",
                          selectedResources.includes(res.id)
                            ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300 shadow-sm"
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                        )}
                      >
                        <p className="font-bold truncate">{res.filename}</p>
                        <p className="mt-0.5 opacity-50 text-[10px] uppercase font-mono">{res.type}</p>
                      </button>
                      <a
                        href={res.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
