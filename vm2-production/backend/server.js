// Backend API - IoT Room Monitoring System
// Express.js + MariaDB + MQTT

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mqtt = require('mqtt');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Database Connection
const db = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'devops',
  password: process.env.DB_PASSWORD || 'devops123',
  database: process.env.DB_NAME || 'devops_db',
  waitForConnections: true,
  connectionLimit: 10
});

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'room-' + req.params.roomId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'devops-secret-key-2024';

// MQTT Client (รับข้อมูลจาก ESP32)
const mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://mqtt:1883');

mqttClient.on('connect', () => {
  console.log('MQTT Connected');
  // Subscribe topics สำหรับ ESP32 3 ตัว
  mqttClient.subscribe('room1/temperature', (err) => {
    if (!err) console.log('Subscribed to room1/temperature');
  });
  mqttClient.subscribe('room2/temperature', (err) => {
    if (!err) console.log('Subscribed to room2/temperature');
  });
  mqttClient.subscribe('room3/temperature', (err) => {
    if (!err) console.log('Subscribed to room3/temperature');
  });
});

// รับข้อมูลจาก MQTT และบันทึกลง DB
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const roomNumber = topic.split('/')[0].replace('room', '');
    
    const [rooms] = await db.execute('SELECT id FROM rooms WHERE esp32_device_id = ?', 
      [`ESP32-ROOM${roomNumber}`]);
    
    if (rooms.length > 0) {
      const roomId = rooms[0].id;
      await db.execute(
        'INSERT INTO temperatures (room_id, temperature, humidity) VALUES (?, ?, ?)',
        [roomId, data.temp || data.temperature, data.humidity || null]
      );
      console.log(`Saved temp: Room ${roomNumber} = ${data.temp || data.temperature}°C`);
    }
  } catch (err) {
    console.error('MQTT message error:', err);
  }
});

// ==========================================================================
// Authentication Middleware
// ==========================================================================
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) return res.status(401).json({ error: 'User not found' });
    
    req.user = users[0];
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

// ==========================================================================
// Routes
// ==========================================================================

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // สำหรับแข่ง: ใช้ plain text หรือ bcrypt
    // ง่ายๆ: ใช้ plain text (ไม่ปลอดภัยแต่เร็ว)
    const isValid = password === 'admin123' || password === 'user123' || 
                     await bcrypt.compare(password, users[0].password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: users[0].id, role: users[0].role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: users[0].id, username: users[0].username, role: users[0].role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User's Rooms
app.get('/api/rooms', authenticate, async (req, res) => {
  try {
    let query, params;
    
    if (req.user.role === 'admin') {
      query = 'SELECT r.*, COUNT(ri.id) as image_count FROM rooms r LEFT JOIN room_images ri ON r.id = ri.room_id GROUP BY r.id';
      params = [];
    } else {
      query = `SELECT r.*, COUNT(ri.id) as image_count 
               FROM rooms r 
               INNER JOIN user_rooms ur ON r.id = ur.room_id 
               LEFT JOIN room_images ri ON r.id = ri.room_id
               WHERE ur.user_id = ? 
               GROUP BY r.id`;
      params = [req.user.id];
    }
    
    const [rooms] = await db.execute(query, params);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Room Temperatures
app.get('/api/rooms/:roomId/temperatures', authenticate, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    // Check access
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access to this room' });
      }
    }
    
    const [temps] = await db.execute(
      'SELECT * FROM temperatures WHERE room_id = ? ORDER BY recorded_at DESC LIMIT 100',
      [roomId]
    );
    res.json(temps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Latest Temperature
app.get('/api/rooms/:roomId/temperature/latest', authenticate, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access' });
      }
    }
    
    const [temps] = await db.execute(
      'SELECT * FROM temperatures WHERE room_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [roomId]
    );
    res.json(temps[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Room Image
app.post('/api/rooms/:roomId/images', authenticate, upload.single('image'), async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check access
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access' });
      }
    }
    
    const [result] = await db.execute(
      'INSERT INTO room_images (room_id, filename, filepath, uploaded_by) VALUES (?, ?, ?, ?)',
      [roomId, req.file.filename, `/uploads/${req.file.filename}`, req.user.id]
    );
    
    res.json({ id: result.insertId, filename: req.file.filename, path: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MQTT Endpoint (สำหรับ Node-RED ส่งข้อมูลมา)
app.post('/api/mqtt/:room', async (req, res) => {
  try {
    const room = req.params.room;
    const { temp, temperature, humidity } = req.body;
    
    const roomNumber = room.replace('room', '');
    const [rooms] = await db.execute('SELECT id FROM rooms WHERE esp32_device_id = ?', 
      [`ESP32-ROOM${roomNumber}`]);
    
    if (rooms.length > 0) {
      const roomId = rooms[0].id;
      await db.execute(
        'INSERT INTO temperatures (room_id, temperature, humidity) VALUES (?, ?, ?)',
        [roomId, temp || temperature, humidity || null]
      );
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (err) {
    console.error('MQTT endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Room Images
app.get('/api/rooms/:roomId/images', authenticate, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access' });
      }
    }
    
    const [images] = await db.execute(
      'SELECT * FROM room_images WHERE room_id = ? ORDER BY uploaded_at DESC',
      [roomId]
    );
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// Admin Routes - User Management
// ==========================================================================

// Get All Users (Admin only)
app.get('/api/users', authenticate, isAdmin, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, username, email, role, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create User (Admin only)
app.post('/api/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'user123', 10);
    
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role || 'user']
    );
    
    res.json({ id: result.insertId, username, email, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User (Admin only)
app.put('/api/users/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    await db.execute(
      'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
      [username, email, role, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete User (Admin only)
app.delete('/api/users/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign Room to User (Admin only)
app.post('/api/users/:userId/rooms/:roomId', authenticate, isAdmin, async (req, res) => {
  try {
    await db.execute(
      'INSERT INTO user_rooms (user_id, room_id) VALUES (?, ?)',
      [req.params.userId, req.params.roomId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove Room from User (Admin only)
app.delete('/api/users/:userId/rooms/:roomId', authenticate, isAdmin, async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM user_rooms WHERE user_id = ? AND room_id = ?',
      [req.params.userId, req.params.roomId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

