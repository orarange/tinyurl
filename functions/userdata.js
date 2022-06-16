const fetch = require('node-fetch');
const { client_id, client_secret } = process.env;

async function userdat(token_type, access_token) {
    const userResult = await fetch('https://discord.com/api/users/@me', {
        headers: {
            authorization: `${token_type} ${access_token}`,
        },
    });
    const userData = await userResult.json();
    return userData;

}

module.exports = userdat;