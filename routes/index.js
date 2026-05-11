const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const User = require('../models/users');
const { checkUrlLimit } = require('../functions/usageLimits');

async function getUserAuth(req, res) {
	const raw = req.signedCookies.user_session;
	if (raw) {
		try {
			const userSession = JSON.parse(raw);
			const user = await User.findById(userSession.id);
			if (user) {
				return {
					username: userSession.username,
					id: userSession.id,
					uniqueId: user.uniqueId,
					authType: 'email'
				};
			}
		} catch (err) {
			console.error('Session parse error:', err);
			res.clearCookie('user_session');
		}
	}

	return null;
}

async function getPremiumStatus(uniqueId) {
	if (!uniqueId) return { isPremium: false, demo: false };

	try {
		const premiumUser = await preuser.findOne({ id: uniqueId });
		return {
			isPremium: !!premiumUser,
			demo: premiumUser?.demo || false
		};
	} catch (err) {
		console.error('Premium status check error:', err);
		return { isPremium: false, demo: false };
	}
}

function getRenderData(userAuth, premiumStatus, additionalData = {}) {
	return {
		url: '',
		tiny: '',
		premiu: premiumStatus.isPremium ? 'yes' : '',
		name: userAuth?.username || '',
		demo: premiumStatus.demo ? 'disabled' : '',
		log: userAuth ? 'out' : 'in',
		domain: process.env.domain,
		...additionalData
	};
}

router.get('/', async (req, res) => {
	try {
		const userAuth = await getUserAuth(req, res);
		const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);
		const renderData = getRenderData(userAuth, premiumStatus);
		res.status(200).render('index', renderData);
	} catch (error) {
		console.error('Index page error:', error);
		const renderData = getRenderData(null, { isPremium: false, demo: false });
		res.status(500).render('index', renderData);
	}
});

router.post('/tiny_url', async (req, res) => {
	try {
		const { original, custom, domain } = req.body;

		if (!original || !original.match(/^https?:\/\/.+/)) {
			const userAuth = await getUserAuth(req, res);
			const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);
			const renderData = getRenderData(userAuth, premiumStatus, {
				url: original || '',
				tiny: 'Invalid URL format'
			});
			return res.status(400).render('index', renderData);
		}

		const userAuth = await getUserAuth(req, res);
		const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);

		if (userAuth && userAuth.uniqueId) {
			const limitCheck = await checkUrlLimit(userAuth.uniqueId);

			if (!limitCheck.allowed) {
				const renderData = getRenderData(userAuth, premiumStatus, {
					url: 'error',
					tiny: 'error'
				});
				return res.status(429).render('index', {
					...renderData,
					errorMessage: `今月のURL作成制限（${limitCheck.limit}個）に達しました。来月またはプレミアムプランへのアップグレードをご検討ください。`
				});
			}
		}

		const tinyCode = crypto.randomBytes(4).toString('hex');
		const baseUrl = process.env.domain || 'orrn.net';
		const finalTinyCode = (premiumStatus.isPremium && custom) ? custom : tinyCode;

		console.log('URL短縮処理開始:', {
			original,
			custom,
			isPremium: premiumStatus.isPremium,
			username: userAuth?.username
		});

		if (custom && premiumStatus.isPremium) {
			const existingUrl = await tinyurl.findOne({ tiny: custom });
			if (existingUrl) {
				const renderData = getRenderData(userAuth, premiumStatus, {
					url: custom,
					tiny: 'Already registered'
				});
				return res.status(400).render('index', renderData);
			}
		}

		const newUrl = new tinyurl({
			userid: userAuth?.id || null,
			uniqueId: userAuth?.uniqueId || null,
			username: userAuth?.username || 'Anonymous',
			original,
			tiny: finalTinyCode,
			isPremium: premiumStatus.isPremium,
			isCustom: !!(custom && premiumStatus.isPremium),
			createdVia: 'web'
		});

		await newUrl.save();

		const renderData = getRenderData(userAuth, premiumStatus, {
			tiny: `https://${baseUrl}/t/${finalTinyCode}`
		});

		console.log('短縮URL作成完了:', finalTinyCode);
		res.status(200).render('index', renderData);

	} catch (error) {
		console.error('URL短縮エラー:', error);

		try {
			const userAuth = await getUserAuth(req, res);
			const premiumStatus = await getPremiumStatus(userAuth?.uniqueId);
			const renderData = getRenderData(userAuth, premiumStatus, {
				url: req.body.original || '',
				tiny: 'Error occurred'
			});
			res.status(500).render('index', renderData);
		} catch (renderError) {
			console.error('Error rendering error page:', renderError);
			res.status(500).json({ error: 'Internal server error' });
		}
	}
});

module.exports = router;
