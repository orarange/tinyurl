const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const tinyurl = require('../models/tinyurl');
const preuser = require('../models/preuser');
const { authenticateToken, logApiUsage } = require('../functions/apiAuth');

router.use(authenticateToken);
router.use(logApiUsage);

router.get('/', function (req, res) {
	res.json({
		hello: 'world',
		message: 'Tiny-URL API is running',
		user: req.user.uniqueId,
		endpoints: [
			'POST /api/make - URL短縮',
			'GET /api/reference - APIドキュメント'
		]
	});
});

function isValidHttpUrl(str) {
	try {
		const url = new URL(str);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

router.post('/make', async (req, res) => {
	try {
		const { original, custom } = req.body;
		const uniqueId = req.user.uniqueId;

		if (!original) {
			return res.status(400).json({ status: '400', message: 'Bad Request: original URL is required' });
		}

		if (!isValidHttpUrl(original)) {
			return res.status(400).json({ status: '400', message: 'Bad Request: URL must start with http:// or https://' });
		}

		const premiumUser = await preuser.findOne({ id: uniqueId });
		const isPremium = !!premiumUser;

		const CUSTOM_CODE_MAX_LENGTH = 50;

		if (custom) {
			if (!/^[a-zA-Z0-9_-]+$/.test(custom)) {
				return res.status(400).json({ status: '400', message: 'Bad Request: custom code must contain only alphanumeric characters, hyphens, or underscores' });
			}
			if (custom.length > CUSTOM_CODE_MAX_LENGTH) {
				return res.status(400).json({ status: '400', message: `Bad Request: custom code must be ${CUSTOM_CODE_MAX_LENGTH} characters or fewer` });
			}

			const existingUrl = await tinyurl.findOne({ tiny: custom });
			if (existingUrl) {
				return res.status(409).json({ status: '409', message: 'Conflict: custom URL code already exists' });
			}
		}

		let tinyCode = custom;
		if (!tinyCode) {
			for (let attempt = 0; attempt < 5; attempt++) {
				const candidate = crypto.randomBytes(4).toString('hex');
				const existing = await tinyurl.findOne({ tiny: candidate });
				if (!existing) { tinyCode = candidate; break; }
			}
			if (!tinyCode) {
				return res.status(503).json({ status: '503', message: 'Service Unavailable: failed to generate unique short code' });
			}
		}

		const newUrl = new tinyurl({
			uniqueId,
			userid: uniqueId,
			original,
			tiny: tinyCode,
			isPremium,
			isCustom: !!custom,
			createdVia: 'api'
		});

		await newUrl.save();

		const baseUrl = process.env.domain || 'orrn.net';
		const responseUrl = `https://${baseUrl}/t/${tinyCode}`;

		res.json({
			status: '200',
			message: 'request was successful!',
			tiny: responseUrl
		});

	} catch (error) {
		if (error.code === 11000) {
			console.error('API /make duplicate key error:', error.message);
			return res.status(409).json({ status: '409', message: 'Conflict: short code collision, please retry' });
		}
		console.error('API /make error:', error);
		res.status(500).json({
			status: '500',
			message: 'Internal Server Error'
		});
	}
});

module.exports = router;
