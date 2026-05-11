const express = require('express');
const router = express.Router();

router.get('/', function (req, res) {
	res.clearCookie('user_session');
	console.log('User logged out');
	res.redirect('/');
});

module.exports = router;
