const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const { authenticateToken, logApiUsage } = require('../functions/apiAuth');

router.use(authenticateToken);
router.use(logApiUsage);

router.get('/', async (req, res) => {
	const { o } = req.query;

	if (!o) {
		return res.status(400).json({ status: '400', message: 'bad request' });
	}

	try {
		const d = await tinyurl.findOne({ original: o, uniqueId: req.user.uniqueId });
		if (d) {
			res.status(200).json({ status: 200, tiny: d.tiny });
		} else {
			res.status(404).json({ status: '404', message: 'not found' });
		}
	} catch (err) {
		console.error('gettiny error:', err);
		res.status(500).json({ status: '500', message: 'internal server error' });
	}
});

module.exports = router;
