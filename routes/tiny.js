const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const tinyurl = require('../models/tinyurl');
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

// 統合リダイレクト処理
router.get('/:id', async function (req, res) {
	try {
		const shortId = req.params.id;
		
		// 統合モデルから検索
		const urlData = await tinyurl.findOne({ tiny: shortId });
		
		if (urlData) {
			// クリック数を増加
			await tinyurl.updateOne(
				{ tiny: shortId },
				{ $inc: { clicks: 1 } }
			);
			
			return res.redirect(urlData.original);
		}
		
		// 見つからない場合は404
		res.status(404);
		res.render('404');
		
	} catch (error) {
		console.error('URL redirect error:', error);
		res.status(500);
		res.render('404');
	}
});

module.exports = router;