const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    pass: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['client', 'worker', 'contractor', 'office', 'admin'], 
        default: 'client' 
    },
    avatar: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
