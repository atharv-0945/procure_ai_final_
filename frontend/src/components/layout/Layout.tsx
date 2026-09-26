import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatPanel } from '../chatbot/ChatPanel';
import { ChatButton } from '../chatbot/ChatButton';
import { getTenders } from '../../api/client';
import type { Tender } from '../../types';

interface LayoutProps {
  children: (props: {
    activeTenderId: string;
    refreshTenders: () => void;
    openChat: (bidderId?: number, bidderName?: string) => void;
  }) => React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [activeTenderId, setActiveTenderId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Chatbot drawer state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatBidderId, setChatBidderId] = useState<number | null>(null);
  const [chatBidderName, setChatBidderName] = useState<string | undefined>(undefined);

  const fetchTenders = async () => {
    try {
      const data = await getTenders();
      setTenders(data);
      if (data.length > 0 && !activeTenderId) {
        setActiveTenderId(String(data[0].id));
      }
    } catch (err) {
      console.error('Failed to load tenders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const openChat = (bidderId?: number, bidderName?: string) => {
    if (bidderId) setChatBidderId(bidderId);
    if (bidderName) setChatBidderName(bidderName);
    setIsChatOpen(true);
  };

  const activeTender = tenders.find((t) => String(t.id) === String(activeTenderId));

  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      <Sidebar
        currentTenderId={activeTenderId}
        onOpenChat={() => openChat()}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          tenders={tenders}
          selectedTenderId={activeTenderId}
          onSelectTender={(id) => setActiveTenderId(id)}
          onOpenChat={() => openChat()}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-sm font-mono">Initializing ProcureAI Enterprise Workspace...</span>
              </div>
            </div>
          ) : (
            children({ activeTenderId, refreshTenders: fetchTenders, openChat })
          )}
        </main>
      </div>

      {/* Global AI Assistant Floating Button */}
      <ChatButton
        onClick={() => openChat()}
        isOpen={isChatOpen}
      />

      {/* Global AI Assistant Panel Drawer */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeTenderId={activeTenderId ? parseInt(activeTenderId, 10) : null}
        activeBidderId={chatBidderId}
        activeTenderTitle={activeTender?.title}
        activeBidderName={chatBidderName}
      />
    </div>
  );
};
