const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- CONNECT TO DATABASE ---
// This uses the secret link from your .env file
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Zinat Database Connected!"))
    .catch(err => console.log("❌ Connection Error:", err));

// --- STUDENT DATA MODEL ---
const StudentSchema = new mongoose.Schema({
    reg: String,
    name: String,
    score: Number,
    status: String
});
const Student = mongoose.model('Student', StudentSchema);

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

// --- START THE SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});