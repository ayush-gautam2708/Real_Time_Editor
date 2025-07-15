const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Document = require('../models/Document');

const rooms = new Map(); // roomId -> Set of clients
const SECRET = process.env.JWT_SECRET;

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    let user = null;

    try {
      if (!token) throw new Error('Missing token');
      user = jwt.verify(token, SECRET);
      ws.user = user; // Attach user object to socket
    } catch (err) {
      console.error('WebSocket auth error:', err.message);
      ws.close();
      return;
    }

    let currentRoom = null;

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);
        const { type, payload } = data;

        // ✅ JOIN ROOM
        if (type === 'join-room') {
          const roomId = payload.roomId;
          const document = await Document.findById(roomId);

          if (!document) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Document not found' } }));
            ws.close();
            return;
          }

          const userId = ws.user.id;
          const isOwner = document.owner.toString() === userId;
          const isCollaborator = document.collaborators.map(id => id.toString()).includes(userId);

          if (!isOwner && !isCollaborator) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Access denied' } }));
            ws.close();
            return;
          }

          currentRoom = roomId;
          if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
          rooms.get(currentRoom).add(ws);
        }

        // ✅ SYNC CONTENT
        else if (type === 'content-change' && currentRoom) {
          rooms.get(currentRoom).forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'content-change',
                payload: { content: payload.content }
              }));
            }
          });
        }

        // ✅ CHAT MESSAGE BROADCAST + SAVE TO DB
        else if (type === 'chat-message' && currentRoom) {
          const username = ws.user.username || 'User';
          const chatMessage = {
            user: username,
            message: payload.message,
            timestamp: new Date()
          };

          // Broadcast to all clients in room
          const messagePayload = {
            type: 'chat-message',
            payload: {
              ...chatMessage,
              timestamp: chatMessage.timestamp.toISOString()
            }
          };

          rooms.get(currentRoom).forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(messagePayload));
            }
          });

          // Save message to MongoDB
          await Document.findByIdAndUpdate(currentRoom, {
            $push: { messages: chatMessage }
          });
        }

      } catch (err) {
        console.error('WebSocket message error:', err.message);
      }
    });

    ws.on('close', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom).delete(ws);
        if (rooms.get(currentRoom).size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });
  });

  console.log('WebSocket server is running');
}

module.exports = { setupWebSocket };
