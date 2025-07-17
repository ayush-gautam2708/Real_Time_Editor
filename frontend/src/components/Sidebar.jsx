import React, { useEffect, useState, useMemo } from 'react';
// New: Import jwt-decode
import { jwtDecode } from 'jwt-decode';

const Sidebar = ({ selectedDocId, onSelectDoc }) => {
  // Changed: From a single 'docs' state to two separate states
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  // New: Get the current user's ID from the token
  const token = localStorage.getItem('token');
  const userId = useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode(token).id;
    } catch (e) {
      console.error('Invalid token:', e);
      return null;
    }
  }, [token]);

  const fetchDocs = async () => {
    if (!token) return; // Don't fetch if no token
    try {
      const res = await fetch('http://localhost:5000/api/docs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      // Changed: Logic to split documents into two lists
      const owned = [];
      const shared = [];
      data.forEach(doc => {
        if (doc.owner === userId) {
          owned.push(doc);
        } else {
          shared.push(doc);
        }
      });
      setOwnedDocs(owned);
      setSharedDocs(shared);

    } catch (err) {
      console.error('Error fetching docs:', err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [userId]); // Refetch docs if the user ID changes

  const createDocument = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/docs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title: 'Untitled Document' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      
      fetchDocs(); // Refetch to update both lists
      onSelectDoc(data);
    } catch (err) {
      console.error('Error creating document:', err);
      alert('Something went wrong creating the document');
    }
  };

  const handleRename = async (docId, title) => {
    try {
      const res = await fetch(`http://localhost:5000/api/docs/${docId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Rename failed');
      setRenameId(null);
      fetchDocs();
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleDelete = async (docId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/docs/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) throw new Error('Delete failed');
      if (selectedDocId === docId) onSelectDoc(null);
      fetchDocs();
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleCopyLink = (docId) => {
    const url = `${window.location.origin}/doc/${docId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
    setMenuOpenId(null);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.menu-dropdown') && !e.target.closest('.menu-toggle-button')) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // New: A helper function to render a single document item to avoid repetition
  const renderDocItem = (doc) => (
    <div
      key={doc._id}
      className={`group relative p-2 rounded-md flex justify-between items-center ${
        selectedDocId === doc._id ? 'bg-blue-200 font-semibold' : 'hover:bg-gray-200'
      }`}
    >
      <div className="flex-grow truncate" onClick={() => onSelectDoc(doc)}>
        {renameId === doc._id ? (
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => handleRename(doc._id, newTitle)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(doc._id, newTitle); }}
            autoFocus
            className="w-full px-1 py-0.5 text-sm rounded"
          />
        ) : (
          <span className="cursor-pointer">{doc.title || 'Untitled Document'}</span>
        )}
      </div>

      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === doc._id ? null : doc._id);
          }}
          className="menu-toggle-button text-gray-600 hover:text-black px-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          ⋮
        </button>

        {menuOpenId === doc._id && (
          <div className="menu-dropdown absolute right-0 mt-1 w-32 bg-white border rounded shadow-lg z-10">
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
              onClick={() => {
                setRenameId(doc._id);
                setNewTitle(doc.title || '');
                setMenuOpenId(null);
              }}
            >
              Rename
            </button>
            <button
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 text-sm"
              onClick={() => handleDelete(doc._id)}
            >
              Delete
            </button>
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
              onClick={() => handleCopyLink(doc._id)}
            >
              Copy Link
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-64 bg-gray-50 h-full border-r p-4 flex flex-col">
      <button
        onClick={createDocument}
        className="mb-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
      >
        + New Document
      </button>

      {/* Changed: Render two separate lists */}
      <div className="overflow-y-auto flex-1">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mt-4 mb-1">My Documents</h3>
        {ownedDocs.length > 0 ? ownedDocs.map(renderDocItem) : <p className="text-xs text-gray-400 px-2">No documents created yet.</p>}

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mt-6 mb-1">Shared With Me</h3>
        {sharedDocs.length > 0 ? sharedDocs.map(renderDocItem) : <p className="text-xs text-gray-400 px-2">No documents shared with you.</p>}
      </div>
    </div>
  );
};

export default Sidebar;