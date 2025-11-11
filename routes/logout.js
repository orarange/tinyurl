const express = require('express');
const router = express.Router();

router.get('/', async function (req, res) {
	// Discord OAuthのトークンを削除
	res.cookie('refresh_token', '', {
		httpOnly: true,
		maxAge: 0
	});
	
	// メール/パスワードログインのセッションを削除
	res.cookie('user_session', '', {
		httpOnly: true,
		maxAge: 0
	});
	
	console.log('User logged out');
	res.redirect('/');
});

module.exports = router;