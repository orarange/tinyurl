const fetch = require('node-fetch');
const { client_id, client_secret, domain } = process.env;

async function oauth(code) {
	try {
		const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			body: new URLSearchParams({
				client_id: client_id,
				client_secret: client_secret,
				code,
				grant_type: 'authorization_code',
				redirect_uri: `https://${domain}/login`,
				scope: 'identify',
			}),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		const oauthData = await oauthResult.json();
		console.log(oauthData);
		return oauthData;
	} catch (error) {
		console.log(error);
		return error;
	}
}

module.exports = oauth;
