// --- DNS FIX FOR CLOUD DEPLOYMENT ---
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Added to handle file paths
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- SERVE STATIC FILES ---
// This allows the server to load your CSS, Images, and login.js
app.use(express.static(path.join(__dirname)));

// --- CONNECT TO DATABASE ---
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000, 
})
    .then(() => console.log("✅ Zinat Database Connected!"))
    .catch(err => {
        console.log("❌ Connection Error Detail:", err.message);
    });

// --- STUDENT DATA MODEL ---
const StudentSchema = new mongoose.Schema({
    reg: String,
    name: String,
    score: Number,
    status: String
});
const Student = mongoose.model('Student', StudentSchema);

// --- QUESTION DATA MODEL ---
const QuestionSchema = new mongoose.Schema({
    question: String,
    options: [String],
    correctAnswer: String
});
const Question = mongoose.model('Question', QuestionSchema);

// --- FIX: SHOW THE WEBSITE AT THE HOME ROUTE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// --- LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const { reg } = req.body;
    try {
        const student = await Student.findOne({ reg: reg });
        if (student) {
            res.json({ success: true, student: student });
        } else {
            res.status(404).json({ success: false, message: "Reg Number not found!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- NEW: SAVE QUESTIONS ROUTE ---
app.post('/api/questions', async (req, res) => {
    try {
        const { questions } = req.body;
        // This clears old questions and saves the new list
        await Question.deleteMany({}); 
        await Question.insertMany(questions);
        res.json({ success: true, message: "Questions saved to cloud!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- NEW: GET QUESTIONS ROUTE ---
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find();
        res.json({ success: true, questions: questions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- NEW: DELETE ALL QUESTIONS ROUTE ---
app.delete('/api/questions', async (req, res) => {
    try {
        await Question.deleteMany({});
        res.json({ success: true, message: "All questions deleted from cloud!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});