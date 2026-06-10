import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, MessageSquare, User } from 'lucide-react';
import api from '../utils/api';

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  if (userId) {
    return <Conversation partnerId={userId} onBack={() => navigate('/chat')} />;
  }

  return <Inbox onSelect={(id) => navigate(`/chat/${id}`)} />;
}

/* ═══════════════════════════════════════
   Inbox — chat list
   ═══════════════════════════════════════ */
function Inbox({ onSelect }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await api.get('messages/chats/');
        setChats(res.data);
      } catch {}
      setLoading(false);
    };
    fetchInbox();
    const interval = setInterval(fetchInbox, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

      {chats.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-gray-600">No conversations yet</h3>
          <p className="text-sm mt-1">Start chatting with a farmer or buyer from an order.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            const partner = chat.partner;
            const last = chat.last_message;
            const time = new Date(last.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
            const date = new Date(last.timestamp).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isUnread = !last.is_read && last.receiver === currentUser.uid;

            return (
              <button
                key={partner.uid}
                onClick={() => onSelect(partner.uid)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                  isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'bg-white hover:bg-gray-50'
                } border border-gray-100 shadow-sm`}
              >
                <div className="w-10 h-10 bg-primary-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {partner.full_name}
                    </h4>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{date} {time}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {last.sender === currentUser.uid ? 'You: ' : ''}{last.message}
                  </p>
                </div>
                {isUnread && <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Conversation view
   ═══════════════════════════════════════ */
function Conversation({ partnerId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [partnerName, setPartnerName] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEnd = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get('messages/', { params: { receiver_id: partnerId } });
      setMessages(res.data);
      if (res.data.length > 0) {
        const firstMsg = res.data[0];
        setPartnerName(
          firstMsg.sender === currentUser.uid ? firstMsg.receiver_name : firstMsg.sender_name
        );
      } else {
        // Try getting the partner name from profile
        try {
          const profileRes = await api.get(`profile/${partnerId}/`);
          setPartnerName(profileRes.data.full_name);
        } catch {}
      }
    } catch {}
    setLoading(false);
  }, [partnerId, currentUser.uid]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    setSending(true);
    try {
      await api.post('messages/', { receiver_id: partnerId, message: newMsg.trim() });
      setNewMsg('');
      fetchMessages();
    } catch {}
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="w-8 h-8 bg-primary-accent rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{partnerName || 'Chat'}</h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender === currentUser.uid;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMine
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                <p>{msg.message}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <button
          type="submit"
          disabled={sending || !newMsg.trim()}
          className="p-2.5 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white rounded-xl transition-colors"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
