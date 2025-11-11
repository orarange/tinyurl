const express = require('express');
const router = express.Router();
const exec = require('child_process').exec;

router.post('/', async function (req, res) {
	function pull() {
		exec('git pull origin master', (err, stdout, stderr) => {
			if (err) { console.log(err); }
			console.log(stdout);
		});
	}

	pull();

	res.status(200).json({
		message: 'pulled'
	});
});

module.exports = router;