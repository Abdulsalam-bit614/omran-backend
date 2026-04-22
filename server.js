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

// المسار التجريبي
app.get('/', (req, res) => {
    res.send('🚀 سيرفر عُمران يعمل بنجاح ومستعد لاستقبال الطلبات!');
});

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
    type: { type: String, enum: ['worker','contractor','office'], default: 'worker' },
    area: { type: String, required: true },
    phone: { type: String, required: true },
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false }
}, { timestamps: true });
const Pro = mongoose.model('Professional', ProSchema);

// ══ Pro Routes (مفتوحة مؤقتاً للوحة التحكم) ══

// جلب قائمة المهنيين
app.get('/api/pros', async (req, res) => {
    try {
        const pros = await Pro.find().sort({ createdAt: -1 });
        res.json(pros);
    } catch(e) { res.status(500).json({ message: 'خطأ في جلب البيانات' }); }
});

// إضافة مهني جديد
app.post('/api/pros/add', async (req, res) => {
    try {
        const newPro = new Pro(req.body);
        await newPro.save();
        res.status(201).json({ message: 'تمت الإضافة بنجاح', data: newPro });
    } catch(e) { res.status(400).json({ message: 'فشل الإضافة', error: e.message }); }
});

// توثيق مهني (الصح الأزرق)
app.put('/api/pros/admin/verify-pro/:id', async (req, res) => {
    try {
        const updated = await Pro.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
        res.json(updated);
    } catch(e) { res.status(500).json({ message: 'خطأ في التوثيق' }); }
});

// تمييز مهني (الظهور في البداية)
app.put('/api/pros/admin/feature-pro/:id', async (req, res) => {
    try {
        const updated = await Pro.findByIdAndUpdate(req.params.id, { isFeatured: req.body.isFeatured }, { new: true });
        res.json(updated);
    } catch(e) { res.status(500).json({ message: 'خطأ في التمييز' }); }
});

// ══ Start ══
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ متصل بقاعدة بيانات omranDB');
        const PORT = process.env.PORT || 10000;
        server.listen(PORT, () => {
            console.log(`📡 السيرفر شغال على البورت ${PORT}`);
        });
    })
    .catch(err => console.error('❌ خطأ:', err));
