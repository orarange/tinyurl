const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const preuser = require('../models/preuser');
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

router.get('/', function (req, res) {
	res.json({ hello: 'world' });
});

router.post('/make', async (req, res) => {
	const tinyuRl = Math.random().toString(32).substring(2);
	const { original, custom, domain, id } = req.body;
	console.log(req.body);
	if (original) {
		if (original.match(/^https?/)) {
			preuser.findOne({ id: id }).then(d => {
				if (!d) {
					console.log('free plan');
					const _tinyurl = new tinyurl({
						original: original,
						tiny: tinyuRl
					});

					_tinyurl.save();

					res.json({ status: '200', message: 'request was successful!', tiny: `https://tiny-url.gq/t/${tinyuRl}` });
				} else {
					console.log('premium plan');
					if (!domain) {
						console.log(domain);
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

									res.json({ status: '200', message: 'request was successful!', tiny: `https://tiny-url.gq/t/${custom}` });
								} else {
									res.status(400);
									res.json({ status: '400', message: 'Bad Request', tiny: 'Registered' });
								}
							});
						} else {
							const _premium = new premium({
								original: original,
								tiny: tinyuRl,
								userid: id
							});

							_premium.save();

							res.json({ status: '200', message: 'request was successful!', tiny: `https://tiny-url.gq/t/${tinyuRl}` });
						}
					} else {
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

									res.json({ status: '200', message: 'request was successful!', tiny: `https://${domain}/${custom}` });
								} else {
									res.status(400);
									res.json({ status: '400', message: 'Bad Request', tiny: 'Registered' });
								}
							});
						} else {
							const _premium = new premium({
								original: original,
								tiny: tinyuRl,
								userid: id
							});

							_premium.save();

							res.json({ status: '200', message: 'request was successful!', tiny: `https://${domain}/${tinyuRl}` });
						}
					}
				}
			});
		} else {
			console.log('not URL');
			res.status(400);
			res.json({ status: '400', message: 'Bad Request' });
		}
	} else {
		console.log('no URL');
		res.status(400);
		res.json({ status: '400', message: 'Bad Request' });
	}
});

module.exports = router;