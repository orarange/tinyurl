const express = require('express');
const router = express.Router();
const login = require('../functions/login');

router.get('/', async function (req, res) {
	// ログインページを表示
	res.render('login', { error: null });
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