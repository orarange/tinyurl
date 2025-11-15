const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');

router.get('/', async (req, res) => {
	let username = null;
	let userId = null;
	let isPremium = false;

	// メール/パスワードログインのセッションチェック
	if (req.cookies.user_session) {
		try {
			const userSession = JSON.parse(req.cookies.user_session);
			username = userSession.username;
			userId = userSession.id;

			// プレミアムステータスをチェック
			const premiumUser = await preuser.findOne({ id: userId });
			isPremium = !!premiumUser;

		} catch (error) {
			console.error('セッション解析エラー:', error);
			// 無効なセッションをクリア
			res.clearCookie('user_session');
		}
	}

	// レンダリング
	if (!username) {
		// 未ログイン状態
		res.render('buypremium', { 
			url: '', 
			tiny: '', 
			premiu: '', 
			name: '', 
			demo: '', 
			log: 'in' 
		});
	} else {
		// ログイン済み状態
		const renderData = {
			url: '', 
			tiny: '', 
			premiu: isPremium ? 'yes' : '', 
			name: username, 
			demo: '', 
			log: 'out' 
		};

		res.render('buypremium', renderData);
	}
});

module.exports = router;