
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

const ProSchema = new mongoose.Schema({
    name: String,
    spec: String,
    area: String,
    phone: String,
    verified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: { type: Date, default: null }
});

const Pro = mongoose.model('Pro', ProSchema);

// المسارات
app.get('/api/pros', async (req, res) => {
    const pros = await Pro.find();
    res.json(pros);
});

app.post('/api/pros/add', async (req, res) => {
    const newPro = new Pro(req.body);
    await newPro.save();
    res.json(newPro);
});

// تحديث التوثيق (قبول حالة true أو false)
app.put('/api/pros/admin/verify-pro/:id', async (req, res) => {
    const { verified } = req.body;
    await Pro.findByIdAndUpdate(req.params.id, { verified });
    res.json({ message: 'تم تحديث التوثيق' });
});

app.put('/api/pros/admin/feature-pro/:id', async (req, res) => {
    const { isFeatured, days } = req.body;
    const expiryDate = isFeatured ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
    await Pro.findByIdAndUpdate(req.params.id, { isFeatured, featuredUntil: expiryDate });
    res.json({ message: 'تم تحديث التميز' });
});

// الحذف النهائي
app.delete('/api/pros/:id', async (req, res) => {
    try {
        await Pro.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'فشل الحذف' });
    }
});

// جدولة تنظيف التميز المنتهي
cron.schedule('0 * * * *', async () => {
    await Pro.updateMany(
        { isFeatured: true, featuredUntil: { $lte: new Date() } },
        { isFeatured: false, featuredUntil: null }
    );
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Server Active'));
