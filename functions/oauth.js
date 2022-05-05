const fetch = require('node-fetch');
const {client_id,client_secret} = process.env;

async function oauth(code){  

    try {
        const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: client_id,
                client_secret: client_secret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: 'http://localhost:3000/login',
                scope: 'identify',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        
        const oauthData = await oauthResult.json();
        
        return oauthData;

    } catch (error) {
        
        console.log(error);
    }

}

module.exports = oauth;