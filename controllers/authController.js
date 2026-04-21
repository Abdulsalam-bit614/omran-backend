const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, phone, email, pass, type } = req.body;
        let userExists = await User.findOne({ phone });
        if (userExists) return res.status(400).json({ message: "هذا الرقم مسجل مسبقاً في عُمران" });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(pass, salt);
        const newUser = new User({ name, phone, email, type, pass: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "تم إنشاء حسابك في عُمران بنجاح" });
    } catch (err) {
        res.status(500).json({ error: "خطأ في عملية التسجيل" });
    }
};

exports.login = async (req, res) => {
    try {
        const { id, pass } = req.body;
        const user = await User.findOne({ $or: [{ email: id }, { phone: id }] });
        if (!user) return res.status(404).json({ message: "الحساب غير موجود" });
        const isMatch = await bcrypt.compare(pass, user.pass);
        if (!isMatch) return res.status(400).json({ message: "كلمة المرور غير صحيحة" });
        const token = jwt.sign({ id: user._id, type: user.type }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user._id, name: user.name, type: user.type, phone: user.phone } });
    } catch (err) {
        res.status(500).json({ message: "حدث خطأ أثناء تسجيل الدخول" });
    }
};
