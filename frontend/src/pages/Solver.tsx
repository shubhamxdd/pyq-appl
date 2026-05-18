import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourcesApi } from '../api/resources';
import { solverApi, type ChatMessage } from '../api/solver';
import {
  Send,
  Zap,
  BookOpen,
  User as UserIcon,
  Bot,
  Loader2,
  ExternalLink,
  Plus,
  MessageSquare,
  Trash2,
  History,
  Edit2,
  PanelRight,
  FileText,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export default function Solver() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [showContext, setShowContext] = useState(true);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
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
      toast.success('New session created');
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => solverApi.deleteSession(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (activeSessionId === deletedId) {
        setActiveSessionId(null);
        setMessages([]);
      }
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

  // Shared Components
  const HistoryContent = () => (
    <div className="flex flex-col h-full bg-background md:bg-transparent">
      <div className="p-4 border-b">
        <Button
          onClick={() => {
            if(!createSessionMutation.isPending) createSessionMutation.mutate();
          }}
          disabled={createSessionMutation.isPending}
          className="w-full rounded-xl shadow-sm h-11"
          variant="default"
        >
          <Plus className="size-4 mr-2" />
          New Session
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <History className="size-3" />
            Recent Conversations
          </div>
          {sessionsLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/40 animate-pulse rounded-lg" />)}
            </div>
          ) : sessions?.length === 0 ? (
            <div className="py-12 text-center space-y-2 px-6">
              <MessageSquare className="size-8 mx-auto opacity-10" />
              <p className="text-xs text-muted-foreground">Your chat history will appear here.</p>
            </div>
          ) : (
            sessions?.map(sess => (
              <div key={sess.id} className="group relative">
                {editingSessionId === sess.id ? (
                  <div className="px-2 py-1">
                    <Input
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      className="h-9 text-xs focus-visible:ring-primary rounded-lg pr-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSession(sess.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveSessionId(sess.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-xl text-sm transition-all flex items-center gap-3",
                      activeSessionId === sess.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <MessageSquare className={cn("size-4 flex-shrink-0", activeSessionId === sess.id ? "opacity-100" : "opacity-40")} />
                    <span className="truncate pr-8">{sess.title}</span>
                  </button>
                )}
                
                {editingSessionId !== sess.id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-7 text-muted-foreground hover:text-primary"
                      onClick={() => startRenamingSession(sess.id, sess.title)}
                    >
                      <Edit2 className="size-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if(window.confirm('Delete this conversation?')) deleteSessionMutation.mutate(sess.id); 
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )

  const ContextContent = () => (
    <div className="flex flex-col h-full bg-background md:bg-transparent">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <BookOpen className="size-3.5" />
          Document Library
        </h3>
        <Badge variant="outline" className="text-[10px] h-5">
          {readyResources.length} Ready
        </Badge>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {readyResources.length === 0 ? (
            <div className="py-12 text-center space-y-3 px-6 text-muted-foreground">
              <FileText className="size-10 mx-auto opacity-10" />
              <p className="text-xs italic">Upload documents to begin.</p>
            </div>
          ) : (
            readyResources.map(res => (
              <div key={res.id} className="relative group">
                <button
                  onClick={() => toggleResource(res.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl text-xs transition-all border-2 relative overflow-hidden group/item",
                    selectedResources.includes(res.id)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-muted bg-background hover:bg-muted/5 shadow-none"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      selectedResources.includes(res.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover/item:bg-muted-foreground/10"
                    )}>
                       <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-[13px]">{res.filename}</p>
                      <p className="mt-1 text-[10px] uppercase font-mono opacity-50">{res.type}</p>
                    </div>
                  </div>
                </button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="absolute right-2 top-2 size-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t hidden md:block">
         <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
               <span className="font-bold text-primary mr-1">Tip:</span>
               Combine multiple sources for better answers.
            </p>
         </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] gap-4 animate-in fade-in duration-500 relative">
      {/* --- DESKTOP HISTORY SIDEBAR --- */}
      <aside className={cn(
        "hidden md:flex flex-col border rounded-2xl bg-muted overflow-hidden shadow-sm transition-all duration-300",
        isHistoryCollapsed ? "w-16" : "w-72"
      )}>

        {isHistoryCollapsed ? (
          <div className="flex flex-col items-center py-4 gap-4">
             <Button variant="ghost" size="icon" onClick={() => setIsHistoryCollapsed(false)}>
                <PanelLeftOpen className="size-5" />
             </Button>
             <Button variant="default" size="icon" className="rounded-xl shadow-md" onClick={() => createSessionMutation.mutate()}>
                <Plus className="size-5" />
             </Button>
             <Separator />
             <History className="size-4 text-muted-foreground opacity-50" />
          </div>
        ) : (
          <div className="relative h-full flex flex-col">
             <div className="p-4 border-b flex items-center gap-2">
                <Button
                  onClick={() => createSessionMutation.mutate()}
                  className="flex-1 rounded-xl shadow-sm h-10"
                  variant="default"
                >
                  <Plus className="size-4 mr-2" />
                  New Session
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-10 hover:bg-muted shrink-0"
                  onClick={() => setIsHistoryCollapsed(true)}
                >
                  <PanelLeftClose className="size-4" />
                </Button>
             </div>
             <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-1">
                    <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <History className="size-3" />
                      Recent Conversations
                    </div>
                    {sessionsLoading ? (
                      <div className="space-y-2 p-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/40 animate-pulse rounded-lg" />)}
                      </div>
                    ) : sessions?.length === 0 ? (
                      <div className="py-12 text-center space-y-2 px-6">
                        <MessageSquare className="size-8 mx-auto opacity-10" />
                        <p className="text-xs text-muted-foreground">Your chat history will appear here.</p>
                      </div>
                    ) : (
                      sessions?.map(sess => (
                        <div key={sess.id} className="group relative">
                          {editingSessionId === sess.id ? (
                            <div className="px-2 py-1">
                              <Input
                                value={newSessionTitle}
                                onChange={(e) => setNewSessionTitle(e.target.value)}
                                className="h-9 text-xs focus-visible:ring-primary rounded-lg pr-8"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameSession(sess.id);
                                  if (e.key === 'Escape') setEditingSessionId(null);
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveSessionId(sess.id)}
                              className={cn(
                                "w-full text-left px-3 py-3 rounded-xl text-sm transition-all flex items-center gap-3",
                                activeSessionId === sess.id
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              )}
                            >
                              <MessageSquare className={cn("size-4 flex-shrink-0", activeSessionId === sess.id ? "opacity-100" : "opacity-40")} />
                              <span className="truncate pr-8">{sess.title}</span>
                            </button>
                          )}
                          
                          {editingSessionId !== sess.id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-7 text-muted-foreground hover:text-primary"
                                onClick={() => startRenamingSession(sess.id, sess.title)}
                              >
                                <Edit2 className="size-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if(window.confirm('Delete this conversation?')) deleteSessionMutation.mutate(sess.id); 
                                }}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
             </div>
          </div>
        )}
      </aside>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-card border rounded-2xl overflow-hidden shadow-sm relative">
        {/* Chat Header */}
        <div className="h-14 md:h-16 border-b flex items-center justify-between px-4 md:px-6 bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/* Mobile History Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <SheetHeader className="p-4 border-b">
                   <SheetTitle>Chat History</SheetTitle>
                </SheetHeader>
                <HistoryContent />
              </SheetContent>
            </Sheet>

            <div className="bg-primary/10 p-2 rounded-lg hidden xs:flex">
              <Zap className="size-4 md:size-5 text-primary" />
            </div>
            <h2 className="font-bold text-sm md:text-lg truncate">
              {activeSessionId ? sessions?.find(s => s.id === activeSessionId)?.title : 'New Chat'}
            </h2>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <Badge variant="secondary" className="rounded-lg px-2 md:px-3 py-1 bg-muted/50 font-medium text-[10px] md:text-xs">
              <BookOpen className="size-3 mr-1 md:mr-2 opacity-60 hidden xs:inline" />
              {selectedResources.length} Sources
            </Badge>
            
            {/* Desktop Context Toggle */}
            <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setShowContext(!showContext)}>
               <PanelRight className={cn("size-5 transition-colors", showContext ? "text-primary" : "text-muted-foreground")} />
            </Button>

            {/* Mobile Context Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                  <BookOpen className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-80">
                <SheetHeader className="p-4 border-b">
                   <SheetTitle>Resources</SheetTitle>
                </SheetHeader>
                <ContextContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Message List */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pb-38 md:pb-38">
            {activeSessionId && historyLoading ? (
               <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
                  <Loader2 className="size-8 animate-spin text-primary opacity-20" />
                  <p className="text-sm text-muted-foreground animate-pulse">Retrieving conversation...</p>
               </div>
            ) : messages.length === 0 ? (
              <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6 max-w-sm mx-auto">
                <div className="size-16 md:size-20 bg-primary/5 rounded-3xl flex items-center justify-center relative">
                  <Zap className="size-8 md:size-10 text-primary/30 animate-pulse" />
                  <Bot className="size-6 md:size-8 absolute -top-2 -right-2 text-primary opacity-20" />
                </div>
                <div className="space-y-2 px-4">
                  <h3 className="text-lg md:text-xl font-bold tracking-tight">Ready to start?</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Select your study materials and ask any question to begin.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex gap-3 md:gap-6 animate-in slide-in-from-bottom-2 duration-300",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <Avatar className={cn(
                    "size-8 md:size-10 border shadow-sm shrink-0",
                    msg.role === 'user' ? "border-primary/20" : "border-muted"
                  )}>
                    {msg.role === 'user' ? (
                      <>
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <UserIcon className="size-4 md:size-5" />
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-muted text-foreground">
                          <Bot className="size-4 md:size-5" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>

                  <div className={cn(
                    "max-w-[90%] md:max-w-[85%] rounded-2xl px-4 py-3 md:px-6 md:py-4 shadow-sm text-sm md:text-[15px]",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-muted/30 border border-border/50 text-foreground rounded-tl-none prose dark:prose-invert prose-blue max-w-none"
                  )}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.role === 'assistant' && !msg.content && isStreaming && (
                       <div className="flex gap-1.5 mt-2 h-4 items-center">
                          <span className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="size-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                       </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-background via-background to-transparent z-10">
          <form onSubmit={handleAsk} className="max-w-3xl mx-auto">
            <div className="relative group shadow-2xl rounded-2xl bg-background border-2 border-muted overflow-hidden transition-all focus-within:border-primary">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(e);
                  }
                }}
                placeholder="Ask your tutor..."
                className="w-full bg-transparent px-4 py-3 md:px-6 md:py-4 pr-14 text-sm md:text-[15px] focus:outline-none resize-none min-h-[56px] md:min-h-[64px] max-h-[200px]"
                rows={1}
              />
              <Button
                type="submit"
                disabled={isStreaming || !question.trim() || selectedResources.length === 0}
                className="absolute right-2 bottom-2 md:right-3 md:bottom-3 size-9 md:size-10 rounded-xl shadow-lg transition-transform active:scale-90"
              >
                {isStreaming ? <Loader2 className="size-4 md:size-5 animate-spin" /> : <Send className="size-4 md:size-5" />}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-3 opacity-30 select-none hidden xs:flex">
               <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-black">Model: OWL-ALPHA</p>
               <Separator orientation="vertical" className="h-2" />
               <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-black">Grounding Engine</p>
            </div>
          </form>
        </div>
      </div>

      {/* --- DESKTOP RIGHT SIDEBAR: CONTEXT LIBRARY --- */}
      {showContext && (
        <aside className="hidden md:flex w-80 flex-col border rounded-2xl bg-muted overflow-hidden shadow-sm animate-in slide-in-from-right duration-300">
           <ContextContent />
        </aside>
      )}

    </div>
  );
}
