import React, { useEffect, useState } from 'react';

const Sidebar = ({ selectedDocId, onSelectDoc }) => {
  const [docs, setDocs] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/docs', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      setDocs(data);
    } catch (err) {
      console.error('Error fetching docs:', err);
    }
  };

  const createDocument = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/docs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({}), // 👈 required to avoid body-parser issues
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Error creating document:', data.error || res.statusText);
        alert(`Failed to create document: ${data.error || res.statusText}`);
        return;
      }

      fetchDocs();
      onSelectDoc(data); // select newly created doc
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
      if (!e.target.closest('.menu-dropdown') && !e.target.closest('button')) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="w-64 bg-gray-100 h-full border-r p-4 flex flex-col">
      <button
        onClick={createDocument}
        className="mb-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
      >
        + New Document
      </button>

      <div className="overflow-y-auto flex-1 space-y-2">
        {docs.map((doc) => (
          <div
            key={doc._id}
            className={`group relative p-2 rounded-md flex justify-between items-center ${
              selectedDocId === doc._id
                ? 'bg-blue-200 font-semibold'
                : 'hover:bg-gray-200'
            }`}
          >
            <div className="flex-grow">
              {renameId === doc._id ? (
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => handleRename(doc._id, newTitle)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(doc._id, newTitle);
                  }}
                  autoFocus
                  className="w-full px-1 py-0.5 text-sm rounded"
                />
              ) : (
                <span
                  onClick={() => onSelectDoc(doc)}
                  className="cursor-pointer"
                >
                  {doc.title || 'Untitled Document'}
                </span>
              )}
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === doc._id ? null : doc._id);
                }}
                className="text-gray-600 hover:text-black px-2 focus:outline-none"
              >
                ⋮
              </button>

              {menuOpenId === doc._id && (
                <div className="menu-dropdown absolute right-0 mt-1 w-32 bg-white border rounded shadow z-10">
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
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
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
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
