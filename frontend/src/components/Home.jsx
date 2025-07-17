import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import ChatBox from './ChatBox';
import { jwtDecode } from 'jwt-decode';

const Home = () => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [content, setContent] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [collabUsername, setCollabUsername] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const socketRef = useRef(null);
  const timeoutRef = useRef(null);

  const [showFileMenu, setShowFileMenu] = useState(false);

  const userId = jwtDecode(localStorage.getItem('token'))?.id;

  useEffect(() => {
    if (!selectedDoc) return;

    const fetchDocData = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/docs/${selectedDoc._id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch document');
        setContent(data.content || '');
        setChatHistory(data.messages || []);
      } catch (err) {
        console.error(err.message);
      }
    };

    fetchDocData();
  }, [selectedDoc]);

  useEffect(() => {
    if (!selectedDoc) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token missing: can't connect WebSocket");
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
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
      if (type === 'chat-message') {
        setChatHistory((prev) => [...prev, payload]);
      }
    };

    setShowFileMenu(false);

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [selectedDoc]);

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

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDoc.title || 'Untitled Document'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowFileMenu(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        onSelectDoc={setSelectedDoc}
        selectedDocId={selectedDoc?._id}
      />

      <div className="flex-1 flex flex-col">
        {selectedDoc ? (
          <>
            <div className="bg-white shadow-sm p-2 flex items-center justify-between z-10">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-700 ml-4">{selectedDoc.title || 'Untitled Document'}</h2>
                
                <div className="relative ml-6">
                  <button onClick={() => setShowFileMenu(!showFileMenu)} className="px-3 py-1 text-sm hover:bg-gray-200 rounded">
                    File
                  </button>
                  {showFileMenu && (
                    <div className="absolute top-8 left-0 w-48 bg-white border rounded shadow-lg">
                      <button 
                        onClick={() => alert('Rename functionality can be hooked up here!')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Rename
                      </button>
                      <button 
                        onClick={handleDownload}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Download (.txt)
                      </button>
                      <button 
                        onClick={() => alert('Delete functionality can be hooked up here!')}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex -space-x-2 mr-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">A</div>
                  <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">B</div>
                </div>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                >
                  Share
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-6 relative">
              <textarea
                value={content}
                onChange={handleChange}
                className="w-full h-full p-8 border rounded-md shadow-inner focus:outline-none resize-none font-mono text-base"
                placeholder="Start editing..."
              />
            </div>
          </>
        ) : (
          <div className="text-gray-500 flex items-center justify-center h-full">
            Select or create a document to start editing
          </div>
        )}

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

        {selectedDoc && !isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
          >
            💬
          </button>
        )}
        {selectedDoc && isChatOpen && (
          <div className="absolute bottom-6 right-6 z-50">
            <ChatBox
              socketRef={socketRef}
              docId={selectedDoc._id}
              userId={userId}
              closeChat={() => setIsChatOpen(false)}
              chatHistory={chatHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;