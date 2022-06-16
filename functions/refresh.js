const fetch = require('node-fetch');
const { client_id, client_secret } = process.env;

async function refresh(refresh_token) {
    try {
        refreshResult = await fetch('https://discord.com/api/oauth2/token', {

            method: 'POST',
            body: new URLSearchParams({
                client_id: client_id,
                client_secret: client_secret,
                grant_type: 'refresh_token',
                refresh_token: `${refresh_token}`,
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const refreshData = await refreshResult.json();
        return refreshData;
    } catch (error) {

        console.error(error);
    }
}

module.exports = refresh;