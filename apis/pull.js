const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

const PULL_SECRET = process.env.PULL_SECRET;

router.post('/', function (req, res) {
	const secret = req.headers['x-pull-secret'];

	if (!PULL_SECRET || secret !== PULL_SECRET) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	exec('git pull origin master', (err, stdout) => {
		if (err) {
			console.error('git pull error:', err);
		} else {
			console.log(stdout);
		}
	});

	res.status(200).json({ message: 'pulled' });
});

module.exports = router;
