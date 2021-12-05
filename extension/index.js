'use strict';

const axios = require('axios');

const TWITCH_CLIENT_ID = 'q0xqvkmbfl8834g1rvqamjwbvxf3if';
const TWITCH_SECRET    = process.env.DEVEMBER_CLIENT_SECRET;
const SESSION_SECRET   = process.env.DEVEMBER_SESSION_SECRET;
const CALLBACK_URL     = 'http://localhost:9090/auth/twitch/callback';

function getAuthURL() {
  const params = {
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    force_verify: true,
    response_type: 'code',
    scope: 'user:read:email'
  };

  return `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams(params)}`;
}

async function getAccessToken(code) {
  try {
    const response = await axios({
      url: 'https://id.twitch.tv/oauth2/token',
      method: 'POST',
      data: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: CALLBACK_URL
      }
    });

    console.log(response);
  }
  catch (error) {
    console.log(`ERROR: ${error}`);
  }
}

// TODO would-be-nice tasks
//   - Wrap the logger so that anything that uses it will send their output to
//     a log panel in the IO
module.exports = function (nodecg) {
  // The front end can ask us at any time to generate and send it a URL for
  // authorizing with twitch.
  nodecg.listenFor('get-twitch-auth-url', () => {
    nodecg.sendMessage('auth-redirect-url', getAuthURL());
  });

  const app = nodecg.Router();

  app.get('/auth/twitch/callback', (req, res) => {
    const code = req.query.code;
    const scope = req.query.scope;

    console.log(`We got a code of ${code} for scopes ${scope}`);
    getAccessToken(code);
    res.redirect('/dashboard/')
  });

  nodecg.mount(app);
};
