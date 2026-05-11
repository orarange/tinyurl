const express = require('express');
const router = express.Router();
const login = require('../functions/login');

router.get('/', async function (req, res) {
	res.render('login', { error: null });
});

router.post('/', async function (req, res) {
	const { email, password } = req.body;

	try {
		const result = await login.verifyLogin(email, password);

		if (result.success) {
			res.cookie('user_session', JSON.stringify({
				id: result.user.id,
				uniqueId: result.user.uniqueId,
				username: result.user.username,
				email: result.user.email
			}), {
				httpOnly: true,
				signed: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 7 * 24 * 60 * 60 * 1000
			});
			console.log('Login successful:', result.user.email);
			res.redirect('/');
		} else {
			console.log('Login failed:', result.message);
			res.render('login', { error: result.message });
		}
	} catch (err) {
		console.error('Login route error:', err);
		res.render('login', { error: 'ログイン処理中にエラーが発生しました' });
	}
});

module.exports = router;
