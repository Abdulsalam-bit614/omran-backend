const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- الموديلات (نفسها اللي عندك) ---
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'pro' },
    spec: String, city: String, village: String,
    isBusy: { type: Boolean, default: false },
    verified: { type: Boolean, default: false }
}));

// --- المسارات (Routes) ---

// 1. رابط الإدارة (أولاً عشان ما يختلط مع غيره)
app.get('/admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'admin.html'));
});

// 2. رابط البيانات (API)
app.get('/api/pros', async (req, res) => {
    const pros = await User.find({ role: 'pro' });
    res.json(pros);
});

// 3. أي رابط ثاني (بما فيه الرابط الأساسي) يفتح واجهة الناس
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// تقديم باقي الملفات (الصور والمانيفست)
app.use(express.static(path.join(__dirname, './')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server Running on ${PORT}`));
