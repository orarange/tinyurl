const qs = require('querystring')

const client_id = process.env.id
const client_secret = process.env.secret
const redirect_uri = 'https://oauth-test.orraorange.repl.co/oauth2callback'
const response_type = 'code'
const scope = 'email'

async function makeurl(){
  const params = qs.stringify({
    client_id,
    redirect_uri,
    response_type,
    scope,
  })
  return `${auth_uri}?${params}`
}

module.exports = makeurl;