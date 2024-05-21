const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

const app = express();
app.use(express.json());

app.set('trust proxy', true);

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const db = new sqlite3.Database('messaging.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT, receiver TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).send("Access denied. Token missing.");
    }
    jwt.verify(token, 'secret_key', (err, user) => {
        if (err || !user) {
            return res.status(403).send("Access denied. Invalid token.");
        }
        req.user = user;
        next();
    });
};

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function (err) {
            if (err) {
                console.error(err);
                return res.status(400).send("Username already exists");
            }
            res.status(201).send("User registered successfully");
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error registering user");
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error logging in");
            }
            if (!row) {
                return res.status(400).send("Invalid username or password");
            }
            const isValidPassword = await bcrypt.compare(password, row.password);
            if (!isValidPassword) {
                return res.status(400).send("Invalid username or password");
            }
            const token = jwt.sign({ username: row.username }, 'secret_key');
            res.status(200).json({ token });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error logging in");
    }
});

app.post('/api/send', authenticateToken, async (req, res) => {
    try {
        const { receiver, message } = req.body;
        const sender = req.user.username;
        if (!receiver || !message) {
            return res.status(400).send("Invalid data");
        }
        db.run("INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)", [sender, receiver, message], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Error sending message");
            }
            res.status(200).send("Message sent successfully");
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error sending message");
    }
});

app.get('/api/messages', authenticateToken, (req, res) => {
    const username = req.user.username;
    db.all("SELECT * FROM messages WHERE sender = ? OR receiver = ? ORDER BY timestamp DESC", [username, username], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error fetching messages");
        }
        res.status(200).json({ messages: rows });
    });
});

app.post('/api/public-message', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;
        const sender = req.user.username;
        if (!message) {
            return res.status(400).send("Invalid data");
        }
        db.run("INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)", [sender, 'public', message], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Error sending public message");
            }
            res.status(200).send("Public message sent successfully");
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error sending public message");
    }
});

app.get('/api/public-messages', authenticateToken, (req, res) => {
    db.all("SELECT * FROM messages WHERE receiver = 'public' ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error fetching public messages");
        }
        res.status(200).json({ messages: rows });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
