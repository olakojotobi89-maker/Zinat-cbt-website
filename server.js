// --- DNS FIX FOR CLOUD DEPLOYMENT ---
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- SERVE STATIC FILES ---
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

// --- QUESTION DATA MODEL (Updated with Subject) ---
const QuestionSchema = new mongoose.Schema({
    subject: String, // Added: Links question to a specific subject
    question: String,
    options: [String],
    correctAnswer: String
});
const Question = mongoose.model('Question', QuestionSchema);

// --- SETTINGS DATA MODEL ---
const SettingsSchema = new mongoose.Schema({
    title: { type: String, default: "Zinat Entrance Exam" },
    duration: { type: Number, default: 2 },
    passMark: { type: Number, default: 40 }
});
const Settings = mongoose.model('Settings', SettingsSchema);

// --- RESULT DATA MODEL (FOR STUDENT SUBMISSIONS) ---
const ResultSchema = new mongoose.Schema({
    reg: String,
    name: String,
    subject: String, // Added: To track which subject result this is
    score: Number,
    status: String,
    date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

// --- HOME ROUTE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// --- NEW: FETCH AVAILABLE SUBJECTS ---
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = await Question.distinct('subject');
        res.json({ success: true, subjects: subjects });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- LOGIN ROUTE (Updated for Subject Security) ---
app.post('/api/login', async (req, res) => {
    const { reg, subject } = req.body; // Added subject check
    try {
        const student = await Student.findOne({ reg: reg });
        
        if (student) {
            // Check if student already submitted for THIS specific subject
            if (subject) {
                const alreadyFinished = await Result.findOne({ reg: reg, subject: subject });
                if (alreadyFinished) {
                    return res.status(403).json({ 
                        success: false, 
                        message: `You have already submitted the ${subject} exam and cannot take it again.` 
                    });
                }
            }
            res.json({ success: true, student: student });
        } else {
            res.status(404).json({ success: false, message: "Reg Number not found!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- QUESTIONS ROUTES (Updated for Multi-Subject) ---
app.post('/api/questions', async (req, res) => {
    try {
        const { questions, subject } = req.body;
        // Only delete old questions for THIS specific subject
        await Question.deleteMany({ subject: subject }); 
        
        const questionsWithSubject = questions.map(q => ({ ...q, subject: subject }));
        await Question.insertMany(questionsWithSubject);
        
        res.json({ success: true, message: `Questions for ${subject} saved to cloud!` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/questions', async (req, res) => {
    try {
        const { subject } = req.query;
        let query = subject ? { subject: subject } : {};
        const questions = await Question.find(query);
        res.json({ success: true, questions: questions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/questions', async (req, res) => {
    try {
        const { subject } = req.body;
        if (subject) {
            await Question.deleteMany({ subject: subject });
        } else {
            await Question.deleteMany({});
        }
        res.json({ success: true, message: "Questions deleted!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- SETTINGS ROUTES ---
app.post('/api/settings', async (req, res) => {
    try {
        const { title, duration, passMark } = req.body;
        await Settings.findOneAndUpdate({}, { title, duration, passMark }, { upsert: true, new: true });
        res.json({ success: true, message: "Exam settings updated!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json({ success: true, settings: settings || { title: "Zinat Entrance Exam", duration: 2, passMark: 40 } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- RESULTS ROUTES ---
app.post('/api/results', async (req, res) => {
    try {
        const newResult = new Result(req.body);
        await newResult.save();
        res.json({ success: true, message: "Result saved to cloud!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        const results = await Result.find().sort({ date: -1 });
        res.json({ success: true, results: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});