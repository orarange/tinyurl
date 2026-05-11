const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');

router.get('/', async (req, res) => {
	let username = null;
	let isPremium = false;

	const raw = req.signedCookies.user_session;
	if (raw) {
		try {
			const userSession = JSON.parse(raw);
			username = userSession.username;
			const userId = userSession.uniqueId || userSession.id;

			const premiumUser = await preuser.findOne({ id: userId });
			isPremium = !!premiumUser;

		} catch (error) {
			console.error('セッション解析エラー:', error);
			res.clearCookie('user_session');
		}
	}

	if (!username) {
		res.render('buypremium', {
			url: '',
			tiny: '',
			premiu: '',
			name: '',
			demo: '',
			log: 'in'
		});
	} else {
		res.render('buypremium', {
			url: '',
			tiny: '',
			premiu: isPremium ? 'yes' : '',
			name: username,
			demo: '',
			log: 'out'
		});
	}
});

module.exports = router;
