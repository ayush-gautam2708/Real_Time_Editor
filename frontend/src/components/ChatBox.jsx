import React, { useEffect, useState, useRef, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';

// Take chatHistory directly from props and remove isOpen
const ChatBox = ({ socketRef, closeChat, docId, chatHistory }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  const username = useMemo(() => {
    try {
      return jwtDecode(token).username;
    } catch (err) {
      console.error('Failed to decode token:', err);
      return 'User';
    }
  }, [token]);

  // The chatHistory is now managed by the Home component, so we don't need to fetch it here.
  // We also don't need the onmessage listener, because Home.jsx already handles it.

  const sendMessage = () => {
    if (!input.trim() || !username) return;

    const messageObj = {
      type: 'chat-message',
      payload: {
        roomId: docId,
        message: input.trim(),
        username,
      },
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(messageObj));
    }
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]); // Depend on the chatHistory prop

  return (
    <div className="w-80 h-96 bg-white shadow-lg rounded-lg flex flex-col">
      <div className="p-3 bg-blue-600 text-white flex justify-between items-center rounded-t-lg">
        <h3 className="text-lg font-semibold">Chat</h3>
        <button onClick={closeChat} className="text-sm hover:text-gray-200">✖</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {/* Use the chatHistory prop directly */}
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded text-sm whitespace-pre-line ${
              msg.user === username ? 'bg-blue-100 self-end ml-10 text-right' : 'bg-gray-100 mr-10 text-left'
            }`}
          >
            <strong>{msg.user || 'Unknown'}:</strong> {msg.message || msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-1"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;