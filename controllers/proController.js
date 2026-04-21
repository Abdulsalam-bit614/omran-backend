const Professional = require('../models/Professional');

exports.getAllPros = async (req, res) => {
    try {
        const { spec, area, search } = req.query;
        let filter = {};
        if (spec && spec !== 'all') filter.spec = spec;
        if (area) filter.area = new RegExp(area, 'i');
        if (search) {
            filter.$or = [
                { name: new RegExp(search, 'i') },
                { spec: new RegExp(search, 'i') }
            ];
        }
        const pros = await Professional.find(filter)
            .sort({ isFeatured: -1, priorityScore: -1, avgRating: -1, createdAt: -1 });
        res.json(pros);
    } catch (err) {
        res.status(500).json({ message: "خطأ في جلب البيانات" });
    }
};

exports.createProProfile = async (req, res) => {
    try {
        const proData = { ...req.body, userId: req.user.id };
        const newPro = new Professional(proData);
        await newPro.save();
        res.status(201).json({ message: "تم نشر ملفك في عُمران", data: newPro });
    } catch (err) {
        res.status(400).json({ message: "فشل في إنشاء الملف الشخصي" });
    }
};

exports.addReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const pro = await Professional.findById(req.params.id);
        if (!pro) return res.status(404).json({ message: "المعلم غير موجود" });
        pro.reviews.push({ userId: req.user.id, userName: req.user.name, rating, comment });
        pro.reviewsCount = pro.reviews.length;
        pro.avgRating = pro.reviews.reduce((s, r) => s + r.rating, 0) / pro.reviews.length;
        await pro.save();
        res.json({ message: "تم إضافة تقييمك", avgRating: pro.avgRating });
    } catch (err) {
        res.status(500).json({ message: "خطأ في إضافة التقييم" });
    }
};

exports.toggleFeatured = async (req, res) => {
    try {
        const pro = await Professional.findByIdAndUpdate(
            req.params.id,
            { isFeatured: req.body.isFeatured },
            { new: true }
        );
        res.json({ message: "تم تحديث حالة التمييز", pro });
    } catch (err) {
        res.status(500).json({ message: "خطأ في التحديث" });
    }
};

exports.verifyPro = async (req, res) => {
    try {
        const pro = await Professional.findByIdAndUpdate(
            req.params.id,
            { verified: true },
            { new: true }
        );
        res.json({ message: "تم توثيق الحساب ✓", pro });
    } catch (err) {
        res.status(500).json({ message: "خطأ في التوثيق" });
    }
};

exports.setPriority = async (req, res) => {
    try {
        const pro = await Professional.findByIdAndUpdate(
            req.params.id,
            { priorityScore: req.body.priorityScore },
            { new: true }
        );
        res.json({ message: "تم تحديث الأولوية", pro });
    } catch (err) {
        res.status(500).json({ message: "خطأ في التحديث" });
    }
};
