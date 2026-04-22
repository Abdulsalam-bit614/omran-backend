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

app.get('/', (req, res) => {
    res.send('🚀 سيرفر عُمران يعمل بكفاءة - ميزات الإدارة (الحذف والجدولة) مفعلة');
});

// ══ Models ══
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    type: { type: String, default: 'client' }
}, { timestamps: true }));

const Pro = mongoose.model('Professional', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    spec: { type: String, required: true },
    area: { type: String, required: true },
    phone: { type: String, required: true },
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: { type: Date, default: null } // تاريخ انتهاء التمييز
}, { timestamps: true }));

const Ad = mongoose.model('Ad', new mongoose.Schema({
    content: { type: String, required: true },
    active: { type: Boolean, default: true },
    expiryDate: { type: Date }
}, { timestamps: true }));

// ══ Routes ══

// 1. جلب وحذف المهنيين
app.get('/api/pros', async (req, res) => {
    try {
        const pros = await Pro.find().sort({ isFeatured: -1, createdAt: -1 });
        res.json(pros);
    } catch(e) { res.status(500).json({ message: 'خطأ في الجلب' }); }
});

app.post('/api/pros/add', async (req, res) => {
    try {
        const newPro = new Pro(req.body);
        await newPro.save();
        res.status(201).json(newPro);
    } catch(e) { res.status(400).json({ message: 'فشل الإضافة' }); }
});

// ميزة الحذف الجديدة 🗑️
app.delete('/api/pros/:id', async (req, res) => {
    try {
        await Pro.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم الحذف بنجاح' });
    } catch(e) { res.status(500).json({ message: 'فشل الحذف' }); }
});

// 2. التوثيق والتمييز
app.put('/api/pros/admin/verify-pro/:id', async (req, res) => {
    try {
        const updated = await Pro.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
        res.json(updated);
    } catch(e) { res.status(500).json({ message: 'خطأ في التوثيق' }); }
});

app.put('/api/pros/admin/feature-pro/:id', async (req, res) => {
    try {
        const { isFeatured, days } = req.body;
        let expiry = null;
        if (isFeatured && days) {
            expiry = new Date();
            expiry.setDate(expiry.getDate() + parseInt(days));
        }
        const updated = await Pro.findByIdAndUpdate(req.params.id, { 
            isFeatured: isFeatured,
            featuredUntil: expiry 
        }, { new: true });
        res.json(updated);
    } catch(e) { res.status(500).json({ message: 'خطأ في التمييز' }); }
});

// 3. شريط الإعلانات (Ad Strip)
app.get('/api/ads/active', async (req, res) => {
    try {
        const ad = await Ad.findOne({ active: true }).sort({ createdAt: -1 });
        res.json(ad);
    } catch(e) { res.status(500).json({ message: 'خطأ' }); }
});

app.post('/api/ads/update', async (req, res) => {
    try {
        await Ad.updateMany({}, { active: false }); // إخفاء الإعلانات القديمة
        const newAd = new Ad(req.body);
        await newAd.save();
        res.status(201).json(newAd);
    } catch(e) { res.status(400).json({ message: 'فشل التحديث' }); }
});

// ══ Start ══
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ متصل بقاعدة بيانات omranDB');
        server.listen(process.env.PORT || 10000, () => console.log(`📡 جاهز على البورت ${process.env.PORT || 10000}`));
    })
    .catch(err => console.error('❌ خطأ:', err));
