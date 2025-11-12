const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const tinyurl = require('../models/tinyurl');
const premium = require('../models/premium');
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

// プレミアムリンク用（/p/プレフィックス付き）
router.get('/:id', async function (req, res) {
	try {
		const shortId = req.params.id;
		
		// まずプレミアムテーブルから検索（カスタムリンク優先）
		const premiumUrl = await premium.findOne({ tiny: shortId });
		if (premiumUrl) {
			return res.redirect(premiumUrl.original);
		}
		
		// プレミアムで見つからない場合、フリーテーブルから検索
		const freeUrl = await tinyurl.findOne({ tiny: shortId });
		if (freeUrl) {
			return res.redirect(freeUrl.original);
		}
		
		// どちらでも見つからない場合は404
		res.status(404);
		res.render('404');
		
	} catch (error) {
		console.error('URL redirect error:', error);
		res.status(500);
		res.render('404');
	}
});

module.exports = router;