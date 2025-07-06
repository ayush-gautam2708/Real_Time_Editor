import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';

const Home = () => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [content, setContent] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [collabUsername, setCollabUsername] = useState('');
  const [shareStatus, setShareStatus] = useState('');
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

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'content-change',
        payload: { content: newContent },
      }));
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000);
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

  const handleShare = async () => {
    if (!collabUsername) return;
    try {
      const res = await fetch(`http://localhost:5000/api/docs/${selectedDoc._id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ username: collabUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sharing failed');
      setShareStatus('Collaborator added successfully!');
      setCollabUsername('');
    } catch (err) {
      setShareStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        onSelectDoc={setSelectedDoc}
        selectedDocId={selectedDoc?._id}
      />

      <div className="flex-1 p-6 relative">
        {selectedDoc ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedDoc.title || 'Untitled Document'}</h2>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Share
              </button>
            </div>

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

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Share Document</h3>
              <input
                type="text"
                value={collabUsername}
                onChange={(e) => setCollabUsername(e.target.value)}
                placeholder="Enter collaborator's username"
                className="w-full border p-2 mb-3 rounded"
              />
              <button
                onClick={handleShare}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 mb-2"
              >
                Add Collaborator
              </button>
              <p className="text-sm text-center text-gray-600">{shareStatus}</p>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareStatus('');
                  setCollabUsername('');
                }}
                className="w-full mt-3 py-1 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
