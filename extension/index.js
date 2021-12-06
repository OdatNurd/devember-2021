'use strict';

// Before doing anything else, load the .env file in the current directory to
// backfill any missing environment variables; anything that is already defined
// will be left untouched.
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

// Load up our configuration information up and obtain the configuration
// object.
const config = require('./config');

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// TODO would-be-nice tasks
//   - Wrap the logger so that anything that uses it will send their output to
//     a log panel in the IO
module.exports = function (nodecg) {
  nodecg.log.info(`configuration is ${config.toString()}`);

  function getAuthURL(state) {
    const params = {
      client_id: config.get('twitch.core.clientId'),
      redirect_uri: config.get('twitch.core.callbackURL'),
      force_verify: true,
      response_type: 'code',
      scope: 'user:read:email',
      state
    };

    return `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams(params)}`;
  }

  async function getAccessToken(code) {
    try {
      const response = await axios({
        url: 'https://id.twitch.tv/oauth2/token',
        method: 'POST',
        data: {
          client_id: config.get('twitch.core.clientId'),
          client_secret: config.get('twitch.core.clientSecret'),
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.get('twitch.core.callbackURL')
        }
      });

      nodecg.log.info(response.data);
    }
    catch (error) {
      nodecg.log.error(`${error.response.status} : ${JSON.stringify(error.response.data)}`);
      nodecg.log.error(`${error}`);
    }
  }

  let state = uuidv4();

  // Generate a new authorization URL for the front end code to use and then
  // transmit it to the dashboard.
  const send_url = () => {
    state = uuidv4();
    nodecg.sendMessage('auth-redirect-url', getAuthURL(state));
  }

  // The front end can ask us at any time to generate and send it a URL for
  // authorizing with twitch.
  nodecg.listenFor('get-twitch-auth-url', () => send_url());

  const app = nodecg.Router();

  app.get('/auth/twitch/callback', (req, res) => {
    const code = req.query.code;
    const scope = req.query.scope;
    const inState = req.query.state;

    if (code === undefined) {
      nodecg.log.error(`User did not confirm authorization`);
    } else {
      if (inState !== state) {
        nodecg.log.error(`auth callback got out of date authorization code; potential spoof?`);
      } else {
          getAccessToken(code);
      }
    }

    res.redirect('/dashboard/')
  });

  nodecg.mount(app);
};
