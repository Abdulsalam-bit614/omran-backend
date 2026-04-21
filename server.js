const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// ══ Models ══
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    pass: { type: String, required: true },
    type: { type: String, enum: ['client','worker','contractor','office','admin'], default: 'client' },
    avatar: { type: String, default: '' }
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

const ProSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    spec: { type: String, required: true },
    type: { type: String, enum: ['worker','contractor','office'] },
    area: { type: String, required: true },
    exp: String, desc: String,
    phone: { type: String, required: true },
    wa: String,
    photos: [String],
    avail: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    reviews: [{ userId: mongoose.Schema.Types.ObjectId, userName: String, rating: Number, comment: String, createdAt: { type: Date, default: Date.now } }],
    avgRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    priorityScore: { type: Number, default: 0 }
}, { timestamps: true });
const Pro = mongoose.model('Professional', ProSchema);

// ══ Auth Middleware ══
const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'لا يوجد توكن' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { res.status(401).json({ message: 'توكن غير صالح' }); }
};

// ══ Auth Routes ══
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, pass, type } = req.body;
        if (await User.findOne({ phone })) return res.status(400).json({ message: 'هذا الرقم مسجل مسبقاً' });
        const hashed = await bcrypt.hash(pass, 10);
        await new User({ name, phone, email, type, pass: hashed }).save();
        res.status(201).json({ message: 'تم إنشاء حسابك في عُمران' });
    } catch(e) { res.status(500).json({ error: 'خطأ في التسجيل' }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { id, pass } = req.body;
        const user = await User.findOne({ $or: [{ email: id }, { phone: id }] });
        if (!user) return res.status(404).json({ message: 'الحساب غير موجود' });
        if (!await bcrypt.compare(pass, user.pass)) return res.status(400).json({ message: 'كلمة المرور غير صحيحة' });
        const token = jwt.sign({ id: user._id, type: user.type }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user._id, name: user.name, type: user.type, phone: user.phone } });
    } catch(e) { res.status(500).json({ message: 'خطأ في الدخول' }); }
});

// ══ Pro Routes ══
app.get('/api/pros', async (req, res) => {
    try {
        const { spec, area, search } = req.query;
        let filter = {};
        if (spec && spec !== 'all') filter.spec = spec;
        if (area) filter.area = new RegExp(area, 'i');
        if (search) filter.$or = [{ name: new RegExp(search,'i') }, { spec: new RegExp(search,'i') }];
        const pros = await Pro.find(filter).sort({ isFeatured:-1, priorityScore:-1, avgRating:-1 });
        res.json(pros);
    } catch(e) { res.status(500).json({ message: 'خطأ في جلب البيانات' }); }
});

app.post('/api/pros/add', authMiddleware, async (req, res) => {
    try {
        const pro = await new Pro({ ...req.body, userId: req.user.id }).save();
        res.status(201).json({ message: 'تم نشر ملفك في عُمران', data: pro });
    } catch(e) { res.status(400).json({ message: 'فشل في إنشاء الملف' }); }
});

app.post('/api/pros/:id/review', authMiddleware, async (req, res) => {
    try {
        const pro = await Pro.findById(req.params.id);
        if (!pro) return res.status(404).json({ message: 'غير موجود' });
        pro.reviews.push({ userId: req.user.id, userName: req.user.name, ...req.body });
        pro.reviewsCount = pro.reviews.length;
        pro.avgRating = pro.reviews.reduce((s,r) => s + r.rating, 0) / pro.reviews.length;
        await pro.save();
        res.json({ message: 'تم التقييم', avgRating: pro.avgRating });
    } catch(e) { res.status(500).json({ message: 'خطأ' }); }
});

app.put('/api/pros/admin/feature-pro/:id', authMiddleware, async (req, res) => {
    try { res.json(await Pro.findByIdAndUpdate(req.params.id, { isFeatured: req.body.isFeatured }, { new: true })); }
    catch(e) { res.status(500).json({ message: 'خطأ' }); }
});

app.put('/api/pros/admin/verify-pro/:id', authMiddleware, async (req, res) => {
    try { res.json(await Pro.findByIdAndUpdate(req.params.id, { verified: true }, { new: true })); }
    catch(e) { res.status(500).json({ message: 'خطأ' }); }
});

app.put('/api/pros/admin/priority/:id', authMiddleware, async (req, res) => {
    try { res.json(await Pro.findByIdAndUpdate(req.params.id, { priorityScore: req.body.priorityScore }, { new: true })); }
    catch(e) { res.status(500).json({ message: 'خطأ' }); }
});

// ══ Socket.io ══
io.on('connection', socket => {
    socket.on('join', userId => socket.join(userId));
    socket.on('send_message', data => {
        io.to(data.receiverId).emit('receive_message', { senderId: data.senderId, text: data.text, time: new Date().toLocaleTimeString() });
    });
});

// ══ Start ══
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ متصل بقاعدة بيانات omranDB');
        server.listen(process.env.PORT || 5000, () => console.log('✅ السيرفر يعمل'));
    })
    .catch(err => console.error('❌ خطأ:', err));
