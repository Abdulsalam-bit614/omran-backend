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

// --- الموديل الشامل (User) ---
const UserSchema = new mongoose.Schema({
    userId: { type: String, unique: true }, // الرقم الخاص (الكوندننومر)
    name: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'pro' },
    spec: String,
    city: String,
    village: String,
    experience: String,
    email: String,
    isBusy: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// --- المسارات (Routes) ---

// 1. تسجيل حساب جديد (مع توليد رقم فريد)
app.post('/api/auth/register', async (req, res) => {
    try {
        const userData = req.body;
        // توليد رقم فريد من 6 خانات
        userData.userId = "OMR-" + Math.floor(100000 + Math.random() * 900000);
        
        const newUser = new User(userData);
        await newUser.save();
        res.json({ success: true, userId: userData.userId });
    } catch (err) {
        res.status(400).json({ error: "رقم الهاتف موجود مسبقاً أو حدث خطأ" });
    }
});

// 2. تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone, password });
    if (user) res.json({ success: true, user });
    else res.status(401).json({ message: "خطأ في رقم الهاتف أو كلمة المرور" });
});

// 3. جلب الحرفيين (API)
app.get('/api/pros', async (req, res) => {
    const pros = await User.find({ role: 'pro' });
    res.json(pros);
});

// 4. مسارات الصفحات (Frontend)
app.get('/admin', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// تقديم الملفات الثابتة
app.use(express.static(path.join(__dirname, './')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server Running on ${PORT}`));
