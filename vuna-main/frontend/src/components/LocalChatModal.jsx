import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { getLocalMessages, saveLocalMessage } from '../utils/localChat';
import UserAvatar from './UserAvatar';

export default function LocalChatModal({ partner, currentUserId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (partner?.uid) {
      setMessages(getLocalMessages(currentUserId, partner.uid));
    }
  }, [partner, currentUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !partner?.uid) return;
    const entry = saveLocalMessage(currentUserId, partner.uid, text.trim());
    setMessages((prev) => [...prev, entry]);
    setText('');
  };

  if (!partner) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-primary/10 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserAvatar userId={partner.uid} avatar={partner.avatar} name={partner.full_name} size="sm" />
            <div>
              <h3 className="font-bold text-sm text-gray-900">{partner.full_name}</h3>
              <p className="text-[10px] text-gray-400">Local chat (saved in browser)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50 min-h-[200px]">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">No messages yet. Say hello!</p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${isMe ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
