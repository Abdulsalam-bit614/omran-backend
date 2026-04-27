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
    rating:       { type: Number, default: 0 },
    location:     {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    }
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

const VillageSchema = new mongoose.Schema({
    city: { type: String, required: true },
    name: { type: String, required: true },
}, { timestamps: true });
const Village = mongoose.model('Village', VillageSchema);

const SpecSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    icon: { type: String, default: '🔧' },
}, { timestamps: true });
const Spec = mongoose.model('Spec', SpecSchema);

const AdSchema = new mongoose.Schema({
    name:    { type: String, required: true },
    text:    { type: String, required: true },
    expires: { type: Date, required: true },
}, { timestamps: true });
const Ad = mongoose.model('Ad', AdSchema);

// ══ Stats Model ══
const StatSchema = new mongoose.Schema({
    proId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, required: true }, // 'view' | 'call' | 'whatsapp'
    date:    { type: Date, default: Date.now },
}, { timestamps: true });
const Stat = mongoose.model('Stat', StatSchema);

// ══ Notification Model ══
const NotificationSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, required: true }, // 'review' أو 'call' أو 'whatsapp'
    message:  { type: String, required: true },
    proId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    read:     { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model('Notification', NotificationSchema);

// ══ Reply Model ══
const ReplySchema = new mongoose.Schema({
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    author:   { type: String, required: true },
    text:     { type: String, required: true },
}, { timestamps: true });
const Reply = mongoose.model('Reply', ReplySchema);

// ══ Contact Model ══
const ContactSchema = new mongoose.Schema({
    type:  { type: String, required: true }, // phone أو email
    value: { type: String, required: true },
    label: { type: String, default: '' },
}, { timestamps: true });
const Contact = mongoose.model('Contact', ContactSchema);

// ══ Review Model ══
const ReviewSchema = new mongoose.Schema({
    proId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    author: { type: String, required: true },
    stars:  { type: Number, required: true, min: 1, max: 5 },
    text:   { type: String, required: true },
}, { timestamps: true });
const Review = mongoose.model('Review', ReviewSchema);

// ══ Auth Routes ══

app.post('/api/auth/register', async (req, res) => {
    try {
        const userData = req.body;
        if (!userData.phone && !userData.email)
            return res.status(400).json({ error: 'يجب إدخال رقم الهاتف أو البريد الإلكتروني' });

        const orQuery = [];
        if (userData.phone) orQuery.push({ phone: userData.phone });
        if (userData.email) orQuery.push({ email: userData.email });

        const existing = await User.findOne({ $or: orQuery });
        if (existing) {
            if (existing.blocked) return res.status(403).json({ error: 'هذا الحساب محظور من المنصة' });
            return res.status(400).json({ error: 'رقم الهاتف أو البريد مسجل مسبقاً' });
        }
        userData.userId = 'OMR-' + Math.floor(100000 + Math.random() * 900000);
        await new User(userData).save();
        res.json({ success: true, userId: userData.userId });
    } catch(err) {
        res.status(400).json({ error: 'حدث خطأ في التسجيل' });
    }
});

// دالة تنظيف رقم الهاتف
function normalizePhone(phone) {
  if (!phone) return phone;
  phone = phone.toString().trim().replace(/\s/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  if (phone.startsWith('0') && !phone.startsWith('00')) phone = '+963' + phone.slice(1);
  return phone;
}

app.post('/api/auth/login', async (req, res) => {
    try {
        const { id, phone, email, password } = req.body;
        const identifier = id || phone || email;
        const normalized = normalizePhone(identifier);
        const user = await User.findOne({
            $or: [
                { phone: identifier },
                { phone: normalized },
                { email: identifier }
            ],
            password
        });
        if (!user) return res.status(401).json({ message: 'خطأ في بيانات الدخول' });
        if (user.blocked) return res.status(403).json({ message: 'هذا الحساب محظور من المنصة' });
        res.json({ success: true, user });
    } catch(e) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// ══ Busy Route ══
app.put('/api/auth/busy', async (req, res) => {
    try {
        const { userId, isBusy } = req.body;
        await User.findByIdAndUpdate(userId, { isBusy });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Pros Routes ══

app.get('/api/pros', async (req, res) => {
    try {
        const pros = await User.find({ role: 'pro', blocked: { $ne: true } })
            .sort({ isFeatured: -1, verified: -1, createdAt: -1 });
        // نجلب التقييمات لكل حرفي
        const prosWithReviews = await Promise.all(pros.map(async p => {
            const reviews = await Review.find({ proId: p._id }).sort({ createdAt: -1 });
            const reviewsWithReplies = await Promise.all(reviews.map(async r => {
                const replies = await Reply.find({ reviewId: r._id }).sort({ createdAt: 1 });
                return { ...r.toObject(), replies };
            }));
            return { ...p.toObject(), reviews: reviewsWithReplies };
        }));
        res.json(prosWithReviews);
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

// ══ Reviews Routes (جديد) ══

app.get('/api/pros/:id/reviews', async (req, res) => {
    try {
        const reviews = await Review.find({ proId: req.params.id }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/pros/:id/review', async (req, res) => {
    try {
        const { author, stars, text } = req.body;
        if (!author || !stars || !text) return res.status(400).json({ error: 'أكمل البيانات' });
        const review = new Review({ proId: req.params.id, author, stars, text });
        await review.save();
        // تحديث متوسط التقييم
        const reviews = await Review.find({ proId: req.params.id });
        const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
        await User.findByIdAndUpdate(req.params.id, { rating: avg });
        // إضافة إشعار للحرفي
        await new Notification({
            userId: req.params.id,
            type: 'review',
            message: author + ' أضاف تقييماً على ملفك (' + stars + ' نجوم)',
            proId: req.params.id
        }).save();
        res.json({ success: true, review });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/pros/:id/review/:reviewId', async (req, res) => {
    try {
        const { author } = req.body;
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ error: 'التعليق غير موجود' });
        if (review.author !== author) return res.status(403).json({ error: 'لا يمكنك حذف تعليق شخص آخر' });
        await Review.findByIdAndDelete(req.params.reviewId);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// تعديل التعليق لصاحبه فقط
app.put('/api/pros/:id/review/:reviewId', async (req, res) => {
    try {
        const { author, text, stars } = req.body;
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ error: 'التعليق غير موجود' });
        if (review.author !== author) return res.status(403).json({ error: 'لا يمكنك تعديل تعليق شخص آخر' });
        review.text = text || review.text;
        review.stars = stars || review.stars;
        await review.save();
        res.json({ success: true, review });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Stats Routes ══
app.post('/api/stats/:proId', async (req, res) => {
    try {
        const { type } = req.body;
        await new Stat({ proId: req.params.proId, type }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.get('/api/stats/:proId', async (req, res) => {
    try {
        const proId = req.params.proId;
        const [views, calls, whatsapps, reviews] = await Promise.all([
            Stat.countDocuments({ proId, type: 'view' }),
            Stat.countDocuments({ proId, type: 'call' }),
            Stat.countDocuments({ proId, type: 'whatsapp' }),
            Review.find({ proId })
        ]);
        const avgRating = reviews.length ? (reviews.reduce((s,r)=>s+r.stars,0)/reviews.length).toFixed(1) : 0;
        res.json({ views, calls, whatsapps, reviews: reviews.length, avgRating });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Notification Routes ══
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifs = await Notification.find({ userId: req.params.userId })
            .sort({ createdAt: -1 }).limit(20);
        const unread = await Notification.countDocuments({ userId: req.params.userId, read: false });
        res.json({ notifications: notifs, unread });
    } catch(e) { res.status(500).json({ notifications: [], unread: 0 }); }
});

app.put('/api/notifications/:userId/read', async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.params.userId }, { read: true });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Contact Routes ══
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: 1 });
        res.json(contacts);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/contacts', async (req, res) => {
    try {
        const { type, value, label } = req.body;
        if (!type || !value) return res.status(400).json({ error: 'أكمل البيانات' });
        await new Contact({ type, value, label }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/contacts/:id', async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Replies Routes ══
app.get('/api/reviews/:reviewId/replies', async (req, res) => {
    try {
        const replies = await Reply.find({ reviewId: req.params.reviewId }).sort({ createdAt: 1 });
        res.json(replies);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/reviews/:reviewId/reply', async (req, res) => {
    try {
        const { author, text } = req.body;
        if (!author || !text) return res.status(400).json({ error: 'أكمل البيانات' });
        const reply = new Reply({ reviewId: req.params.reviewId, author, text });
        await reply.save();
        res.json({ success: true, reply });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// إشعار اتصال أو واتساب
app.post('/api/notify/contact', async (req, res) => {
    try {
        const { proId, type, callerName } = req.body;
        const msg = (callerName||'أحدهم') + (type === 'call' ? ' اتصل بك' : ' راسلك على واتساب');
        await new Notification({ userId: proId, type, message: msg, proId }).save();
        await new Stat({ proId, type }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
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

app.put('/api/admin/unfeature/:id', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isFeatured: false, featuredUntil: null });
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

// ══ Ads Routes ══

app.get('/api/ads', async (req, res) => {
    try {
        const now = new Date();
        const ads = await Ad.find({ expires: { $gt: now } }).sort({ createdAt: -1 });
        res.json(ads);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/ads', async (req, res) => {
    try {
        const { name, text, days } = req.body;
        if (!name || !text) return res.status(400).json({ error: 'أكمل البيانات' });
        const expires = new Date();
        expires.setDate(expires.getDate() + (parseInt(days) || 7));
        await new Ad({ name, text, expires }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/ads/:id', async (req, res) => {
    try {
        await Ad.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Frontend ══

app.use(express.static(path.join(__dirname, './')));
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`📡 Server Running on ${PORT}`));
