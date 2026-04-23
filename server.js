const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// --- الموديلات (Schemas) ---

// 1. موديل المستخدم (حرفي أو زبون)
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'pro' }, // pro أو user أو admin
    spec: String, // المهنة
    city: String, // المحافظة
    village: String, // القرية
    avatar: { type: String, default: '' }, // الصورة الشخصية
    portfolio: [String], // مصفوفة لصور الشغل
    isBusy: { type: Boolean, default: false }, // ميزة "مشغول"
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date
});
const User = mongoose.model('User', UserSchema);

// 2. موديل المهن (عشان تضيف مهن جديدة كأدمن)
const SpecSchema = new mongoose.Schema({ name: String });
const Spec = mongoose.model('Spec', SpecSchema);

// 3. موديل الشات
const ChatSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    message: String,
    type: { type: String, default: 'text' }, // text أو voice
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// --- المسارات (Routes) ---

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (err) { res.status(400).json({ error: "الرقم موجود مسبقاً" }); }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone, password });
    if (user) res.json(user);
    else res.status(401).json({ message: "خطأ في البيانات" });
});

// تحديث حالة "مشغول/متاح"
app.put('/api/user/status/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isBusy: req.body.isBusy }, { new: true });
    res.json(user);
});

// جلب الحرفيين مع الفلترة (المدن والقرى والمهن)
app.get('/api/pros', async (req, res) => {
    let query = { role: 'pro' };
    if (req.query.spec) query.spec = req.query.spec;
    if (req.query.city) query.city = req.query.city;
    if (req.query.village) query.village = req.query.village;
    
    const pros = await User.find(query).sort({ isFeatured: -1, verified: -1 });
    res.json(pros);
});

// إضافة مهنة جديدة (للأدمن)
app.post('/api/admin/specs', async (req, res) => {
    const newSpec = new Spec(req.body);
    await newSpec.save();
    res.json(newSpec);
});

app.get('/api/admin/specs', async (req, res) => {
    const specs = await Spec.find({});
    res.json(specs);
});

// الشات: جلب الرسائل
app.get('/api/chat/:u1/:u2', async (req, res) => {
    const msgs = await Chat.find({
        $or: [
            { sender: req.params.u1, receiver: req.params.u2 },
            { sender: req.params.u2, receiver: req.params.u1 }
        ]
    }).sort('timestamp');
    res.json(msgs);
});

// الشات: إرسال رسالة (أو تسجيل صوتي كـ Link)
app.post('/api/chat/send', async (req, res) => {
    const newMsg = new Chat(req.body);
    await newMsg.save();
    res.json(newMsg);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server Running on ${PORT}`));
