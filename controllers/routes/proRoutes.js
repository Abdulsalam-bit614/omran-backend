const express = require('express');
const router = express.Router();
const proController = require('../controllers/proController');
const auth = require('../middleware/auth');

router.get('/', proController.getAllPros);
router.post('/add', auth, proController.createProProfile);
router.post('/:id/review', auth, proController.addReview);
router.put('/admin/feature-pro/:id', auth, proController.toggleFeatured);
router.put('/admin/verify-pro/:id', auth, proController.verifyPro);
router.put('/admin/priority/:id', auth, proController.setPriority);

module.exports = router;
