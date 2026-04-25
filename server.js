const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// ══ Models ══
const UserSchema = new mongoose.Schema({
    userId:       { type: String, unique: true },
    name:         { type: String, required: true },
    phone:        { type: String, unique: true, sparse: true },
    email:        { type: String, unique: true, sparse: true },
    password:     { type: String, required: true },
    role:         { type: String, default: 'client' },
    spec:         String,
    city:         String,
    village:      String,
    experience:   String,
    description:  String,
    wa:           String,
    isBusy:       { type: Boolean, default: false },
    verified:     { type: Boolean, default: false },
    isFeatured:   { type: Boolean, default: false },
    featuredUntil: Date,
    blocked:      { type: Boolean, default: false },
    rating:       { type: Number, default: 0 }
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

const VillageSchema = new mongoose.Schema({
    city:    { type: String, required: true },
    name:    { type: String, required: true },
}, { timestamps: true });
const Village = mongoose.model('Village', VillageSchema);

const SpecSchema = new mongoose.Schema({
    name:  { type: String, required: true, unique: true },
    icon:  { type: String, default: '🔧' },
}, { timestamps: true });
const Spec = mongoose.model('Spec', SpecSchema);

// ══ Auth Routes ══

app.post('/api/auth/register', async (req, res) => {
    try {
        const userData = req.body;
        if (!userData.phone && !userData.email) {
            return res.status(400).json({ error: 'يجب إدخال رقم الهاتف أو البريد الإلكتروني' });
        }
        const orQuery = [];
        if (userData.phone) orQuery.push({ phone: userData.phone });
        if (userData.email) orQuery.push({ email: userData.email });

        const existing = await User.findOne({ $or: orQuery });
        if (existing) {
            if (existing.blocked) return res.status(403).json({ error: 'هذا الحساب محظور من المنصة' });
            return res.status(400).json({ error: 'رقم الهاتف أو البريد مسجل مسبقاً' });
        }
        userData.userId = 'OMR-' + Math.floor(100000 + Math.random() * 900000);
        const newUser = new User(userData);
        await newUser.save();
        res.json({ success: true, userId: userData.userId });
    } catch (err) {
        res.status(400).json({ error: 'حدث خطأ في التسجيل' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { id, phone, email, password } = req.body;
        const identifier = id || phone || email;
        const user = await User.findOne({
            $or: [{ phone: identifier }, { email: identifier }],
            password
        });
        if (!user) return res.status(401).json({ message: 'خطأ في بيانات الدخول' });
        if (user.blocked) return res.status(403).json({ message: 'هذا الحساب محظور من المنصة' });
        res.json({ success: true, user });
    } catch(e) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// ══ Pros Routes ══

app.get('/api/pros', async (req, res) => {
    try {
        const pros = await User.find({ role: 'pro', blocked: { $ne: true } })
            .sort({ isFeatured: -1, verified: -1, createdAt: -1 });
        res.json(pros);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/pros/add', async (req, res) => {
    try {
        const data = { ...req.body, role: 'pro', userId: 'OMR-' + Math.floor(100000 + Math.random() * 900000) };
        const pro = new User(data);
        await pro.save();
        res.status(201).json({ success: true, data: pro });
    } catch(e) { res.status(400).json({ error: 'خطأ في الإضافة' }); }
});

// ══ Admin Routes ══

app.put('/api/admin/verify/:id', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { verified: true });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/admin/delete/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.put('/api/admin/block/:id', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { blocked: true });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.put('/api/admin/unblock/:id', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { blocked: false });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.put('/api/admin/feature/:id', async (req, res) => {
    try {
        const { days } = req.body;
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + (days || 7));
        await User.findByIdAndUpdate(req.params.id, { isFeatured: true, featuredUntil });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Villages Routes ══

app.get('/api/villages', async (req, res) => {
    try {
        const villages = await Village.find().sort({ city: 1, name: 1 });
        // تجميع حسب المحافظة
        const grouped = {};
        villages.forEach(v => {
            if (!grouped[v.city]) grouped[v.city] = [];
            grouped[v.city].push(v.name);
        });
        res.json(grouped);
    } catch(e) { res.status(500).json({}); }
});

app.post('/api/villages', async (req, res) => {
    try {
        const { city, name } = req.body;
        if (!city || !name) return res.status(400).json({ error: 'أدخل المحافظة والقرية' });
        const exists = await Village.findOne({ city, name });
        if (exists) return res.status(400).json({ error: 'القرية موجودة مسبقاً' });
        await new Village({ city, name }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/villages', async (req, res) => {
    try {
        const { city, name } = req.body;
        await Village.deleteOne({ city, name });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Specs Routes ══

app.get('/api/specs', async (req, res) => {
    try {
        const specs = await Spec.find().sort({ createdAt: 1 });
        res.json(specs);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/specs', async (req, res) => {
    try {
        const { name, icon } = req.body;
        if (!name) return res.status(400).json({ error: 'أدخل اسم المهنة' });
        const exists = await Spec.findOne({ name });
        if (exists) return res.status(400).json({ error: 'المهنة موجودة مسبقاً' });
        await new Spec({ name, icon: icon || '🔧' }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/specs/:id', async (req, res) => {
    try {
        await Spec.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Frontend ══

app.use(express.static(path.join(__dirname, './')));
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server Running on ${PORT}`));
