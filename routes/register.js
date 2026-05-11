const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const Users = require('../models/users');
const getUsers = require('../functions/register');

const ORARAN_BASE = process.env.ORARAN_BASE || 'https://oraran.jp';
const ORARAN_API_KEY = process.env.ORARAN_API_KEY || '';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', async (req, res) => {
	if (!req.signedCookies.user_session) {
		res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in' });
	} else {
		res.redirect('/');
	}
});

router.post('/send-pin', async (req, res) => {
	const { email } = req.body || {};
	if (!email || !EMAIL_REGEX.test(email)) {
		return res.status(400).json({ ok: false, error: 'valid email is required' });
	}

	try {
		const resp = await axios.post(`${ORARAN_BASE}/api/auth/send`, { email }, {
			headers: {
				'Content-Type': 'application/json',
				'X-Api-Key': ORARAN_API_KEY
			},
			timeout: 5000
		});
		return res.status(resp.status).json(resp.data);
	} catch (err) {
		console.error('Error sending PIN via oraran:', err.message || err);
		if (err.response && err.response.data) {
			return res.status(err.response.status || 500).json(err.response.data);
		}
		return res.status(502).json({ ok: false, error: 'Bad Gateway' });
	}
});

router.post('/', async (req, res) => {
	const { name, email, password, password_confirmation, pinCode } = req.body;

	if (!email || !EMAIL_REGEX.test(email)) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: '有効なメールアドレスを入力してください' });
	}

	if (!name || name.trim().length === 0) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'ユーザー名を入力してください' });
	}

	if (!password || password.length < 8) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'パスワードは8文字以上にしてください' });
	}

	if (password !== password_confirmation) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'パスワードが一致しません' });
	}

	if (!pinCode) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'PIN が必要です' });
	}

	try {
		const resp = await axios.post(`${ORARAN_BASE}/api/auth/verify`, { email, pinCode }, {
			headers: {
				'Content-Type': 'application/json',
				'X-Api-Key': ORARAN_API_KEY
			},
			timeout: 5000
		});

		if (!(resp.data && resp.data.ok)) {
			return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: resp.data && resp.data.error ? resp.data.error : 'PIN 検証に失敗しました' });
		}

		const register = await getUsers.getUsers(email);
		if (register === 'unregistered') {
			const uniqueId = crypto.randomBytes(16).toString('hex');
			const hashedPassword = await bcrypt.hash(password, 12);
			const user = new Users({ uniqueId, username: name.trim(), email, password: hashedPassword });
			await user.save();
			console.log('user created after PIN verify:', email, 'with unique ID:', uniqueId);
			return res.redirect('/login');
		} else {
			return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'このメールアドレスは既に登録されています' });
		}
	} catch (err) {
		console.error('Registration error:', err.message || err);
		if (err.response && err.response.data) {
			return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: err.response.data.error || '登録中にエラーが発生しました' });
		}
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: '登録中にエラーが発生しました' });
	}
});

module.exports = router;
