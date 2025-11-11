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
	console.log('mongodb connecting');
	await mongoose.connect(process.env.mongo_url);
	console.log('mongodb connected');
}

router.get('/', async (req, res) => {
	const { domain } = process.env;

	// メール/パスワードログインのセッションチェック
	if (req.cookies.user_session) {
		try {
			const userSession = JSON.parse(req.cookies.user_session);
			
			preuser.findOne({ id: userSession.id }).then(d => {
				if (!d) {
					res.status(200).render('index', { url: '', tiny: '', premiu: '', name: userSession.username, demo: '', log: 'out', domain: domain });
				} else {
					if (!d.demo) {
						res.status(200).render('index', { url: '', tiny: '', premiu: 'yes', name: userSession.username, demo: '', log: 'out', domain: domain });
					} else {
						res.status(200).render('index', { url: '', tiny: '', premiu: 'yes', name: userSession.username, demo: 'disabled', log: 'out', domain: domain });
					}
				}
			});
			return;
		} catch (err) {
			console.error('Session parse error:', err);
		}
	}

	// Discord OAuthログインのチェック
	if (!req.cookies.refresh_token || req.cookies.refresh_token === 'undefined') {
		res.status(200).render('index', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', domain: domain });
	} else {
		const { token_type, access_token, refresh_token } = await refresh(req.cookies.refresh_token);
		const { username, id } = await userdat(token_type, access_token);

		res.cookie('refresh_token', refresh_token, {
			httpOnly: true
		});

		preuser.findOne({ id: id }).then(d => {
			if (!d) {
				res.status(200).render('index', { url: '', tiny: '', premiu: '', name: username, demo: '', log: 'out', domain: domain });
			} else {
				if (!d.demo) {
					res.status(200).render('index', { url: '', tiny: '', premiu: 'yes', name: username, demo: '', log: 'out', domain: domain });
				} else {
					res.status(200).render('index', { url: '', tiny: '', premiu: 'yes', name: username, demo: 'disabled', log: 'out', domain: domain });
				}
			}
		});
	}
});

router.post('/tiny_url', async (req, res) => {
	const tinyuRl = Math.random().toString(32).substring(2);
	const { original, custom, domain } = req.body;
	
	let username = '';
	let id = '';
	let refresh_token = '';

	// メール/パスワードログインのセッションチェック
	if (req.cookies.user_session) {
		try {
			const userSession = JSON.parse(req.cookies.user_session);
			username = userSession.username;
			id = userSession.id;
		} catch (err) {
			console.error('Session parse error:', err);
		}
	} 
	// Discord OAuthログインのチェック
	else if (req.cookies.refresh_token && req.cookies.refresh_token !== 'undefined') {
		const oauthData = await refresh(req.cookies.refresh_token);
		const userdata = await userdat(oauthData.token_type, oauthData.access_token);
		username = userdata.username;
		id = userdata.id;
		refresh_token = oauthData.refresh_token;
	}

	console.log('tiny-url post');

	if (original.match(/^https?/)) {
		console.log('url');
		preuser.findOne({ id: id }).then(d => {
			if (!d) {
				console.log('free plan');
				const _tinyurl = new tinyurl({
					original: original,
					tiny: tinyuRl
				});

				_tinyurl.save();

				if (refresh_token) {
					res.cookie('refresh_token', refresh_token, {
						httpOnly: true
					});
				}
				
				if (!username) {
					res.status(200).render('index', { url: '', tiny: `https://orrn.net/t/${tinyuRl}`, premiu: '', name: '', demo: '', log: 'in', domain: domain });
				} else {
					res.status(200).render('index', { url: '', tiny: `https://orrn.net/t/${tinyuRl}`, premiu: '', name: username, demo: '', log: 'out', domain: domain });
				}
			} else {
				console.log('premium plan');
				if (custom) {
					console.log('custom');
					premium.findOne({ tiny: custom }).then(d => {
						if (!d) {
							const _premium = new premium({
								original: original,
								tiny: custom,
								userid: id
							});

							_premium.save();

							if (refresh_token) {
								res.cookie('refresh_token', refresh_token, {
									httpOnly: true
								});
							}

							res.status(200).render('index', { url: '', tiny: `https://${domain}/${custom}`, premiu: 'yes', name: username, demo: '', log: 'out', domain: domain });
						} else {
							if (refresh_token) {
								res.cookie('refresh_token', refresh_token, {
									httpOnly: true
								});
							}

							res.status(400).render('index', { url: custom, tiny: 'Registered', premiu: 'yes', name: username, demo: '', log: 'out', domain: domain });
						}
					});
				} else {
					const _premium = new premium({
						original: original,
						tiny: tinyuRl,
						userid: id
					});

					_premium.save();

					if (refresh_token) {
						res.cookie('refresh_token', refresh_token, {
							httpOnly: true
						});
					}

					res.status(200).render('index', { url: '', tiny: `https://${domain}/${tinyuRl}`, premiu: 'yes', name: username, demo: '', log: 'out', domain: domain });
				}
			}
		});
	} else {
		if (!username) {
			res.status(400).render('index', { url: '', tiny: '', premiu: '', name: '', demo: '', log: 'in', domain: domain });
		} else {
			res.status(400).render('index', { url: '', tiny: '', premiu: '', name: username, demo: '', log: 'out', domain: domain });
		}
	}
});

module.exports = router;