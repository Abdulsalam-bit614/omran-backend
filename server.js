const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/pros', require('./routes/proRoutes'));

// Socket.io — الدردشة الفورية
io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    // دخول غرفة خاصة
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`المستخدم ${userId} دخل غرفته`);
    });

    // إرسال رسالة
    socket.on('send_message', (data) => {
        io.to(data.receiverId).emit('receive_message', {
            senderId: data.senderId,
            text: data.text,
            time: new Date().toLocaleTimeString()
        });
    });

    socket.on('disconnect', () => console.log('مستخدم غادر'));
});

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ متصل بقاعدة بيانات omranDB');
        server.listen(process.env.PORT || 5000, () => {
            console.log(`✅ السيرفر يعمل على البورت ${process.env.PORT || 5000}`);
        });
    })
    .catch(err => console.error('❌ خطأ في الاتصال:', err));
