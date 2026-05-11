const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');

const SAFE_PROTOCOLS = /^https?:\/\//i;

router.get('/:id', async function (req, res) {
	try {
		const shortId = req.params.id;

		const urlData = await tinyurl.findOne({ tiny: shortId });

		if (urlData) {
			// javascript:, data: などの危険なプロトコルをブロック
			if (!SAFE_PROTOCOLS.test(urlData.original)) {
				return res.status(400).render('404');
			}

			await tinyurl.updateOne({ tiny: shortId }, { $inc: { clicks: 1 } });
			return res.redirect(urlData.original);
		}

		res.status(404).render('404');

	} catch (error) {
		console.error('URL redirect error:', error);
		res.status(500).render('404');
	}
});

module.exports = router;
