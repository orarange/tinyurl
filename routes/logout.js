const express = require('express');
const router = express.Router();

router.get('/', async function (req, res) {
	res.cookie('refresh_token', '', {
		httpOnly: true,
		maxAge: 0
	});
	res.redirect('/');
});

module.exports = router;