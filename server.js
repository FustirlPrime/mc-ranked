require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- MongoDB Models ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const RankingSchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    tier: { type: Number, required: true },
    score: { type: Number, required: true },
    region: { type: String, default: 'NA' }
});
const Ranking = mongoose.model('Ranking', RankingSchema);

const TicketSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    username: String,
    playerName: String,
    category: String,
    tier: Number,
    score: Number,
    proof: String
});
const Ticket = mongoose.model('Ticket', TicketSchema);

// --- Initialization ---
async function startServer() {
    try {
        if(!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('WAITING_FOR_YOUR_URL')) {
            console.warn("====================================================");
            console.warn("⚠️ ERROR: No MongoDB URI provided in .env file! ⚠️");
            console.warn("Please add your connection string to the .env file.");
            console.warn("Then, restart the server by running: node server.js");
            console.warn("====================================================");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB Atlas successfully!");
        
        // Ensure Randomified exists on fresh clusters
        const admin = await User.findOne({ username: 'Randomified' });
        if (!admin) {
            await User.create({ username: 'Randomified', password: 'Neon0105' });
            console.log("Created default Admin account.");
        }
        
        app.listen(PORT, () => {
            console.log(`MCRANKED Server running on http://localhost:${PORT}`);
        });
    } catch(err) {
        console.error("Failed to connect to MongoDB:", err);
    }
}

// GET Rankings
app.get('/api/data', async (req, res) => {
    try {
        const ranks = await Ranking.find().lean();
        const result = {};
        ranks.forEach(r => {
            if (!result[r.category]) result[r.category] = [];
            result[r.category].push({ name: r.name, tier: r.tier, score: r.score, region: r.region });
        });
        Object.keys(result).forEach(cat => result[cat].sort((a, b) => b.score - a.score));
        res.json(result);
    } catch(e) { res.status(500).json({ error: "Database Error" }); }
});

// POST Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    try {
        const ext = await User.findOne({ username });
        if (ext) return res.status(400).json({ error: "Username already exists" });
        await User.create({ username, password });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Database Error" }); }
});

// POST Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && user.password === password) {
            res.json({ success: true, token: username }); 
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch(e) { res.status(500).json({ error: "Database Error" }); }
});

// POST Add/Update Rank (Admin)
app.post('/api/rankings', async (req, res) => {
    const token = req.headers['authorization'];
    if (token !== 'Randomified') return res.status(403).json({ error: "Unauthorized. Admin only." });

    const { category, playerName, tier, score, region } = req.body;
    if (!category || !playerName || isNaN(tier) || isNaN(score)) return res.status(400).json({ error: "Invalid data provided" });

    try {
        await Ranking.findOneAndUpdate(
            { category, name: { $regex: new RegExp(`^${playerName}$`, 'i') } },
            { category, name: playerName, tier: parseInt(tier), score: parseInt(score), region: region || 'NA' },
            { upsert: true, new: true }
        );
        
        // Re-fetch all
        const ranks = await Ranking.find().lean();
        const result = {};
        ranks.forEach(r => {
            if (!result[r.category]) result[r.category] = [];
            result[r.category].push({ name: r.name, tier: r.tier, score: r.score, region: r.region });
        });
        Object.keys(result).forEach(cat => result[cat].sort((a, b) => b.score - a.score));
        res.json({ success: true, rankings: result });
    } catch(e) { res.status(500).json({ error: "Database Error" }); }
});

// Tickets API
app.get('/api/tickets', async (req, res) => {
    const token = req.headers['authorization'];
    if (token !== 'Randomified') return res.status(403).json({ error: "Admin only" });
    try {
        const tickets = await Ticket.find().lean();
        res.json(tickets);
    } catch(e) { res.status(500).json({ error: "Database Error" }); }
});

app.post('/api/tickets', async (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "Must be logged in" });

    const { playerName, category, tier, score, proof } = req.body;
    if (!playerName || !category || isNaN(tier) || isNaN(score)) return res.status(400).json({ error: "Missing required fields" });

    try {
        await Ticket.create({
            id: Date.now().toString() + Math.floor(Math.random() * 1000),
            username: token,
            playerName, category, tier: parseInt(tier), score: parseInt(score), proof: proof || ''
        });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Database Error" }); }
});

app.delete('/api/tickets/:id', async (req, res) => {
    const token = req.headers['authorization'];
    if (token !== 'Randomified') return res.status(403).json({ error: "Admin only" });
    try {
        await Ticket.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Database Error" }); }
});

startServer();
