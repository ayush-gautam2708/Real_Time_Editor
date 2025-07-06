import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';

const Home = () => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [content, setContent] = useState('');
  const socketRef = useRef(null);
  const timeoutRef = useRef(null);

  // Fetch content when document is selected
  useEffect(() => {
    if (!selectedDoc) return;

    const fetchDocContent = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/docs/${selectedDoc._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch document');
        setContent(data.content || '');
      } catch (err) {
        console.error(err.message);
      }
    };

    fetchDocContent();
  }, [selectedDoc]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!selectedDoc) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token missing: can't connect WebSocket");
      return;
    }
    socketRef.current = new WebSocket(`ws://localhost:5000?token=${token}`);
    socketRef.current.onopen = () => {
      socketRef.current.send(JSON.stringify({
        type: 'join-room',
        payload: { roomId: selectedDoc._id },
      }));
    };

    socketRef.current.onmessage = (msg) => {
      const { type, payload } = JSON.parse(msg.data);
      if (type === 'content-change') {
        setContent(payload.content);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [selectedDoc]);

  // Handle typing (and sync)
  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Send to WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'content-change',
        payload: { content: newContent },
      }));
    }

    // Debounced save to backend
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000); // 1 sec debounce
  };

  const saveContent = async (newContent) => {
    if (!selectedDoc) return;
    try {
      await fetch(`http://localhost:5000/api/docs/${selectedDoc._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ content: newContent }),
      });
    } catch (err) {
      console.error('Failed to save:', err.message);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        onSelectDoc={setSelectedDoc}
        selectedDocId={selectedDoc?._id}
      />

      <div className="flex-1 p-6">
        {selectedDoc ? (
          <>
            <h2 className="text-xl font-semibold mb-4">{selectedDoc.title || 'Untitled Document'}</h2>
            <textarea
              value={content}
              onChange={handleChange}
              className="w-full h-[85vh] p-4 border rounded-md focus:outline-none resize-none font-mono text-sm"
              placeholder="Start editing..."
            />
          </>
        ) : (
          <div className="text-gray-500 flex items-center justify-center h-full">
            Select a document to start editing
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
