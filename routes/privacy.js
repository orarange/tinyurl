const express = require('express');
const router = express.Router();

router.get('/', async function (req, res, next) {
	try {
		const name = req.cookies.name;
		res.render('privacy', { name: name });
	} catch (error) {
		console.error('Privacy page error:', error);
		res.status(500).render('404');
	}
});

module.exports = router;
