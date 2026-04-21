const Professional = require('../models/Professional');

// جلب قائمة المعلمين مع فلاتر البحث
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

        const pros = await Professional.find(filter).sort({ verified: -1, createdAt: -1 });
        res.json(pros);
    } catch (err) {
        res.status(500).json({ message: "خطأ في جلب البيانات" });
    }
};

// إضافة ملف مهني جديد
exports.createProProfile = async (req, res) => {
    try {
        const proData = { ...req.body, userId: req.user.id };
        const newPro = new Professional(proData);
        await newPro.save();
        res.status(201).json({ message: "تم نشر ملفك الشخصي في عُمران", data: newPro });
    } catch (err) {
        res.status(400).json({ message: "فشل في إنشاء الملف الشخصي" });
    }
};
