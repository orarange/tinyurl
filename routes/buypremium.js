const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const oauth = require('../functions/oauth');
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

router.get('/', async (req, res) => {
	const { code } = req.query;

	if (code) {
		try {
			const oauthdata = await oauth(code);
			res.cookie('refresh_token', oauthdata.refresh_token, {
				httpOnly: true
			});
			const userdata = await userdat(oauthdata.token_type, oauthdata.access_token);
			// プレミアム購入ページに戻る
			res.redirect('/buy');
		} catch (error) {
			console.error('Discord OAuth error:', error);
			res.redirect('/buy?error=oauth_failed');
		}
	} else {
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
		// Discord OAuthログインのチェック
		else if (req.cookies.refresh_token && req.cookies.refresh_token !== 'undefined') {
			try {
				const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
				const userData = await userdat(token_type, access_token);
				username = userData.username;
				userId = userData.id;

				// リフレッシュトークンを更新
				res.cookie('refresh_token', refresh_token, {
					httpOnly: true
				});

				// プレミアムステータスをチェック
				const premiumUser = await preuser.findOne({ id: userId });
				isPremium = !!premiumUser;

			} catch (error) {
				console.error('Discord認証エラー:', error);
				// 無効なリフレッシュトークンをクリア
				res.clearCookie('refresh_token');
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
	}
});

module.exports = router;