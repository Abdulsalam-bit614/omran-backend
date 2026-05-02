const express = require('express');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME || 'dwlmqgdua',
    api_key: process.env.CLOUDINARY_KEY || '332324852498996',
    api_secret: process.env.CLOUDINARY_SECRET || 'G8f4qQ_7uxpoX12agFhZLaWDKqc'
});
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

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
    },
    avatar:    { type: String, default: '' },
    portfolio: { type: [String], default: [] }
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

const VillageSchema = new mongoose.Schema({
    city: { type: String, required: true },
    name: { type: String, required: true },
}, { timestamps: true });
const Village = mongoose.model('Village', VillageSchema);

const SpecSchema = new mongoose.Schema({
    name:         { type: String, required: true, unique: true },
    icon:         { type: String, default: '🔧' },
    materialIcon: { type: String, default: 'construction' },
    color:        { type: String, default: '#f0f4f8' },
    iconColor:    { type: String, default: '#475569' },
    order:        { type: Number, default: 0 },
}, { timestamps: true });
const Spec = mongoose.model('Spec', SpecSchema);

const AdSchema = new mongoose.Schema({
    name:       { type: String, required: true },
    text:       { type: String, required: true },
    phone:      { type: String, default: '' },
    image:      { type: String, default: '' },
    targetCity: { type: String, default: 'كل سوريا' },
    category:   { type: String, default: 'عام' },
    order:      { type: Number, default: 0 },
    expires:    { type: Date, required: true },
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

// ══ FAQ Model ══
const FAQSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer:   { type: String, required: true },
    order:    { type: Number, default: 0 },
}, { timestamps: true });
const FAQ = mongoose.model('FAQ', FAQSchema);

// ══ Contact Model ══
const ContactSchema = new mongoose.Schema({
    type:  { type: String, required: true }, // phone أو email
    value: { type: String, required: true },
    label: { type: String, default: '' },
}, { timestamps: true });
const Contact = mongoose.model('Contact', ContactSchema);

// ══ AdCategory Model ══
const AdCategorySchema = new mongoose.Schema({
    name:  { type: String, required: true, unique: true },
    icon:  { type: String, default: '📢' },
    order: { type: Number, default: 0 },
}, { timestamps: true });
const AdCategory = mongoose.model('AdCategory', AdCategorySchema);

// ══ Monitor Model ══
const MonitorRequestSchema = new mongoose.Schema({
    clientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: { type: String, required: true },
    proId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proName:    { type: String, required: true },
    phone:      { type: String, default: '' },
    notes:      { type: String, default: '' },
    status:     { type: String, default: 'pending' }, // pending | assigned | active | done
    monitorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    monitorName:{ type: String, default: '' },
}, { timestamps: true });
const MonitorRequest = mongoose.model('MonitorRequest', MonitorRequestSchema);

const MonitorReportSchema = new mongoose.Schema({
    requestId:  { type: mongoose.Schema.Types.ObjectId, ref: 'MonitorRequest', required: true },
    monitorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    monitorName:{ type: String, required: true },
    note:       { type: String, required: true },
    rating:     { type: Number, min: 1, max: 5, default: 5 },
    images:     { type: [String], default: [] },
}, { timestamps: true });
const MonitorReport = mongoose.model('MonitorReport', MonitorReportSchema);

// ══ Chat Model ══
const ChatMessageSchema = new mongoose.Schema({
    from:    { type: String, required: true }, // userId أو adId
    to:      { type: String, required: true },
    fromName:{ type: String, default: '' },
    text:    { type: String, required: true },
    adId:    { type: String, default: '' }, // إذا كانت الرسالة عن إعلان
    read:    { type: Boolean, default: false },
}, { timestamps: true });
const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

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
        userData.password = await bcrypt.hash(userData.password, 10);
        await new User(userData).save();
        res.json({ success: true, userId: userData.userId });
    } catch(err) {
        res.status(400).json({ error: 'حدث خطأ في التسجيل' });
    }
});

// دالة تنظيف رقم الهاتف — تحول كل الصيغ لأرقام فقط بدون بادئة
function normalizePhone(phone) {
  if (!phone) return phone;
  return phone.toString().trim();
}

app.post('/api/auth/login', async (req, res) => {
    try {
        const { id, phone, email, password } = req.body;
        const identifier = id || phone || email;
        const normalized = normalizePhone(identifier);
        const normId = normalizePhone(identifier);
        const user = await User.findOne({
            $or: [
                { phone: identifier },
                { phone: normalized },
                { phone: normId },
                { email: identifier }
            ]
        });
        if (!user) return res.status(401).json({ message: 'خطأ في بيانات الدخول' });
        // دعم كلمات المرور القديمة (غير مشفرة) والجديدة (مشفرة)
        const isHashed = user.password.startsWith('$2');
        const passMatch = isHashed 
            ? await bcrypt.compare(password, user.password)
            : user.password === password;
        if (!passMatch) return res.status(401).json({ message: 'خطأ في بيانات الدخول' });
        // إذا كانت غير مشفرة نشفرها الآن
        if (!isHashed) {
            user.password = await bcrypt.hash(password, 10);
            await user.save();
        }
        if (!user) return res.status(401).json({ message: 'خطأ في بيانات الدخول' });
        if (user.blocked) return res.status(403).json({ message: 'هذا الحساب محظور من المنصة' });
        // تنظيف الـ role من المسافات
        if (user.role) user.role = user.role.trim();
        res.json({ success: true, user });
    } catch(e) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// ══ Change Password Route ══
app.put('/api/auth/change-password', async (req, res) => {
    try {
        const { oldPass, newPass } = req.body;
        const token = req.headers['x-auth-token'];
        if (!token) return res.status(401).json({ message: 'غير مصرح' });
        const user = await User.findById(token);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
        const match = await bcrypt.compare(oldPass, user.password);
        if (!match) return res.status(400).json({ message: 'كلمة المرور القديمة خاطئة' });
        user.password = await bcrypt.hash(newPass, 10);
        await user.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ message: 'خطأ في السيرفر' }); }
});

// ══ Upload Avatar Route ══
app.post('/api/upload/avatar', async (req, res) => {
    try {
        const { image, userId } = req.body;
        if (!image || !userId) return res.status(400).json({ error: 'بيانات ناقصة' });
        const result = await cloudinary.uploader.upload(image, {
            folder: 'omran/avatars',
            public_id: 'avatar_' + userId,
            overwrite: true,
            transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }]
        });
        await require('mongoose').model('User').findByIdAndUpdate(userId, { avatar: result.secure_url });
        res.json({ success: true, url: result.secure_url });
    } catch(e) { res.status(500).json({ error: 'فشل الرفع' }); }
});

// ══ Save Work Photos Route ══
app.put('/api/auth/photos', async (req, res) => {
    try {
        const { userId, photos } = req.body;
        if (!userId) return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
        await User.findByIdAndUpdate(userId, { portfolio: photos });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Upload Work Photos Route ══
app.post('/api/upload/photo', async (req, res) => {
    try {
        const { image, userId } = req.body;
        if (!image || !userId) return res.status(400).json({ error: 'بيانات ناقصة' });
        const result = await cloudinary.uploader.upload(image, {
            folder: 'omran/photos/' + userId,
            transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });
        res.json({ success: true, url: result.secure_url });
    } catch(e) { res.status(500).json({ error: 'فشل الرفع' }); }
});

// ══ Update Profile Route ══
app.put('/api/auth/update-profile', async (req, res) => {
    try {
        const { userId, phone, wa, description, city, village, spec, experience } = req.body;
        if (!userId) return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
        const updates = {};
        if (phone) updates.phone = phone;
        if (wa !== undefined) updates.wa = wa;
        if (description !== undefined) updates.description = description;
        if (city) updates.city = city;
        if (village !== undefined) updates.village = village;
        if (spec) updates.spec = spec;
        if (experience) updates.experience = experience;
        await User.findByIdAndUpdate(userId, updates);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ في التحديث' }); }
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
            // نضيف portfolio
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
        if (data.password) data.password = await bcrypt.hash(data.password, 10);
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

// ══ FAQ Routes ══
app.get('/api/faqs', async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ order: 1, createdAt: 1 });
        res.json(faqs);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/faqs', async (req, res) => {
    try {
        const { question, answer } = req.body;
        if (!question || !answer) return res.status(400).json({ error: 'أكمل البيانات' });
        await new FAQ({ question, answer }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/faqs/:id', async (req, res) => {
    try {
        await FAQ.findByIdAndDelete(req.params.id);
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
        const specs = await Spec.find().sort({ order: 1, createdAt: 1 });
        res.json(specs);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/specs', async (req, res) => {
    try {
        const { name, icon, materialIcon, color, iconColor, order } = req.body;
        if (!name) return res.status(400).json({ error: 'أدخل اسم المهنة' });
        const exists = await Spec.findOne({ name });
        if (exists) return res.status(400).json({ error: 'المهنة موجودة مسبقاً' });
        await new Spec({ name, icon: icon||'🔧', materialIcon: materialIcon||'construction', color: color||'#f0f4f8', iconColor: iconColor||'#475569', order: parseInt(order)||0 }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.put('/api/specs/:id', async (req, res) => {
    try {
        const { name, icon, materialIcon, color, iconColor, order } = req.body;
        await Spec.findByIdAndUpdate(req.params.id, { name, icon, materialIcon, color, iconColor, order: parseInt(order)||0 });
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
        const ads = await Ad.find({ expires: { $gt: now } }).sort({ category: 1, order: 1, createdAt: -1 });
        res.json(ads);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/ads', async (req, res) => {
    try {
        const { name, text, days, phone, image, targetCity, category, order } = req.body;
        if (!name || !text) return res.status(400).json({ error: 'أكمل البيانات' });
        const expires = new Date();
        expires.setDate(expires.getDate() + (parseInt(days) || 7));
        await new Ad({ name, text, phone: phone||'', image: image||'', targetCity: targetCity||'كل سوريا', category: category||'عام', order: parseInt(order)||0, expires }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/ads/:id', async (req, res) => {
    try {
        await Ad.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ AdCategory Routes ══
app.get('/api/ad-categories', async (req, res) => {
    try {
        const cats = await AdCategory.find().sort({ order: 1, createdAt: 1 });
        res.json(cats);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/ad-categories', async (req, res) => {
    try {
        const { name, icon, order } = req.body;
        if (!name) return res.status(400).json({ error: 'أدخل اسم الفئة' });
        const exists = await AdCategory.findOne({ name });
        if (exists) return res.status(400).json({ error: 'الفئة موجودة مسبقاً' });
        await new AdCategory({ name, icon: icon||'📢', order: parseInt(order)||0 }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.delete('/api/ad-categories/:id', async (req, res) => {
    try {
        await AdCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Monitor Routes ══

// طلب مراقب جديد من العميل
app.post('/api/monitor/request', async (req, res) => {
    try {
        const { clientId, clientName, proId, proName, phone, notes } = req.body;
        if (!clientId || !proId) return res.status(400).json({ error: 'بيانات ناقصة' });
        const req_ = await new MonitorRequest({ clientId, clientName, proId, proName, phone: phone||'', notes: notes||'' }).save();
        // إشعار للأدمن
        const admins = await User.find({ role: 'admin' });
        for(const admin of admins){
            await new Notification({
                userId: admin._id,
                type: 'monitor',
                message: `${clientName} طلب مراقب عُمران للحرفي ${proName}`,
                proId: clientId
            }).save();
        }
        res.json({ success: true, requestId: req_._id });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// جلب طلبات المراقبة (للأدمن)
app.get('/api/monitor/requests', async (req, res) => {
    try {
        const requests = await MonitorRequest.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch(e) { res.status(500).json([]); }
});

// جلب طلبات العميل
app.get('/api/monitor/requests/client/:clientId', async (req, res) => {
    try {
        const requests = await MonitorRequest.find({ clientId: req.params.clientId }).sort({ createdAt: -1 });
        res.json(requests);
    } catch(e) { res.status(500).json([]); }
});

// تعيين مراقب من الأدمن
app.put('/api/monitor/assign/:requestId', async (req, res) => {
    try {
        const { monitorId, monitorName } = req.body;
        await MonitorRequest.findByIdAndUpdate(req.params.requestId, {
            monitorId, monitorName, status: 'assigned'
        });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// تحديث حالة الطلب
app.put('/api/monitor/status/:requestId', async (req, res) => {
    try {
        const { status } = req.body;
        await MonitorRequest.findByIdAndUpdate(req.params.requestId, { status });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// رفع تقرير يومي
app.post('/api/monitor/report', async (req, res) => {
    try {
        const { requestId, monitorId, monitorName, note, rating, images } = req.body;
        if (!requestId || !note) return res.status(400).json({ error: 'بيانات ناقصة' });
        const report = await new MonitorReport({ requestId, monitorId, monitorName, note, rating: rating||5, images: images||[] }).save();
        // إشعار للعميل
        const request = await MonitorRequest.findById(requestId);
        if(request?.clientId){
            await new Notification({
                userId: request.clientId,
                type: 'monitor',
                message: `${monitorName} رفع تقريراً جديداً عن شغلك`,
                proId: monitorId
            }).save();
        }
        res.json({ success: true, report });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// جلب تقارير طلب معين
app.get('/api/monitor/reports/:requestId', async (req, res) => {
    try {
        const reports = await MonitorReport.find({ requestId: req.params.requestId }).sort({ createdAt: -1 });
        res.json(reports);
    } catch(e) { res.status(500).json([]); }
});

// ══ Chat Routes ══
app.post('/api/chat/send', async (req, res) => {
    try {
        const { from, to, fromName, text, adId } = req.body;
        if (!from || !to || !text) return res.status(400).json({ error: 'بيانات ناقصة' });
        const msg = await new ChatMessage({ from, to, fromName: fromName||'', text, adId: adId||'' }).save();
        // إشعار للمستلم
        await new Notification({
            userId: to,
            type: 'message',
            message: (fromName||'أحدهم') + ' أرسل لك رسالة',
            proId: from
        }).save();
        res.json({ success: true, message: msg });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.get('/api/chat/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const messages = await ChatMessage.find({
            $or: [{ from: userId }, { to: userId }]
        }).sort({ createdAt: -1 }).limit(100);
        // تجميع المحادثات حسب الطرف الآخر
        const convMap = {};
        messages.forEach(m => {
            const other = m.from === userId ? m.to : m.from;
            const otherName = m.from === userId ? m.to : m.fromName;
            if (!convMap[other]) convMap[other] = { id: other, name: otherName, lastMsg: m.text, lastTime: m.createdAt, unread: 0, adId: m.adId };
            if (m.to === userId && !m.read) convMap[other].unread++;
        });
        res.json(Object.values(convMap));
    } catch(e) { res.status(500).json([]); }
});

app.get('/api/chat/:userId/:otherId', async (req, res) => {
    try {
        const { userId, otherId } = req.params;
        const messages = await ChatMessage.find({
            $or: [
                { from: userId, to: otherId },
                { from: otherId, to: userId }
            ]
        }).sort({ createdAt: 1 });
        // تحديد كمقروء
        await ChatMessage.updateMany({ from: otherId, to: userId, read: false }, { read: true });
        res.json(messages);
    } catch(e) { res.status(500).json([]); }
});

// ══ Frontend ══

app.use(express.static(path.join(__dirname, './')));
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'index.html')));

const PORT = process.env.PORT || 10000;
// ══ Seed المهن الافتراضية ══
async function seedSpecs(){
  const defaults = [
    {name:'بلاط وسيراميك', icon:'🪟', materialIcon:'grid_view',      color:'#e0f2fe', iconColor:'#0284c7', order:1},
    {name:'دهان وديكور',   icon:'🖌️', materialIcon:'format_paint',   color:'#fce7f3', iconColor:'#db2777', order:2},
    {name:'كهرباء',        icon:'⚡', materialIcon:'bolt',           color:'#fefce8', iconColor:'#ca8a04', order:3},
    {name:'صحي وسباكة',    icon:'🚰', materialIcon:'water_drop',     color:'#e0f2fe', iconColor:'#0369a1', order:4},
    {name:'بناء وترميم',   icon:'🧱', materialIcon:'foundation',     color:'#f1f5f9', iconColor:'#475569', order:5},
    {name:'نجارة',         icon:'🪚', materialIcon:'carpenter',      color:'#fef3c7', iconColor:'#92400e', order:6},
    {name:'هندسة مدنية',   icon:'📐', materialIcon:'architecture',   color:'#f5f3ff', iconColor:'#7c3aed', order:7},
    {name:'هندسة معمارية', icon:'🏛️', materialIcon:'architecture',   color:'#f5f3ff', iconColor:'#7c3aed', order:8},
    {name:'مقاولات عامة',  icon:'🏗️', materialIcon:'engineering',    color:'#fef9c3', iconColor:'#a16207', order:9},
    {name:'آليات ثقيلة',   icon:'🚛', materialIcon:'agriculture',    color:'#fef3c7', iconColor:'#b45309', order:10},
    {name:'محامون',        icon:'⚖️', materialIcon:'gavel',          color:'#f0fdf4', iconColor:'#15803d', order:11},
    {name:'هدم',           icon:'💥', materialIcon:'delete_forever', color:'#fee2e2', iconColor:'#dc2626', order:12},
    {name:'جبس وديكور',    icon:'🎨', materialIcon:'brush',          color:'#fdf4ff', iconColor:'#a855f7', order:13},
    {name:'حديد وألمنيوم', icon:'🔩', materialIcon:'hardware',       color:'#f1f5f9', iconColor:'#334155', order:14},
    {name:'محل مواد بناء', icon:'🏪', materialIcon:'storefront',     color:'#dcfce7', iconColor:'#15803d', order:15},
  ];
  for(const sp of defaults){
    const exists = await Spec.findOne({name: sp.name});
    if(!exists) await new Spec(sp).save();
    else await Spec.updateOne({name: sp.name}, {$set: {materialIcon: sp.materialIcon, color: sp.color, iconColor: sp.iconColor, order: sp.order}});
  }
  console.log('✅ Specs seeded');
}

app.listen(PORT, () => {
  console.log(`📡 Server Running on ${PORT}`);
  seedSpecs().catch(console.error);
});
