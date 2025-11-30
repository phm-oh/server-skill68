const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Config
const SECRET = 'secret_key_devops_skill68';
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    // port: 3307, // Removed: Use default 3306 inside docker
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'iot_db'
});

// Ensure upload dir exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Multer Config
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Middleware: Verify Token
const auth = (roles = []) => async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.sendStatus(401);
        const decoded = jwt.verify(token, SECRET);
        if (roles.length && !roles.includes(decoded.role)) return res.sendStatus(403);
        req.user = decoded;
        next();
    } catch (e) { res.sendStatus(403); }
};

// --- ROUTES ---

// Helper to create admin manually (For Testing)
app.get('/create-admin', async (req, res) => {
    const hash = bcrypt.hashSync('1234', 10);
    try {
        // Force delete old admin first to reset password properly
        await db.query('DELETE FROM users WHERE username = ?', ['admin']);
        await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
        res.send('Admin Reset Success! User: admin, Pass: 1234');
    } catch (e) {
        res.send('Error: ' + e.message);
    }
});

// Helper to seed rooms (For Testing)
app.get('/seed-data', async (req, res) => {
    try {
        await db.query('INSERT INTO rooms (name, image) VALUES (?, ?)', ['Server Room A', '']);
        await db.query('INSERT INTO rooms (name, image) VALUES (?, ?)', ['Server Room B', '']);
        res.send('Seeded 2 rooms!');
    } catch (e) {
        res.send('Error: ' + e.message);
    }
});

// Auth
app.post('/login', async (req, res) => {
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [req.body.username]);
    if (!users.length || !bcrypt.compareSync(req.body.password, users[0].password)) 
        return res.status(401).send('Invalid credentials');
    
    const token = jwt.sign({ id: users[0].id, role: users[0].role }, SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: users[0].id, username: users[0].username, role: users[0].role } });
});

// Rooms (CRUD) - Admin Only
app.get('/rooms', auth(), async (req, res) => {
    // Admin sees all, User sees authorized
    let sql = 'SELECT * FROM rooms';
    if (req.user.role !== 'admin') {
        sql = `SELECT r.* FROM rooms r JOIN room_access ra ON r.id = ra.room_id WHERE ra.user_id = ${req.user.id}`;
    }
    const [rooms] = await db.query(sql);
    res.json(rooms);
});

app.post('/rooms', auth(['admin']), upload.single('image'), async (req, res) => {
    const image = req.file ? `/uploads/${req.file.filename}` : '';
    await db.query('INSERT INTO rooms (name, image) VALUES (?, ?)', [req.body.name, image]);
    res.sendStatus(201);
});

app.put('/rooms/:id', auth(['admin']), upload.single('image'), async (req, res) => {
    let sql = 'UPDATE rooms SET name = ? WHERE id = ?';
    let params = [req.body.name, req.params.id];
    if (req.file) {
        sql = 'UPDATE rooms SET name = ?, image = ? WHERE id = ?';
        params = [req.body.name, `/uploads/${req.file.filename}`, req.params.id];
    }
    await db.query(sql, params);
    res.sendStatus(200);
});

app.delete('/rooms/:id', auth(['admin']), async (req, res) => {
    await db.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.sendStatus(200);
});

// Sensor Data
app.get('/rooms/:id/latest', auth(), async (req, res) => {
    const [rows] = await db.query('SELECT * FROM sensor_data WHERE room_id = ? ORDER BY timestamp DESC LIMIT 1', [req.params.id]);
    res.json(rows[0] || { temp: 0, humid: 0 });
});

app.get('/rooms/:id/history', auth(), async (req, res) => {
    // Simple last 24h or limit 50
    const [rows] = await db.query('SELECT * FROM sensor_data WHERE room_id = ? ORDER BY timestamp DESC LIMIT 50', [req.params.id]);
    res.json(rows.reverse());
});

// Users (Admin)
app.get('/users', auth(['admin']), async (req, res) => {
    const [users] = await db.query('SELECT id, username, role FROM users');
    res.json(users);
});

app.post('/users', auth(['admin']), async (req, res) => {
    const hash = bcrypt.hashSync(req.body.password, 10);
    const [result] = await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
        [req.body.username, hash, req.body.role]);
    // Handle room access
    if (req.body.roomIds && Array.isArray(req.body.roomIds)) {
        for (const roomId of req.body.roomIds) {
            await db.query('INSERT INTO room_access (user_id, room_id) VALUES (?, ?)', [result.insertId, roomId]);
        }
    }
    res.sendStatus(201);
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
