const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const verifyToken = require('../middlewares/verifyToken');

//Create a document
router.post('/create', verifyToken, async (req, res) => {
  try {
    const doc = new Document({
      title: req.body.title || 'Untitled Document',
      owner: req.user.id, // Make sure this is correct — might be req.user._id
    });
    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating document:', err); // Show full error
    res.status(500).json({ error: err.message || 'Failed to create document' });
  }
});

// Get all documents owned & collaborated  by the user
router.get('/', verifyToken, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [
        { owner: req.user.id },
        { collaborators: req.user.id },
      ]
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});


// Get a single document by ID (if user is owner or collaborator)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || (doc.owner.toString() !== req.user.id && !doc.collaborators.includes(req.user.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(doc);
  } catch (err) {
    res.status(404).json({ error: 'Document not found' });
  }
});

// Save (update) a document's content
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || (doc.owner.toString() !== req.user.id && !doc.collaborators.includes(req.user.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    doc.content = req.body.content || doc.content;
    doc.updatedAt = new Date();
    await doc.save();
    res.json({ message: 'Document saved', doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save document' });
  }
});
// Rename a Document
router.put('/:id/rename', verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },  //
      { title },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Rename failed' });
  }
});


router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Add a collaborator
router.put('/:id/add-collaborator', verifyToken, async (req, res) => {
  const { collaboratorId } = req.body;

  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Only owner can add collaborators
    if (doc.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!doc.collaborators.includes(collaboratorId)) {
      doc.collaborators.push(collaboratorId);
      await doc.save();
    }

    res.json({ message: 'Collaborator added', doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

// Add collaborator by username
router.post('/:id/share', verifyToken, async (req, res) => {
  try {
    const { username } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can share the document' });
    }

    const User = require('../models/User');
    const collaborator = await User.findOne({ username });
    if (!collaborator) return res.status(404).json({ error: 'User not found' });

    if (doc.collaborators.includes(collaborator._id)) {
      return res.status(400).json({ error: 'User already a collaborator' });
    }

    doc.collaborators.push(collaborator._id);
    await doc.save();

    res.json({ message: 'Collaborator added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to share document' });
  }
});


module.exports = router;
