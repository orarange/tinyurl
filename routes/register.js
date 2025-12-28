const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const Users = require('../models/users');
const getUsers = require('../functions/register');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

const ORARAN_BASE = process.env.ORARAN_BASE || 'https://oraran.jp';
const ORARAN_API_KEY = process.env.ORARAN_API_KEY || '';

router.get('/', async (req, res) => {
	if (!req.cookies.refresh_token || req.cookies.refresh_token === 'undefined') {
		res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in' });
	} else {
		res.redirect('/');
	}
});

// サーバ側で oraran に送信を頼むエンドポイント（クライアントはこのルートを叩く）
router.post('/send-pin', async (req, res) => {
	const { email } = req.body || {};
	if (!email) return res.status(400).json({ ok: false, error: 'email is required' });

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
		if (err.response && err.response.data) return res.status(err.response.status || 500).json(err.response.data);
		return res.status(502).json({ ok: false, error: 'Bad Gateway' });
	}
});

// 登録処理: 先に oraran に検証を問い合わせ、成功したらユーザー作成
router.post('/', async (req, res) => {
	const { name, email, password, password_confirmation, pinCode } = req.body;

	if (password !== password_confirmation) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'パスワードが一致しません' });
	}

	if (!pinCode) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'PIN が必要です' });
	}

	try {
		// oraran に検証を委譲
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

		// メールが未登録か確認
		const register = await getUsers.getUsers(email);
		if (register === 'unregistered') {
			const uniqueId = Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
			const user = new Users({ uniqueId: uniqueId, username: name, email: email, password: password });
			await user.save();
			console.log('user created after PIN verify:', email, 'with unique ID:', uniqueId);
			return res.redirect('/login');
		} else {
			return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'このメールアドレスは既に登録されています' });
		}
	} catch (err) {
		console.error('Registration error:', err.message || err);
		if (err.response && err.response.data) return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: err.response.data.error || '登録中にエラーが発生しました' });
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: '登録中にエラーが発生しました' });
	}
});

module.exports = router;