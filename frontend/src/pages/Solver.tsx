import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resourcesApi } from '../api/resources';
import { solverApi } from '../api/solver';
import { Send, Zap, BookOpen, User, Bot, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Solver() {
  const [question, setQuestion] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch ready resources
  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesApi.list,
  });

  const readyResources = resources?.filter(r => r.status === 'ready') || [];

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

    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsStreaming(true);

    // Placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await solverApi.ask({
        content: userMessage.content,
        resource_ids: selectedResources,
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
                } else if (data.error) {
                  toast.error(data.error);
                }
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
      setMessages(prev => prev.slice(0, -1)); // Remove assistant placeholder
    } finally {
      setIsStreaming(false);
    }
  };

  const toggleResource = (id: string) => {
    setSelectedResources(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-6xl mx-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-2">
        <Zap className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PYQ Solver</h1>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar: Resource Selector */}
        <div className="w-64 flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Select Context
            </h2>
            {readyResources.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No processed resources found. Upload and wait for "Ready" status.</p>
            ) : (
              <div className="space-y-2">
                {readyResources.map(res => (
                  <button
                    key={res.id}
                    onClick={() => toggleResource(res.id)}
                    className={clsx(
                      "w-full text-left p-3 rounded-lg text-sm transition-all border",
                      selectedResources.includes(res.id)
                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 shadow-sm"
                        : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:bg-gray-900"
                    )}
                  >
                    <p className="font-medium truncate">{res.filename}</p>
                    <p className="text-[10px] uppercase opacity-60">{res.type}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <Zap className="w-12 h-12 opacity-20" />
                <p>Pick a resource and ask any question about it!</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={clsx("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === 'user' ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  )}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={clsx(
                    "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 rounded-tl-none prose dark:prose-invert prose-blue"
                  )}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.role === 'assistant' && !msg.content && isStreaming && (
                       <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
            <form onSubmit={handleAsk} className="relative">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk(e);
                  }
                }}
                placeholder="Ask something about your study materials..."
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none dark:text-white"
                rows={3}
              />
              <button
                type="submit"
                disabled={isStreaming || !question.trim() || selectedResources.length === 0}
                className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
            <p className="mt-2 text-[10px] text-gray-400 text-center uppercase tracking-widest">
              Powered by OpenRouter AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
