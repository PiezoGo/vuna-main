import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { saveLocalMessage } from '../utils/localChat';
import { ArrowLeft, Send, Phone, Video } from 'lucide-react';

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchPartnerDetails();
    fetchMessages();

    // 5 seconds chat message polling
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [userId]);

  // Autoscroll to bottom whenever messages list updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchPartnerDetails = async () => {
    try {
      // Find the partner in messages/chats/ or fetch user details
      const response = await api.get('messages/chats/');
      const activeChat = response.data.find(c => c.partner.uid === userId);
      if (activeChat) {
        setPartner(activeChat.partner);
      } else {
        // Fallback: search user list or query order details to set placeholder name
        setPartner({ uid: userId, full_name: 'Farmer / Buyer', role: 'user' });
      }
    } catch (err) {
      console.error(err);
      setPartner({ uid: userId, full_name: 'Farmer / Buyer', role: 'user' });
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get('messages/', {
        params: { receiver_id: userId }
      });
      setMessages(response.data);
      
      // Update partner details if we received messages containing names
      if (response.data.length > 0 && partner?.full_name === 'Farmer / Buyer') {
        const firstMsg = response.data[0];
        const isSender = firstMsg.sender === currentUser.uid;
        setPartner({
          uid: userId,
          full_name: isSender ? firstMsg.receiver_name : firstMsg.sender_name,
          role: isSender ? 'user' : 'farmer' // best effort
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSendLoading(true);
    const textToSend = newMessage;
    setNewMessage('');

    try {
      const response = await api.post('messages/', {
        receiver_id: userId,
        message: textToSend
      });
      saveLocalMessage(currentUser.uid, userId, textToSend);
      setMessages([...messages, response.data]);
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
      setNewMessage(textToSend); // restore unsent message
    } finally {
      setSendLoading(false);
    }
  };

  const handleBack = () => {
    if (currentUser.role === 'farmer') {
      navigate('/farmer/dashboard');
    } else {
      navigate('/buyer/dashboard');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-2xl mx-auto bg-white border-x border-primary/10 shadow-md">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button onClick={handleBack} className="text-gray-500 hover:text-primary transition p-1 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">
              {partner ? partner.full_name : 'Loading...'}
            </h3>
            <span className="text-[10px] text-gray-400 font-medium capitalize">
              {partner ? partner.role : ''}
            </span>
          </div>
        </div>

        {partner && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('initiate-call', {
                  detail: {
                    userId: partner.uid,
                    userName: partner.full_name,
                    userAvatar: partner.avatar || '👤'
                  }
                }));
              }}
              className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-lg transition"
              title="Start Video Call"
            >
              <Video size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-12">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentUser.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                    isMe
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-primary-accent text-gray-800 rounded-tl-none'
                  }`}
                >
                  <p>{msg.message}</p>
                  <span className={`block text-[9px] text-right mt-1.5 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-primary/10 bg-white sticky bottom-0">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-primary focus:border-primary text-sm bg-gray-50/50"
          />
          <button
            type="submit"
            disabled={sendLoading || !newMessage.trim()}
            className="bg-primary hover:bg-primary-light text-white p-2.5 rounded-full shadow-lg shadow-primary/15 transition disabled:opacity-50 shrink-0 flex items-center justify-center"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
