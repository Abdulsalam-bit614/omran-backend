const mongoose = require('mongoose');

const ProfessionalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    spec: { type: String, required: true },
    type: { type: String, enum: ['worker', 'contractor', 'office'] },
    area: { type: String, required: true },
    exp: { type: String },
    desc: { type: String },
    phone: { type: String, required: true },
    wa: { type: String },
    photos: [{ type: String }],
    avail: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    // ── نظام التقييم ──
    reviews: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now }
    }],
    avgRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    // ── نظام التمييز والأولوية ──
    isFeatured: { type: Boolean, default: false },
    priorityScore: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Professional', ProfessionalSchema);
