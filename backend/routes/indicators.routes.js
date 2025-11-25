// routes/indicators.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/indicators.controller');
const requireAuth = require('../middlewares/requireAuth');

router.get('/topic/:topicId', requireAuth, ctrl.getByTopic);
router.get('/type/:type', requireAuth, ctrl.getByType);
router.get('/', requireAuth, ctrl.list);
router.get('/:id', requireAuth, ctrl.get);
router.post('/', requireAuth, ctrl.create);
router.put('/:id', requireAuth, ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;