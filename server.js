// --- DNS FIX FOR CLOUD DEPLOYMENT ---
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();

const app = express();
app.use(express.json());

// --- UPDATED CORS TO ALLOW DELETE ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}));

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
    subject: String, // Links question to a specific subject
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
    subject: String, // To track which subject result this is
    score: Number,
    status: String,
    date: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

// --- NEW: TRASH BIN DATA MODEL ---
const TrashSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'question', 'result', or 'settings'
    originalId: mongoose.Schema.Types.ObjectId,
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Stores the exact original payload
    deletedAt: { type: Date, default: Date.now }
});
const Trash = mongoose.model('Trash', TrashSchema);

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
    const { reg, subject } = req.body; 
    try {
        const student = await Student.findOne({ reg: reg });
        
        if (student) {
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

// --- QUESTIONS ROUTES ---
app.post('/api/questions', async (req, res) => {
    try {
        const { questions, subject } = req.body;
        
        // Soft delete old items for this subject by moving them to trash before updating
        const oldQuestions = await Question.find({ subject: subject });
        if (oldQuestions.length > 0) {
            const trashItems = oldQuestions.map(q => ({
                type: 'question',
                originalId: q._id,
                data: { subject: q.subject, question: q.question, options: q.options, correctAnswer: q.correctAnswer }
            }));
            await Trash.insertMany(trashItems);
            await Question.deleteMany({ subject: subject }); 
        }
        
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
        let query = subject ? { subject: subject } : {};
        
        const matchingQuestions = await Question.find(query);
        if (matchingQuestions.length > 0) {
            const trashItems = matchingQuestions.map(q => ({
                type: 'question',
                originalId: q._id,
                data: { subject: q.subject, question: q.question, options: q.options, correctAnswer: q.correctAnswer }
            }));
            await Trash.insertMany(trashItems);
            await Question.deleteMany(query);
        }
        res.json({ success: true, message: "Questions moved to Trash Bin!" });
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

app.delete('/api/results', async (req, res) => {
    try {
        const results = await Result.find({});
        if (results.length > 0) {
            const trashItems = results.map(r => ({
                type: 'result',
                originalId: r._id,
                data: { reg: r.reg, name: r.name, subject: r.subject, score: r.score, status: r.status, date: r.date }
            }));
            await Trash.insertMany(trashItems);
            await Result.deleteMany({});
        }
        res.json({ success: true, message: "All results moved to Trash Bin!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- NEW: CONTROL HUB ROUTES (TRASH & MASTER NUKE) ---

// 1. Fetch all items currently in the trash bin
app.get('/api/trash', async (req, res) => {
    try {
        const items = await Trash.find().sort({ deletedAt: -1 });
        res.json({ success: true, trash: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Master Nuke Route: Soft deletes everything into the trash bin at once
app.post('/api/danger/nuke-all', async (req, res) => {
    try {
        const allQuestions = await Question.find({});
        const allResults = await Result.find({});
        const currentSettings = await Settings.findOne({});
        
        let trashPayload = [];

        if (allQuestions.length > 0) {
            allQuestions.forEach(q => trashPayload.push({
                type: 'question', originalId: q._id, data: { subject: q.subject, question: q.question, options: q.options, correctAnswer: q.correctAnswer }
            }));
        }
        if (allResults.length > 0) {
            allResults.forEach(r => trashPayload.push({
                type: 'result', originalId: r._id, data: { reg: r.reg, name: r.name, subject: r.subject, score: r.score, status: r.status, date: r.date }
            }));
        }
        if (currentSettings) {
            trashPayload.push({
                type: 'settings', originalId: currentSettings._id, data: { title: currentSettings.title, duration: currentSettings.duration, passMark: currentSettings.passMark }
            });
        }

        if (trashPayload.length > 0) await Trash.insertMany(trashPayload);

        await Question.deleteMany({});
        await Result.deleteMany({});
        await Settings.deleteMany({}); // Wipes configuration profile context

        res.json({ success: true, message: "System wiped! Complete history backed up to the Trash Bin." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Restore an item from the trash bin back to its primary collection
app.post('/api/trash/restore/:id', async (req, res) => {
    try {
        const item = await Trash.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Item not found in trash container." });

        if (item.type === 'question') {
            await Question.create(item.data);
        } else if (item.type === 'result') {
            await Result.create(item.data);
        } else if (item.type === 'settings') {
            await Settings.findOneAndUpdate({}, item.data, { upsert: true });
        }

        await Trash.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Resource item restored cleanly!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Delete an individual item permanently
app.delete('/api/trash/permanent/:id', async (req, res) => {
    try {
        await Trash.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Data permanently erased." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Purge Trash: Empty the entire trash database permanently
app.delete('/api/trash/purge-all', async (req, res) => {
    try {
        await Trash.deleteMany({});
        res.json({ success: true, message: "Trash bin emptied completely and permanently!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});