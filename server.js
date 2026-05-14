require("dotenv").config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_iGYKUZqE_Ku5Z8QAqNFM8JNDuDM2pQ6KN';
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
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET','POST'] }
});

// ══ Socket.io ══
const onlineUsers = {}; // userId → socketId

io.on('connection', socket => {
    // تسجيل المستخدم
    socket.on('register', userId => {
        if(userId) {
            onlineUsers[userId] = socket.id;
            socket.userId = userId;
        }
    });

    // إرسال رسالة real-time
    socket.on('sendMessage', async ({ from, to, fromName, text }) => {
        try {
            const msg = await new ChatMessage({ from, to, fromName, text }).save();
            // أرسل للمستقبل لو أونلاين
            const toSocket = onlineUsers[to];
            if(toSocket) {
                io.to(toSocket).emit('newMessage', {
                    _id: msg._id,
                    from, to, fromName, text,
                    createdAt: msg.createdAt
                });
            }
            // أرسل تأكيد للمرسل
            socket.emit('messageSent', {
                _id: msg._id,
                from, to, fromName, text,
                createdAt: msg.createdAt
            });
        } catch(e) {
            socket.emit('messageError', { error: 'فشل الإرسال' });
        }
    });

    // مؤشر الكتابة
    socket.on('typing', ({ from, to, fromName }) => {
        const toSocket = onlineUsers[to];
        if(toSocket) io.to(toSocket).emit('userTyping', { from, fromName });
    });

    socket.on('stopTyping', ({ from, to }) => {
        const toSocket = onlineUsers[to];
        if(toSocket) io.to(toSocket).emit('userStopTyping', { from });
    });

    // قطع الاتصال
    socket.on('disconnect', () => {
        if(socket.userId) delete onlineUsers[socket.userId];
    });
});

// ══ Email Transporter ══
// Resend API للإيميل
async function sendEmailResend(to, subject, html){
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'عُمران <noreply@omransy.com>',
            to,
            subject,
            html
        })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message||'فشل إرسال الإيميل');
    return data;
}

// كود التحقق المؤقت
const verificationCodes = {};

async function sendVerificationEmail(email, name) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 };
    await sendEmailResend(email, 'كود تأكيد حسابك في عُمران', `
        <div dir="rtl" style="font-family:Arial;max-width:400px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px">
          <h2 style="color:#2563eb;text-align:center">عُمران 🏗️</h2>
          <p>مرحباً ${name}،</p>
          <p>كود تأكيد حسابك:</p>
          <div style="background:#f0f4f8;border-radius:8px;padding:20px;text-align:center;font-size:32px;font-weight:900;letter-spacing:8px;color:#1e3a8a">${code}</div>
          <p style="color:#64748b;font-size:13px;margin-top:12px">صالح لمدة 10 دقائق</p>
        </div>`
    );
    return code;
}
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ملفات PWA
app.get('/sw.js', (req, res) => res.sendFile('sw.js', { root: __dirname }));
app.get('/manifest.json', (req, res) => res.sendFile('manifest.json', { root: __dirname }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

mongoose.connect(process.env.MONGODB_URI)
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

// ══ Report Model ══
const ReportSchema = new mongoose.Schema({
    reporterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reporterName: { type: String, required: true },
    proId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proName:      { type: String, required: true },
    reason:       { type: String, required: true }, // غش | عدم_حضور | جودة_سيئة | سلوك_سيء | أخرى
    details:      { type: String, default: '' },
    status:       { type: String, default: 'pending' }, // pending | reviewed | dismissed
    action:       { type: String, default: '' }, // warning | suspend | ban | none
}, { timestamps: true });
const Report = mongoose.model('Report', ReportSchema);

// ══ Settings Model ══
const SettingSchema = new mongoose.Schema({
    key:   { type: String, unique: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
const Setting = mongoose.model('Setting', SettingSchema);

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
    rating: { type: Number, default: 0 },
    ratingComment: { type: String, default: '' },
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

// ══ Product Model ══
const ProductSchema = new mongoose.Schema({
    sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName:  { type: String, required: true },
    sellerPhone: { type: String, default: '' },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    category:    { type: String, required: true },
    price:       { type: Number, required: true },
    negotiable:  { type: Boolean, default: false },
    condition:   { type: String, default: 'مستعمل' }, // جديد | مستعمل
    location:    { type: String, default: '' },
    city:        { type: String, default: '' },
    images:      { type: [String], default: [] },
    status:      { type: String, default: 'pending' }, // pending | active | sold | rejected
}, { timestamps: true });
const Product = mongoose.model('Product', ProductSchema);

// ══ Job Model ══
const JobSchema = new mongoose.Schema({
    clientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientName:  { type: String, required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    category:    { type: String, required: true },
    location:    { type: String, default: '' },
    budget:      { type: Number, default: 0 },
    images:      { type: [String], default: [] },
    status:      { type: String, default: 'open' }, // open | closed
    assignedPro: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
const Job = mongoose.model('Job', JobSchema);

// ══ Offer Model ══
const OfferSchema = new mongoose.Schema({
    jobId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    proId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proName:     { type: String, required: true },
    proAvatar:   { type: String, default: '' },
    proRating:   { type: Number, default: 0 },
    price:       { type: Number, required: true },
    duration:    { type: String, required: true },
    note:        { type: String, default: '' },
    status:      { type: String, default: 'pending' }, // pending | accepted | rejected
}, { timestamps: true });
const Offer = mongoose.model('Offer', OfferSchema);

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

// ══ Send Verification Code ══
app.post('/api/auth/send-code', async (req, res) => {
    try {
        const { email, name } = req.body;
        // Rate limit — 3 طلبات كل 10 دقائق لكل إيميل
        if (!rateLimit('otp:' + email, 3, 10 * 60 * 1000)) {
            return res.status(429).json({ error: 'حاولت كثيراً — انتظر 10 دقائق قبل إعادة المحاولة' });
        }
        if (!email) return res.status(400).json({ error: 'أدخل الإيميل' });
        console.log('📧 إرسال كود لـ:', email);
        await sendVerificationEmail(email, name || 'مستخدم');
        console.log('✅ تم الإرسال');
        res.json({ success: true });
    } catch(e) {
        console.error('❌ خطأ nodemailer:', e.message);
        res.status(500).json({ error: 'تعذر إرسال الإيميل: ' + e.message });
    }
});

// ══ Verify Code ══
app.post('/api/auth/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        const stored = verificationCodes[email];
        if (!stored) return res.status(400).json({ error: 'لم يتم إرسال كود لهذا الإيميل' });
        if (Date.now() > stored.expires) return res.status(400).json({ error: 'انتهت صلاحية الكود' });
        if (stored.code !== code) return res.status(400).json({ error: 'الكود غير صحيح' });
        delete verificationCodes[email];
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'خطأ' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const userData = req.body;
        // تحويل الإيميل لحروف صغيرة
        if (userData.email) userData.email = userData.email.toLowerCase().trim();
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
        // تطبيع رقم الهاتف — حفظ بصيغة +XXXX
        if (userData.phone) {
            try {
                // decode لو في %2B بدل +
                userData.phone = decodeURIComponent(userData.phone);
            } catch(e) {}
            const vars = phoneVariants(userData.phone);
            const intl = vars.find(v => v.startsWith('+'));
            userData.phone = intl || userData.phone;
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
// خريطة نداءات الدول
const DIAL_CODES = {
  '963':'09','49':'0','90':'0','966':'05','971':'0',
  '962':'07','961':'0','20':'0','46':'0','31':'0',
  '32':'0','41':'0','33':'0','44':'0','1':'','39':'0'
};

function normalizePhone(phone) {
  if (!phone) return null;
  let p = phone.toString().trim().replace(/[\s\-\(\)]/g, '');
  // حول 00 → +
  if (p.startsWith('00')) p = '+' + p.slice(2);
  // إذا بدأ بـ + احذف الـ + وارجع الأرقام فقط
  if (p.startsWith('+')) p = p.slice(1);
  // أرجع الرقم بدون + مشان المقارنة موحدة
  return p;
}

// توليد كل الصيغ الممكنة لرقم واحد
function phoneVariants(phone) {
  if (!phone) return [];
  const variants = new Set();
  try { phone = decodeURIComponent(phone); } catch(e) {}
  let p = phone.toString().trim().replace(/[\s\-\(\)]/g, '');
  // أضف الرقم الأصلي
  variants.add(p);
  // حول 00 → +
  if (p.startsWith('00')) p = '+' + p.slice(2);
  else if (!p.startsWith('+') && !p.startsWith('0') && p.length > 8) p = '+' + p;
  variants.add(p);
  // بدون +
  const noPlus = p.startsWith('+') ? p.slice(1) : p;
  variants.add(noPlus);
  // مع +
  if (!p.startsWith('+')) variants.add('+' + p);
  // مع 00
  if (p.startsWith('+')) variants.add('00' + p.slice(1));
  // جرب شيل نداء الدولة وإضافة صفر
  for (const [code, zero] of Object.entries(DIAL_CODES)) {
    if (noPlus.startsWith(code)) {
      const local = zero + noPlus.slice(code.length);
      variants.add(local);
      variants.add('+' + noPlus);
      variants.add('00' + noPlus);
    }
    // العكس — إذا بدأ بالصفر المحلي
    if (zero && p.startsWith(zero) && !p.startsWith('+')) {
      const withCode = code + p.slice(zero.length);
      variants.add(withCode);
      variants.add('+' + withCode);
      variants.add('00' + withCode);
    }
  }
  return Array.from(variants);
}

app.post('/api/auth/login', async (req, res) => {
    try {
        const { id, phone, email, password } = req.body;
        const rawIdentifier = (id || phone || email || '').trim();
        // إذا إيميل — حوّله لصغير
        const identifier = rawIdentifier.includes('@') 
            ? rawIdentifier.toLowerCase() 
            : rawIdentifier;
        // توليد كل الصيغ الممكنة للرقم
        const allVariants = phoneVariants(identifier);
        const user = await User.findOne({
            $or: [
                { phone: { $in: allVariants } },
                { email: identifier },
                { email: rawIdentifier.toLowerCase() }
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
        await User.findByIdAndUpdate(userId, { avatar: result.secure_url });
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
        const cached = getCache('pros');
        if(cached) return res.json(cached);
        const pros = await User.find({ role: 'pro', blocked: { $ne: true } })
            .sort({ isFeatured: -1, verified: -1, createdAt: -1 })
            .lean();
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
        setCache('pros', prosWithReviews);
        res.json(prosWithReviews);
    } catch(e) { res.status(500).json([]); }
});

app.post('/api/pros/add', async (req, res) => {
    try {
        const data = { ...req.body, role: 'pro', userId: 'OMR-' + Math.floor(100000 + Math.random() * 900000) };
        if (data.password) data.password = await bcrypt.hash(data.password, 10);
        const pro = new User(data);
        await pro.save();
        clearCache('pros');
        res.status(201).json({ success: true, data: pro });
    } catch(e) { res.status(400).json({ error: 'خطأ في الإضافة' }); }
});

// ══ Delete User Route ══
app.delete('/api/admin/delete/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});
app.delete('/api/admin/user/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ في الحذف' }); }
});

// ══ Monitors Route ══
app.get('/api/monitors', async (req, res) => {
    try {
        const monitors = await User.find({ role: 'monitor', blocked: { $ne: true } })
            .select('_id name phone city spec')
            .sort({ createdAt: -1 });
        res.json(monitors);
    } catch(e) { res.status(500).json([]); }
});

// ══ Admin Add User Route ══
app.post('/api/admin/add-user', async (req, res) => {
    try {
        const { name, phone, email, password, role, spec, city, village, description, experience, wa } = req.body;
        if (!name) return res.status(400).json({ error: 'الاسم مطلوب' });
        if (!phone && !email) return res.status(400).json({ error: 'رقم الهاتف أو الإيميل مطلوب' });
        // تحقق من عدم التكرار
        const orQuery = [];
        if (phone) { const variants = phoneVariants(phone); orQuery.push({ phone: { $in: variants } }); }
        if (email) orQuery.push({ email: email.toLowerCase().trim() });
        if (orQuery.length) {
            const existing = await User.findOne({ $or: orQuery });
            if (existing) return res.status(400).json({ error: 'المستخدم مسجل مسبقاً' });
        }
        const hashed = await bcrypt.hash(password || phone || '123456', 10);
        const emailVal = email ? email.toLowerCase().trim() : undefined;
        const user = new User({
            name, phone: phone||'',
            ...(emailVal ? { email: emailVal } : {}),
            password: hashed, role: role||'pro',
            spec: spec||'', city: city||'', village: village||'',
            description: description||'', experience: experience||'',
            wa: wa||phone||'',
            userId: 'OMR-' + Math.floor(100000 + Math.random() * 900000)
        });
        await user.save();
        res.json({ success: true, userId: user._id });
    } catch(e) { console.error(e); res.status(500).json({ error: 'خطأ في الإضافة: ' + e.message }); }
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
        const { author, isAdmin } = req.body;
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ error: 'التعليق غير موجود' });
        if (!isAdmin && review.author !== author) return res.status(403).json({ error: 'لا يمكنك حذف تعليق شخص آخر' });
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

// ══ Edit Review Route ══
app.put('/api/pros/:proId/review/:reviewId', async (req, res) => {
    try {
        const { text, author } = req.body;
        if (!text) return res.status(400).json({ error: 'النص مطلوب' });
        const result = await User.updateOne(
            { _id: req.params.proId, 'reviews._id': req.params.reviewId, 'reviews.author': author },
            { $set: { 'reviews.$.text': text } }
        );
        if(result.modifiedCount === 0) return res.status(403).json({ error: 'غير مصرح' });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Reply Routes ══
app.post('/api/pros/:proId/review/:reviewId/reply', async (req, res) => {
    try {
        const { author, text } = req.body;
        if (!author || !text) return res.status(400).json({ error: 'أكمل البيانات' });
        const pro = await User.findById(req.params.proId);
        if (!pro) return res.status(404).json({ error: 'غير موجود' });
        const review = pro.reviews?.id ? pro.reviews.id(req.params.reviewId) : null;
        // نستخدم $push مباشرة
        await User.updateOne(
            { _id: req.params.proId, 'reviews._id': req.params.reviewId },
            { $push: { 'reviews.$.replies': { author, text, createdAt: new Date() } } }
        );
        res.json({ success: true });
    } catch(e) { console.error(e); res.status(500).json({ error: 'خطأ' }); }
});

// ══ Stats Dashboard Route ══
app.get('/api/admin/stats', async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const [
            totalUsers, totalPros, totalClients,
            newUsersToday, newUsersMonth,
            totalJobs, openJobs, closedJobs, newJobsMonth,
            totalProducts, activeProducts, pendingProducts,
            totalReports, pendingReports,
            totalMonitor, activeMonitor,
            totalReviews,
            prosThisMonth, prosLastMonth,
            usersThisMonth, usersLastMonth,
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' } }),
            User.countDocuments({ role: 'pro' }),
            User.countDocuments({ role: 'client' }),
            User.countDocuments({ createdAt: { $gte: today } }),
            User.countDocuments({ createdAt: { $gte: thisMonth } }),
            Job.countDocuments({}),
            Job.countDocuments({ status: 'open' }),
            Job.countDocuments({ status: 'closed' }),
            Job.countDocuments({ createdAt: { $gte: thisMonth } }),
            Product.countDocuments({}),
            Product.countDocuments({ status: 'active' }),
            Product.countDocuments({ status: 'pending' }),
            Report.countDocuments({}),
            Report.countDocuments({ status: 'pending' }),
            MonitorRequest.countDocuments({}),
            MonitorRequest.countDocuments({ status: { $in: ['assigned','active'] } }),
            Review.countDocuments({}),
            User.countDocuments({ role: 'pro', createdAt: { $gte: thisMonth } }),
            User.countDocuments({ role: 'pro', createdAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
            User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: thisMonth } }),
            User.countDocuments({ role: { $ne: 'admin' }, createdAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
        ]);

        // آخر 7 أيام — تسجيلات يومية
        const last7 = [];
        for(let i=6; i>=0; i--){
            const d = new Date(today); d.setDate(d.getDate()-i);
            const next = new Date(d); next.setDate(next.getDate()+1);
            const count = await User.countDocuments({ createdAt: { $gte: d, $lt: next } });
            last7.push({ date: d.toLocaleDateString('ar-SY',{weekday:'short'}), count });
        }

        // نسبة النمو
        const proGrowth = prosLastMonth > 0 ? Math.round((prosThisMonth-prosLastMonth)/prosLastMonth*100) : 0;
        const userGrowth = usersLastMonth > 0 ? Math.round((usersThisMonth-usersLastMonth)/usersLastMonth*100) : 0;

        res.json({
            users: { total:totalUsers, pros:totalPros, clients:totalClients, today:newUsersToday, month:newUsersMonth, growth:userGrowth },
            jobs:  { total:totalJobs, open:openJobs, closed:closedJobs, month:newJobsMonth },
            market:{ total:totalProducts, active:activeProducts, pending:pendingProducts },
            reports:{ total:totalReports, pending:pendingReports },
            monitor:{ total:totalMonitor, active:activeMonitor },
            reviews:{ total:totalReviews },
            pros:  { month:prosThisMonth, growth:proGrowth },
            chart: last7,
        });
    } catch(e) { console.error(e); res.status(500).json({ error: 'خطأ' }); }
});

// ══ Reset Password Routes ══

// إرسال كود إعادة تعيين كلمة المرور
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email, phone } = req.body;
        // Rate limit — 3 طلبات كل 10 دقائق
        const limitKey = 'forgot:' + (email||phone||'unknown');
        if (!rateLimit(limitKey, 3, 10 * 60 * 1000)) {
            return res.status(429).json({ error: 'حاولت كثيراً — انتظر 10 دقائق' });
        }
        if (!email && !phone) return res.status(400).json({ error: 'أدخل الإيميل أو رقم الهاتف' });
        // البحث عن المستخدم
        let user = null;
        if (email) user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user && phone) {
            const variants = phoneVariants(phone);
            user = await User.findOne({ phone: { $in: variants } });
        }
        if (!user) return res.status(404).json({ error: 'لم يتم العثور على حساب بهذه البيانات' });
        if (!user.email) return res.status(400).json({ error: 'لا يوجد إيميل مرتبط بهذا الحساب — تواصل مع الإدارة' });
        // إرسال كود التأكيد
        await sendVerificationEmail(user.email, user.name);
        res.json({ success: true, email: user.email });
    } catch(e) { console.error(e); res.status(500).json({ error: 'خطأ في الإرسال' }); }
});

// تأكيد الكود وتغيير كلمة المرور
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, code, newPass } = req.body;
        if (!email || !code || !newPass) return res.status(400).json({ error: 'أكمل البيانات' });
        if (newPass.length < 6) return res.status(400).json({ error: 'كلمة المرور قصيرة' });
        // التحقق من الكود
        const stored = verificationCodes[email];
        if (!stored) return res.status(400).json({ error: 'لم يتم إرسال كود لهذا الإيميل' });
        if (Date.now() > stored.expires) return res.status(400).json({ error: 'انتهت صلاحية الكود' });
        if (stored.code !== code) return res.status(400).json({ error: 'الكود غير صحيح' });
        delete verificationCodes[email];
        // تحديث كلمة المرور
        const hashed = await bcrypt.hash(newPass, 10);
        await User.findOneAndUpdate({ email }, { password: hashed });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Memory Cache ══
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

function getCache(key){ 
    const item = cache.get(key);
    if(!item) return null;
    if(Date.now() > item.expires){ cache.delete(key); return null; }
    return item.data;
}
function setCache(key, data){ 
    cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}
function clearCache(key){ cache.delete(key); }

// ══ Rate Limiting ══
const rateLimitMap = new Map();

function rateLimit(key, maxRequests, windowMs){
    const now = Date.now();
    const windowData = rateLimitMap.get(key) || { count: 0, start: now };
    if (now - windowData.start > windowMs) {
        rateLimitMap.set(key, { count: 1, start: now });
        return true;
    }
    if (windowData.count >= maxRequests) return false;
    windowData.count++;
    rateLimitMap.set(key, windowData);
    return true;
}

// تنظيف كل ساعة
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitMap.entries()) {
        if (now - data.start > 3600000) rateLimitMap.delete(key);
    }
}, 3600000);

// ══ Settings Routes ══
app.get('/api/settings/:key', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: req.params.key });
        res.json({ value: setting ? setting.value : null });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

app.put('/api/settings/:key', async (req, res) => {
    try {
        const { value } = req.body;
        await Setting.findOneAndUpdate(
            { key: req.params.key },
            { value },
            { upsert: true }
        );
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Report Routes ══

// إرسال بلاغ
app.post('/api/reports', async (req, res) => {
    try {
        const { reporterId, reporterName, proId, proName, reason, details } = req.body;
        if (!reporterId || !proId || !reason)
            return res.status(400).json({ error: 'أكمل البيانات' });
        // منع تكرار البلاغ من نفس المستخدم
        const existing = await Report.findOne({ reporterId, proId });
        if (existing) return res.status(400).json({ error: 'سبق أن أرسلت بلاغاً على هذا الحرفي' });
        const report = await new Report({ reporterId, reporterName, proId, proName, reason, details: details||'' }).save();
        // إشعار الأدمن
        const admins = await User.find({ role: 'admin' });
        for(const admin of admins){
            await new Notification({
                userId: admin._id,
                type: 'report',
                message: `بلاغ جديد: ${reporterName} أبلغ عن ${proName} — السبب: ${reason}`,
                proId: reporterId
            }).save();
        }
        // فحص عدد البلاغات — 3 بلاغات = تحذير تلقائي
        const count = await Report.countDocuments({ proId, status: { $ne: 'dismissed' } });
        if(count >= 3){
            const pro = await User.findById(proId);
            if(pro && !pro.blocked){
                await new Notification({
                    userId: proId,
                    type: 'warning',
                    message: 'تحذير: تلقيت 3 بلاغات على ملفك. يرجى التواصل مع الإدارة.',
                    proId
                }).save();
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// جلب البلاغات (للأدمن)
app.get('/api/reports', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};
        const reports = await Report.find(filter).sort({ createdAt: -1 });
        res.json(reports);
    } catch(e) { res.status(500).json([]); }
});

// مراجعة البلاغ واتخاذ إجراء
app.put('/api/reports/:id/action', async (req, res) => {
    try {
        const { action, status } = req.body;
        await Report.findByIdAndUpdate(req.params.id, { action, status: status||'reviewed' });
        const report = await Report.findById(req.params.id);
        if(!report) return res.status(404).json({ error: 'البلاغ غير موجود' });
        // تطبيق الإجراء على الحرفي
        if(action === 'suspend'){
            await User.findByIdAndUpdate(report.proId, { blocked: true });
            await new Notification({ userId: report.proId, type: 'warning', message: 'تم إيقاف حسابك مؤقتاً بسبب البلاغات. تواصل مع الإدارة.', proId: report.proId }).save();
        } else if(action === 'warning'){
            await new Notification({ userId: report.proId, type: 'warning', message: 'تحذير رسمي من إدارة عُمران. يرجى الالتزام بمعايير الجودة.', proId: report.proId }).save();
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Monitor Routes ══
// حذف طلب مراقب
app.delete('/api/monitor/request/:id', async (req, res) => {
    try {
        const { clientId } = req.body;
        const request = await MonitorRequest.findById(req.params.id);
        if(!request) return res.status(404).json({ error: 'الطلب غير موجود' });
        if(clientId !== 'admin' && String(request.clientId) !== String(clientId))
            return res.status(403).json({ error: 'غير مصرح' });
        // احذف التقارير المرتبطة
        await MonitorReport.deleteMany({ requestId: req.params.id });
        await MonitorRequest.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// تقييم المراقب بعد انتهاء المهمة
app.post('/api/monitor/rate/:requestId', async (req, res) => {
    try {
        const { clientId, stars, comment } = req.body;
        if(!stars || stars < 1 || stars > 5) return res.status(400).json({ error: 'التقييم غير صحيح' });
        const request = await MonitorRequest.findById(req.params.requestId);
        if(!request) return res.status(404).json({ error: 'الطلب غير موجود' });
        if(String(request.clientId) !== String(clientId))
            return res.status(403).json({ error: 'غير مصرح' });
        // حفظ التقييم في الطلب
        await MonitorRequest.findByIdAndUpdate(req.params.requestId, {
            rating: stars, ratingComment: comment||''
        });
        // إشعار للمراقب
        if(request.monitorId){
            await new Notification({
                userId: request.monitorId,
                type: 'review',
                message: `⭐ حصلت على تقييم ${stars}/5 من عميل — ${comment||''}`,
                proId: clientId
            }).save();
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Monitor Report Routes ══

// رفع تقرير يومي
app.post('/api/monitor/report', async (req, res) => {
    try {
        const { requestId, monitorId, monitorName, clientId, text, images, day } = req.body;
        if(!requestId || !monitorId || !text) return res.status(400).json({ error: 'أكمل البيانات' });
        const report = await new MonitorReport({
            requestId, monitorId, monitorName: monitorName||'',
            clientId, text, images: images||[], day: day||1
        }).save();
        // إشعار للعميل
        await new Notification({
            userId: clientId,
            type: 'monitor',
            message: `📋 تقرير يومي جديد من مراقبك — اليوم ${day||1}: ${text.substring(0,50)}${text.length>50?'...':''}`,
            proId: monitorId
        }).save();
        res.json({ success: true, report });
    } catch(e) { console.error(e); res.status(500).json({ error: 'خطأ' }); }
});

// جلب تقارير طلب معين
app.get('/api/monitor/reports/:requestId', async (req, res) => {
    try {
        const reports = await MonitorReport.find({ requestId: req.params.requestId })
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch(e) { res.status(500).json([]); }
});

// جلب مهام المراقب
app.get('/api/monitor/requests/monitor/:monitorId', async (req, res) => {
    try {
        const tasks = await MonitorRequest.find({ 
            monitorId: req.params.monitorId 
        }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch(e) { res.status(500).json([]); }
});

// طلب مراقب جديد من العميل
app.post('/api/monitor/request', async (req, res) => {
    // فحص إذا كانت الخدمة مفعلة
    const setting = await Setting.findOne({ key: 'monitor_enabled' });
    if(setting && setting.value === false){
        return res.status(403).json({ error: 'خدمة المراقب غير مفعلة حالياً' });
    }
    try {
        const { clientId, clientName, proId, proName, phone, notes } = req.body;
        if (!clientId) return res.status(400).json({ error: 'بيانات ناقصة' });
        // قبول proId كـ string أو ObjectId
        const proIdVal = mongoose.Types.ObjectId.isValid(proId) ? proId : null;
        const clientIdVal = mongoose.Types.ObjectId.isValid(clientId) ? clientId : null;
        if(!clientIdVal) return res.status(400).json({ error: 'معرف العميل غير صحيح' });
        const req_ = await new MonitorRequest({ 
            clientId: clientIdVal, 
            clientName: clientName||'', 
            proId: proIdVal||clientIdVal, 
            proName: proName||'طلب مباشر', 
            phone: phone||'', 
            notes: notes||'' 
        }).save();
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
        const request = await MonitorRequest.findByIdAndUpdate(req.params.requestId, {
            monitorId, monitorName, status: 'assigned'
        }, { new: false });

        if(request){
            // 1. إشعار للعميل
            if(request.clientId){
                await new Notification({
                    userId: request.clientId,
                    type: 'monitor',
                    message: `✅ تم تعيين مراقب لطلبك — ${monitorName} سيتواصل معك قريباً`,
                    proId: monitorId || request.clientId
                }).save();
            }
            // 2. إشعار تفصيلي للمراقب
            if(monitorId){
                const details = [
                    `👤 العميل: ${request.clientName}`,
                    `📞 الهاتف: ${request.phone||'غير محدد'}`,
                    `📝 التفاصيل: ${request.notes||'لا توجد ملاحظات'}`,
                    `📅 تاريخ الطلب: ${new Date(request.createdAt).toLocaleDateString('ar-SY')}`
                ].join(' | ');
                await new Notification({
                    userId: monitorId,
                    type: 'monitor',
                    message: `🏗️ مهمة جديدة بانتظارك! ${details}`,
                    proId: request.clientId || monitorId
                }).save();
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// تحديث حالة الطلب
app.put('/api/monitor/status/:requestId', async (req, res) => {
    try {
        const { status } = req.body;
        const request = await MonitorRequest.findByIdAndUpdate(
            req.params.requestId, { status }, { new: false }
        );
        // لو انتهت المهمة — أرسل إشعار للعميل للتقييم
        if(status === 'done' && request?.clientId){
            await new Notification({
                userId: request.clientId,
                type: 'review',
                message: `🏁 انتهت مهمة المراقب! كيف كانت تجربتك؟ قيّم المراقب من صفحة طلباتك`,
                proId: request.monitorId || request.clientId
            }).save();
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});



// ══ Market Routes ══

// إضافة منتج
app.post('/api/market', async (req, res) => {
    try {
        const { sellerId, sellerName, sellerPhone, title, description, category, price, negotiable, condition, location, city, images } = req.body;
        if (!sellerId || !title || !description || !category || !price)
            return res.status(400).json({ error: 'أكمل البيانات المطلوبة' });
        const product = await new Product({ sellerId, sellerName, sellerPhone: sellerPhone||'', title, description, category, price: Number(price), negotiable: negotiable||false, condition: condition||'مستعمل', location: location||'', city: city||'', images: images||[] }).save();
        // إشعار للأدمن
        const admins = await User.find({ role: 'admin' });
        for(const admin of admins){
            await new Notification({
                userId: admin._id,
                type: 'market',
                message: `${sellerName} أضاف منتجاً جديداً للمراجعة: ${title}`,
                proId: sellerId
            }).save();
        }
        res.json({ success: true, product });
    } catch(e) { res.status(500).json({ error: 'خطأ في الإضافة' }); }
});

// جلب المنتجات
app.get('/api/market', async (req, res) => {
    try {
        const { category, city, condition } = req.query;
        const filter = { status: 'active' };
        if (category) filter.category = category;
        if (city) filter.city = city;
        if (condition) filter.condition = condition;
        const products = await Product.find(filter).sort({ createdAt: -1 });
        // seller يشوف منتجاته كلها
        res.json(products);
    } catch(e) { res.status(500).json([]); }
});

// جلب منتجات بائع
app.get('/api/market/seller/:sellerId', async (req, res) => {
    try {
        const products = await Product.find({ sellerId: req.params.sellerId }).sort({ createdAt: -1 });
        res.json(products);
    } catch(e) { res.status(500).json([]); }
});

// جلب منتج واحد
app.get('/api/market/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
        res.json(product);
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// تحديث حالة المنتج (بيع/حذف)
app.put('/api/market/:id', async (req, res) => {
    try {
        const { sellerId, status } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
        if (String(product.sellerId) !== String(sellerId))
            return res.status(403).json({ error: 'غير مصرح' });
        await Product.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// موافقة الأدمن على منتج
app.put('/api/market/:id/approve', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { status: 'active' });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// رفض منتج
app.put('/api/market/:id/reject', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// جلب المنتجات pending للأدمن
app.get('/api/market/pending/all', async (req, res) => {
    try {
        const products = await Product.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(products);
    } catch(e) { res.status(500).json([]); }
});

// حذف منتج
app.delete('/api/market/:id', async (req, res) => {
    try {
        const { sellerId } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
        if (String(product.sellerId) !== String(sellerId))
            return res.status(403).json({ error: 'غير مصرح' });
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Job Routes ══

// نشر طلب جديد
app.post('/api/jobs', async (req, res) => {
    try {
        const { clientId, clientName, title, description, category, location, budget, images } = req.body;
        if (!clientId || !title || !description || !category)
            return res.status(400).json({ error: 'أكمل البيانات المطلوبة' });
        const job = await new Job({ clientId, clientName, title, description, category, location: location||'', budget: budget||0, images: images||[] }).save();
        // إشعار لكل حرفيي الفئة
        const pros = await User.find({ role: 'pro', spec: category, blocked: { $ne: true } });
        for (const pro of pros) {
            await new Notification({
                userId: pro._id,
                type: 'job',
                message: `${clientName} نشر طلب جديد: ${title}`,
                proId: clientId
            }).save();
        }
        res.json({ success: true, job });
    } catch(e) { res.status(500).json({ error: 'خطأ في النشر' }); }
});

// جلب الطلبات المفتوحة (للحرفي حسب فئته)
app.get('/api/jobs', async (req, res) => {
    try {
        const { category, status } = req.query;
        const filter = { status: status || 'open' };
        if (category) filter.category = category;
        const jobs = await Job.find(filter).sort({ createdAt: -1 });
        res.json(jobs);
    } catch(e) { res.status(500).json([]); }
});

// جلب طلبات عميل معين
app.get('/api/jobs/client/:clientId', async (req, res) => {
    try {
        const jobs = await Job.find({ clientId: req.params.clientId }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch(e) { res.status(500).json([]); }
});

// جلب طلب واحد
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'الطلب غير موجود' });
        res.json(job);
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// حذف طلب (لصاحبه فقط)
app.delete('/api/jobs/:id', async (req, res) => {
    try {
        const { clientId } = req.body;
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'الطلب غير موجود' });
        if (String(job.clientId) !== String(clientId))
            return res.status(403).json({ error: 'غير مصرح' });
        // احذف العروض المرتبطة أيضاً
        await Offer.deleteMany({ jobId: req.params.id });
        await Job.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// ══ Offer Routes ══

// تقديم عرض
app.post('/api/offers', async (req, res) => {
    try {
        const { jobId, proId, proName, proAvatar, proRating, price, duration, note } = req.body;
        if (!jobId || !proId || !price || !duration)
            return res.status(400).json({ error: 'أكمل البيانات' });
        // تحقق إن الحرفي ما قدّم عرض قبل
        const existing = await Offer.findOne({ jobId, proId });
        if (existing) return res.status(400).json({ error: 'قدّمت عرضاً لهذا الطلب مسبقاً' });
        const offer = await new Offer({ jobId, proId, proName, proAvatar: proAvatar||'', proRating: proRating||0, price, duration, note: note||'' }).save();
        // إشعار للعميل
        const job = await Job.findById(jobId);
        if (job?.clientId) {
            await new Notification({
                userId: job.clientId,
                type: 'offer',
                message: `${proName} قدّم عرضاً على طلبك: ${job.title}`,
                proId
            }).save();
        }
        res.json({ success: true, offer });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
});

// جلب عروض طلب
app.get('/api/jobs/:id/offers', async (req, res) => {
    try {
        const offers = await Offer.find({ jobId: req.params.id }).sort({ price: 1, createdAt: 1 });
        res.json(offers);
    } catch(e) { res.status(500).json([]); }
});

// قبول عرض
app.post('/api/offers/:id/accept', async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ error: 'العرض غير موجود' });
        // تحديث العرض
        await Offer.findByIdAndUpdate(req.params.id, { status: 'accepted' });
        // رفض باقي العروض
        await Offer.updateMany({ jobId: offer.jobId, _id: { $ne: req.params.id } }, { status: 'rejected' });
        // إغلاق الطلب
        await Job.findByIdAndUpdate(offer.jobId, { status: 'closed', assignedPro: offer.proId });
        // إشعار للحرفي
        await new Notification({
            userId: offer.proId,
            type: 'offer',
            message: 'تم قبول عرضك! تواصل مع العميل الآن.',
            proId: offer.proId
        }).save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'خطأ' }); }
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

// ══ 404 Handler ══
app.use((req, res) => {
    if(req.path.startsWith('/api')){
        return res.status(404).json({ error: 'المسار غير موجود' });
    }
    // إرجاع index.html للـ SPA
    res.sendFile('index.html', { root: __dirname });
});

server.listen(PORT, () => {
  console.log(`📡 Server Running on ${PORT}`);
  seedSpecs().catch(console.error);
});
