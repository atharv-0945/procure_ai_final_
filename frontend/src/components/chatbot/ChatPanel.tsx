import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  FileText,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { sendChatMessage, getQuickActions, clearChatSession } from '../../api/client';
import type { ChatMessage, ChatSource, QuickAction } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTenderId?: number | null;
  activeBidderId?: number | null;
  activeTenderTitle?: string;
  activeBidderName?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  activeTenderId,
  activeBidderId,
  activeTenderTitle,
  activeBidderName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [showSourcesForMsg, setShowSourcesForMsg] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session ID and quick actions
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    }

    getQuickActions()
      .then((actions) => setQuickActions(actions))
      .catch(() => {
        setQuickActions([
          { id: '1', label: 'Summarize Tender', prompt: 'Summarize active tender evaluation and compliance', category: 'Overview' },
          { id: '2', label: 'Check High Risks', prompt: 'Which bidders have HIGH severity risk signals?', category: 'Risk' },
          { id: '3', label: 'Audit Compliance Gaps', prompt: 'What mandatory requirements are unfulfilled?', category: 'Compliance' },
        ]);
      });
  }, []);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `**Welcome to ProcureAI Assistant**\n\nI am your conversational intelligence advisor powered by **Grok (xAI)**. I can cross-examine tender requirements, review submitted bidder documents, analyze vigilance risks, and verify compliance matrices.\n\n*How may I assist your tender evaluation today?*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model_used: 'Grok Procurement Intelligence',
        },
      ]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const response = await sendChatMessage(
        textToSend.trim(),
        activeTenderId || null,
        activeBidderId || null,
        sessionId
      );

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources || [],
        model_used: response.model_used,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **ProcureAI Error**: Could not complete query. ${err?.message || 'Server error'}. Please verify backend status.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model_used: 'System Fallback',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (sessionId) {
      try {
        await clearChatSession(sessionId);
      } catch (e) {
        // ignore
      }
    }
    const newSession = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(newSession);
    setMessages([
      {
        id: 'reset-welcome',
        role: 'assistant',
        content: `Conversation reset. Memory cleared for new inquiry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model_used: 'Grok Procurement Intelligence',
      },
    ]);
  };

  const toggleSources = (msgId: string) => {
    setShowSourcesForMsg((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case 'bidder':
        return <Building className="w-3.5 h-3.5 text-indigo-400" />;
      case 'compliance':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <ExternalLink className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-[#0b0f19] border-l border-[#1e293b] shadow-2xl flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#1e293b] bg-[#111827] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#6366f1] flex items-center justify-center shadow-md shadow-indigo-600/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-100 text-sm font-display tracking-tight">ProcureAI Assistant</h2>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#6366f1]/20 text-[#c0c1ff] border border-[#6366f1]/30 uppercase">
                Grok / xAI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Verifiable Procurement & Vigilance AI</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleResetSession}
            title="Reset Conversation Memory"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1f2937] rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1f2937] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Context Bar */}
      <div className="px-5 py-2 bg-[#111827]/70 border-b border-[#1e293b] text-xs flex items-center justify-between text-slate-400 font-mono">
        <div className="flex items-center space-x-2 overflow-hidden truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
          <span className="font-semibold text-slate-300">CONTEXT:</span>
          {activeBidderName ? (
            <span className="truncate text-[#c0c1ff] font-semibold">BIDDER: {activeBidderName}</span>
          ) : activeTenderTitle ? (
            <span className="truncate text-slate-300">TENDER: {activeTenderTitle}</span>
          ) : (
            <span className="text-slate-500 uppercase">Global Tender Database</span>
          )}
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="px-4 py-2 border-b border-[#1e293b] bg-[#0b0f19] flex items-center space-x-2 overflow-x-auto no-scrollbar">
        {quickActions.map((qa) => (
          <button
            key={qa.id}
            onClick={() => handleSend(qa.prompt)}
            disabled={loading}
            className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded bg-[#111827] hover:bg-[#6366f1]/20 text-slate-300 hover:text-[#c0c1ff] border border-[#334155] hover:border-[#6366f1] transition-all font-mono"
          >
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center space-x-2 mb-1 px-1 font-mono">
              {msg.role === 'assistant' ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {msg.model_used || 'ProcureAI'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Officer</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
              <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[95%] rounded px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#6366f1] text-white shadow-md'
                  : 'bg-[#111827] text-slate-200 border border-[#1e293b] shadow-md'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="text-xs leading-relaxed space-y-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-sm font-bold text-slate-100 mt-2 mb-1 border-b border-[#1e293b] pb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xs font-bold text-slate-100 mt-2 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xs font-semibold text-[#c0c1ff] mt-2 mb-1 uppercase tracking-wide">{children}</h3>,
                      h4: ({ children }) => <h4 className="text-[11px] font-semibold text-slate-300 mt-1.5 mb-0.5">{children}</h4>,
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-300 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2 text-slate-300">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2 text-slate-300">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-[#6366f1] pl-3 py-1 my-2 bg-[#6366f1]/10 text-slate-300 rounded-r text-[11px] italic">{children}</blockquote>,
                      table: ({ children }) => (
                        <div className="my-2.5 overflow-x-auto rounded border border-[#1e293b] bg-[#0b0f19]">
                          <table className="w-full text-[11px] text-left border-collapse">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-[#1f2937] text-slate-200 border-b border-[#374151] font-semibold">{children}</thead>,
                      tbody: ({ children }) => <tbody className="divide-y divide-[#1e293b]">{children}</tbody>,
                      tr: ({ children }) => <tr className="hover:bg-[#111827]/80 transition-colors">{children}</tr>,
                      th: ({ children }) => <th className="px-2.5 py-1.5 font-semibold text-slate-200 whitespace-nowrap">{children}</th>,
                      td: ({ children }) => <td className="px-2.5 py-1.5 text-slate-300 align-top">{children}</td>,
                      code: ({ children }) => (
                        <code className="bg-[#1e293b] text-[#c0c1ff] px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>
                      ),
                      hr: () => <hr className="border-[#1e293b] my-2.5" />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[#1e293b]">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center justify-between w-full text-[11px] font-mono font-semibold text-[#c0c1ff] hover:text-white transition-colors"
                  >
                    <span className="flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Verifiable Sources ({msg.sources.length})</span>
                    </span>
                    {showSourcesForMsg[msg.id] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showSourcesForMsg[msg.id] && (
                    <div className="mt-2 space-y-1.5">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-[#0b0f19] border border-[#1e293b] text-xs flex items-start space-x-2 font-mono"
                        >
                          <div className="mt-0.5">{getSourceIcon(src.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-200 truncate text-[11px]">{src.label}</p>
                            {src.snippet && (
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                                {src.snippet}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3 font-mono">
            <div className="w-7 h-7 rounded bg-[#6366f1]/20 border border-[#6366f1]/40 flex items-center justify-center text-[#6366f1]">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#111827] rounded px-3.5 py-2.5 border border-[#1e293b] text-xs text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-ping"></span>
              <span>Grounding query with live procurement records...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-[#1e293b] bg-[#111827]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Grok about compliance gaps, bidder risks, cartelization..."
            className="w-full bg-[#0b0f19] border border-[#1e293b] rounded px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#6366f1] resize-none pr-10 font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 text-white transition-colors shadow"
            title="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>xAI Grok Grounded Evaluation</span>
        </div>
      </div>
    </div>
  );
};
