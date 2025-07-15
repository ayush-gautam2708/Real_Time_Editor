import React, { useEffect, useState, useRef, useMemo } from "react";
import { jwtDecode } from "jwt-decode";

const ChatBox = ({ socketRef, isOpen, closeChat, docId }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token");

  // Safely decode token
  const decodedToken = useMemo(() => {
    try {
      return jwtDecode(token);
    } catch (err) {
      console.error("Failed to decode token:", err);
      return {};
    }
  }, [token]);

  const username = decodedToken.username;

  // Load old messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/docs/${docId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log("Fetched messages:", data);
        setMessages(data.map(msg => ({
          user: msg.user,
          text: msg.message,
          timestamp: msg.timestamp,
        })));
      } catch (err) {
        console.error("Failed to load messages:", err.message);
      }
    };

    if (docId && isOpen) fetchMessages();
  }, [docId, isOpen, token]);

  // WebSocket listener
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;
    socket.onmessage = (msg) => {
      const { type, payload } = JSON.parse(msg.data);
      if (type === "chat-message") {
        console.log("Received chat message:", payload);
        setMessages((prev) => [...prev, {
          user: payload.user,
          text: payload.message,
          timestamp: new Date().toISOString()
        }]);
      }
    };

    return () => {
      // Optional cleanup
    };
  }, [socketRef]);

  const sendMessage = () => {
    if (!input.trim()) return;
    if (!username) return console.error("Username not found in token");

    const messageObj = {
      type: "chat-message",
      payload: {
        roomId: docId,
        message: input.trim(),
        username,
      },
    };

    socketRef.current.send(JSON.stringify(messageObj));
    setInput("");
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-80 h-96 bg-white shadow-lg rounded-lg flex flex-col">
      <div className="p-3 bg-blue-600 text-white flex justify-between items-center rounded-t-lg">
        <h3 className="text-lg font-semibold">Chat</h3>
        <button onClick={closeChat} className="text-sm hover:text-gray-200">✖</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded text-sm whitespace-pre-line ${
              msg.user === username ? 'bg-blue-100 self-end ml-10 text-right' : 'bg-gray-100 mr-10 text-left'
            }`}
          >
            <strong>{msg.user || "Unknown"}:</strong> {msg.text}
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
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
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
