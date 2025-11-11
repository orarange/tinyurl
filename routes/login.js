const express = require('express');
const router = express.Router();
const oauth = require('../functions/oauth');
const refresh = require('../functions/refresh');
const userdat = require('../functions/userdata');
const login = require('../functions/login');

router.get('/', async function (req, res) {
	const { code } = req.query;

	if (code) {
		// Discord OAuth認証
		const oauthdata = await oauth(code);

		res.cookie('refresh_token', oauthdata.refresh_token, {
			httpOnly: true
		});
		const userdata = await userdat(oauthdata.token_type, oauthdata.access_token);
		res.redirect('/');
	} else {
		if (!req.cookies.refresh_token || req.cookies.refresh_token === 'undefined') {
			res.render('login', { error: null });
		} else {
			const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
			const { username, id } = await userdat(token_type, access_token);

			res.cookie('refresh_token', refresh_token, {
				httpOnly: true
			});

			res.redirect('/');
		}
	}
});

// メール/パスワードでのログイン
router.post('/', async function (req, res) {
	const { email, password } = req.body;

	try {
		const result = await login.verifyLogin(email, password);

		if (result.success) {
			// ログイン成功 - セッションまたはトークンを設定
			res.cookie('user_session', JSON.stringify({
				id: result.user.id,
				username: result.user.username,
				email: result.user.email
			}), {
				httpOnly: true,
				maxAge: 7 * 24 * 60 * 60 * 1000 // 7日間
			});
			console.log('Login successful:', result.user.email);
			res.redirect('/');
		} else {
			// ログイン失敗
			console.log('Login failed:', result.message);
			res.render('login', { error: result.message });
		}
	} catch (err) {
		console.error('Login route error:', err);
		res.render('login', { error: 'ログイン処理中にエラーが発生しました' });
	}
});

module.exports = router;