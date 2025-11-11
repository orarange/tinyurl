const express = require('express');
const router = express.Router();
const tinyurl = require('../models/tinyurl');
const mongoose = require('mongoose');

async function main() {
	await mongoose.connect(process.env.mongo_url);
}

router.get('/', function (req, res) {
	const { o } = req.query;

	if (o) {
		tinyurl.findOne({ original: o }).then(d => {
			if (d) {
				res.status(200).json({ status: 200, tiny: d.tiny });
			} else {
				res.status(404).json({ status: '404', message: 'not found' });
			}
		});
	} else {
		res.status(400).json({ status: '400', message: 'bad request' });
	}
});

module.exports = router;