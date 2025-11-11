const fetch = require('node-fetch');
const express = require('express');
const qs = require('querystring');

const client_id = process.env.google_id;
const client_secret = process.env.google_secret;
const redirect_uri = 'https://tiny-url.cf';
const response_type = 'code';
const scope = 'email';

const auth_uri = 'https://accounts.google.com/o/oauth2/v2/auth';
const token_uri = 'https://www.googleapis.com/oauth2/v4/token';
const email_uri = 'https://www.googleapis.com/oauth2/v3/userinfo';

const router = express.Router();

router.get('/', (req, res) => {
	const params = qs.stringify({
		client_id,
		redirect_uri,
		response_type,
		scope,
	});
	res.redirect(302, `${auth_uri}?${params}`);
});

module.exports = router;