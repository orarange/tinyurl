const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const { authenticateToken, logApiUsage } = require('../functions/apiAuth');

// トークン認証と使用履歴記録を適用
router.use(authenticateToken);
router.use(logApiUsage);

router.get('/', function (req, res) {
	const { t } = req.query;

	if (t) {
		tinyurl.findOne({ tiny: t }).then(d => {
			if (d) {
				res.status(200).json({ status: 200, original: d.original });
			} else {
				res.status(404).json({ status: '404', message: 'not found' });
			}
		});
	} else {
		res.status(400).json({ status: '400', message: 'bad request' });
	}
});

module.exports = router;