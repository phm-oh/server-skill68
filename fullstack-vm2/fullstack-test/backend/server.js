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
app.use(express.json({ limit: '50mb' })); // Increase limit
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Fix Static Path (Keep for backup)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug Route: Check files
app.get('/debug-files', (req, res) => {
    const dir = path.join(__dirname, 'uploads');
    fs.readdir(dir, (err, files) => {
        if(err) return res.send('Error reading dir: ' + err);
        res.json({ path: dir, files });
    });
});

// Ensure upload dir
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// DB Config (Retry connection logic)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'iot_db'
};

let db;
const connectDB = async () => {
    try {
        db = await mysql.createPool(dbConfig);
        console.log('Database Connected!');
    } catch (err) {
        console.log('DB Connection Failed, Retrying...', err.message);
        setTimeout(connectDB, 5000);
    }
};
connectDB();

const SECRET = 'skill68_secret';

// API for Node-RED (Sensor Data & Discovery)
app.post('/sensor/data', async (req, res) => {
    try {
        const { roomName, temp, humid } = req.body;
        if (!roomName) return res.sendStatus(400);

        const [room] = await db.query('SELECT id FROM rooms WHERE name = ?', [roomName]);
        
        if (room.length > 0) {
            await db.query('INSERT INTO sensor_data (room_id, temp, humid) VALUES (?, ?, ?)', 
                [room[0].id, temp, humid]);
            res.send('Saved');
        } else {
            await db.query('INSERT INTO device_log (topic, last_seen) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_seen=NOW()', 
                [`sensor/${roomName}/data`]);
            res.send('Logged as new device');
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Upload Config (Use MemoryStorage for Base64)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
const auth = (roles = []) => (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403);
        if (roles.length && !roles.includes(decoded.role)) return res.sendStatus(403);
        req.user = decoded;
        next();
    });
};

// --- ROUTES ---

// Login
app.post('/login', async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [req.body.username]);
        if (!users.length || !bcrypt.compareSync(req.body.password, users[0].password))
            return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: users[0].id, role: users[0].role }, SECRET, { expiresIn: '12h' });
        res.json({ token, user: { id: users[0].id, username: users[0].username, role: users[0].role } });
    } catch (e) { res.status(500).send(e.message); }
});

// Rooms (Get All / Get Authorized)
app.get('/rooms', auth(), async (req, res) => {
    try {
        let sql = 'SELECT * FROM rooms';
        if (req.user.role !== 'admin') {
            sql = `SELECT r.* FROM rooms r JOIN room_access ra ON r.id = ra.room_id WHERE ra.user_id = ${req.user.id}`;
        }
        const [rooms] = await db.query(sql);
        
        // Append Latest Data
        for (let r of rooms) {
            const [rows] = await db.query('SELECT temp, humid FROM sensor_data WHERE room_id = ? ORDER BY timestamp DESC LIMIT 1', [r.id]);
            r.latest = rows[0] || { temp: 0, humid: 0 };
        }
        res.json(rooms);
    } catch (e) { res.status(500).send(e.message); }
});

// Room Detail & History
app.get('/rooms/:id', auth(), async (req, res) => {
    try {
        const [room] = await db.query('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
        if (!room.length) return res.sendStatus(404);
        
        // Filter: 1h, 30m, 10m
        const minutes = req.query.range ? parseInt(req.query.range) : 60;
        const [history] = await db.query(
            `SELECT * FROM sensor_data WHERE room_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL ? MINUTE) ORDER BY timestamp ASC`, 
            [req.params.id, minutes]
        );
        res.json({ info: room[0], history });
    } catch (e) { res.status(500).send(e.message); }
});

// Admin: Manage Rooms
app.post('/rooms', auth(['admin']), upload.single('image'), async (req, res) => {
    try {
        let image = '';
        if (req.file) {
            // Convert Buffer to Base64 String with Data URI
            const b64 = req.file.buffer.toString('base64');
            const mime = req.file.mimetype; // e.g. image/png
            image = `data:${mime};base64,${b64}`;
            console.log('Image Processed, Length:', image.length); // Debug
        }
        
        await db.query('INSERT INTO rooms (name, image) VALUES (?, ?)', [req.body.name, image]);
        res.sendStatus(201);
    } catch (e) {
        console.error(e);
        res.status(500).send(e.message);
    }
});

app.put('/rooms/:id', auth(['admin']), upload.single('image'), async (req, res) => {
    try {
        let sql = 'UPDATE rooms SET name = ? WHERE id = ?';
        let params = [req.body.name, req.params.id];
        
        if (req.file) {
            const b64 = req.file.buffer.toString('base64');
            const mime = req.file.mimetype;
            const image = `data:${mime};base64,${b64}`;
            
            sql = 'UPDATE rooms SET name = ?, image = ? WHERE id = ?';
            params = [req.body.name, image, req.params.id];
        }
        
        await db.query(sql, params);
        res.sendStatus(200);
    } catch (e) {
        console.error('Update Error:', e);
        res.status(500).send(e.message);
    }
});

app.delete('/rooms/:id', auth(['admin']), async (req, res) => {
    await db.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.sendStatus(200);
});

// Admin: Get Unregistered Devices
app.get('/devices/new', auth(['admin']), async (req, res) => {
    try {
        const [devices] = await db.query('SELECT * FROM device_log ORDER BY last_seen DESC');
        res.json(devices);
    } catch (e) { res.status(500).send(e.message); }
});

// Admin: Manage Users
app.get('/users', auth(['admin']), async (req, res) => {
    const [users] = await db.query('SELECT id, username, role FROM users');
    res.json(users);
});

app.post('/users', auth(['admin']), async (req, res) => {
    try {
        const hash = bcrypt.hashSync(req.body.password, 10);
        const [result] = await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
            [req.body.username, hash, req.body.role]);
        
        // Assign Rooms
        if (req.body.roomIds && Array.isArray(req.body.roomIds)) {
            for (const roomId of req.body.roomIds) {
                await db.query('INSERT INTO room_access (user_id, room_id) VALUES (?, ?)', [result.insertId, roomId]);
            }
        }
        res.sendStatus(201);
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/users/:id', auth(['admin']), async (req, res) => {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.sendStatus(200);
});

// Start Server
// Helper: Reset DB & Seed Data
app.get('/reset-db', async (req, res) => {
    try {
        // 1. Clear Data
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE sensor_data');
        await db.query('TRUNCATE TABLE room_access');
        await db.query('TRUNCATE TABLE rooms');
        await db.query('TRUNCATE TABLE users');
        await db.query('TRUNCATE TABLE device_log');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        // 2. Insert Users
        const hash = bcrypt.hashSync('1234', 10);
        await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
        await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['user1', hash, 'user']);

        // 3. Insert Rooms
        await db.query('INSERT INTO rooms (name) VALUES (?)', ['Server Room A']);
        await db.query('INSERT INTO rooms (name) VALUES (?)', ['Server Room B']);

        // 4. Assign Access
        const [u] = await db.query('SELECT id FROM users WHERE username = ?', ['user1']);
        const [r] = await db.query('SELECT id FROM rooms WHERE name = ?', ['Server Room A']);
        if(u.length && r.length) {
            await db.query('INSERT INTO room_access (user_id, room_id) VALUES (?, ?)', [u[0].id, r[0].id]);
        }

        // 5. Generate Sensor Data (Last 24 Hours)
        const [rooms] = await db.query('SELECT id FROM rooms');
        for(let room of rooms) {
            for(let i=0; i<100; i++) {
                // Mock data every 15 mins for 24h
                const temp = (20 + Math.random() * 5).toFixed(1);
                const humid = (40 + Math.random() * 10).toFixed(1);
                // SQL to subtract minutes from NOW()
                await db.query(`INSERT INTO sensor_data (room_id, temp, humid, timestamp) 
                                VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE))`, 
                                [room.id, temp, humid, i*15]);
            }
        }

        res.send('Database Reset & Mock Data Generated!');
    } catch (e) {
        res.status(500).send('Error: ' + e.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
