const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ DB Error:', err));

// تعريف موديل المهنيين
const Pro = mongoose.model('Professional', new mongoose.Schema({
    name: String,
    spec: String,
    area: String,
    phone: String,
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false }
}));

// --- المسارات (Routes) ---

// 1. الصفحة الرئيسية للتأكد
app.get('/', (req, res) => res.send('🚀 سيرفر عُمران شغال 100%'));

// 2. جلب كل المهنيين
app.get('/api/pros', async (req, res) => {
    const pros = await Pro.find({});
    res.json(pros);
});

// 3. إضافة مهني جديد
app.post('/api/pros/add', async (req, res) => {
    const newPro = new Pro(req.body);
    await newPro.save();
    res.json(newPro);
});

// 4. توثيق مهني
app.put('/api/pros/admin/verify-pro/:id', async (req, res) => {
    const updated = await Pro.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    res.json(updated);
});

// 5. تمييز مهني
app.put('/api/pros/admin/feature-pro/:id', async (req, res) => {
    const updated = await Pro.findByIdAndUpdate(req.params.id, { isFeatured: req.body.isFeatured }, { new: true });
    res.json(updated);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server on port ${PORT}`));

