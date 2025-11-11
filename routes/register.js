const fetch = require('node-fetch');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const tinyurl = require('../models/users');
const getUsers = require('../functions/register');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

router.get('/', async (req, res) => {
	if (!req.cookies.refresh_token || req.cookies.refresh_token === 'undefined') {
		res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in' });
	} else {
		res.redirect('/');
	}
});

router.post('/', async (req, res) => {
	const { name, email, password, password_confirmation } = req.body;
	
	// パスワード確認のチェック
	if (password !== password_confirmation) {
		return res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'パスワードが一致しません' });
	}
	
	try {
		const register = await getUsers.getUsers(email);
		if (register === 'unregistered') {
			const user = new tinyurl({
				username: name,
				email: email,
				password: password
			});
			await user.save();
			console.log('user created:', email);
			res.redirect('/login');
		} else {
			console.log('user already registered:', email);
			res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: 'このメールアドレスは既に登録されています' });
		}
	} catch (err) {
		console.error('Registration error:', err);
		res.render('register', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', error: '登録中にエラーが発生しました' });
	}
});

module.exports = router;