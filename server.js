const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // أضفنا هذا السطر للتعامل مع المسارات
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- تقديم الملفات الثابتة (Frontend) ---
// هذا السطر بيخلي السيرفر يشوف ملفات index.html و admin.html
app.use(express.static(path.join(__dirname, './')));

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- الموديلات (Schemas) ---

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'pro' },
    spec: String,
    city: String,
    village: String,
    avatar: { type: String, default: '' },
    portfolio: [String],
    isBusy: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date
});
const User = mongoose.model('User', UserSchema);

const SpecSchema = new mongoose.Schema({ name: String });
const Spec = mongoose.model('Spec', SpecSchema);

const ChatSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    message: String,
    type: { type: String, default: 'text' },
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// --- مسارات الـ API (البيانات) ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (err) { res.status(400).json({ error: "الرقم موجود مسبقاً" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone, password });
    if (user) res.json(user);
    else res.status(401).json({ message: "خطأ في البيانات" });
});

app.get('/api/pros', async (req, res) => {
    let query = { role: 'pro' };
    if (req.query.spec) query.spec = req.query.spec;
    if (req.query.city) query.city = req.query.city;
    if (req.query.village) query.village = req.query.village;
    
    const pros = await User.find(query).sort({ isFeatured: -1, verified: -1 });
    res.json(pros);
});

// --- مسارات الصفحات (Frontend Routes) ---

// تشغيل الصفحة الرئيسية عند فتح الرابط الأساسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تشغيل لوحة التحكم عند طلب /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// التعامل مع أي مسارات أخرى (يرجع للـ index)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server Running on ${PORT}`));
