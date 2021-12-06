'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/* In order to talk to twitch we need to be able to use the Twitch OAuth 2
 * authentication flows to get the tokes that we require.
 *
 * This sets up the back end required for our authentication to work. This
 * consists of NodeCG messages that allow for us to share information with the
 * front end code as well as responding to requests made by Twitch during the
 * flow. */
function auth(nodecg, config) {
  /* Construct and return an authorization URL. This is the URL that the browser
   * needs to display in order for the authentication to start. */
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

  /* Given a code value that has been retreived by Twitch calling back to our
   * authorization endpoint, make the request of Twitch that exchanges the code
   * for an access token. */
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

      // The response data contains our token and refresh information:
      // {
      //   access_token: 'hejlbz0uc3dlv6xczza2q636r12l26',
      //   expires_in: 15635,
      //   refresh_token: 'r56o80811dk2hxmf7tizbfa9e19i62boop0lfw38hmplcb5i1r',
      //   scope: [ 'user:read:email' ],
      //   token_type: 'bearer'
      // }
      nodecg.log.info(response.data);
    }

    catch (error) {
      nodecg.log.error(`${error.response.status} : ${JSON.stringify(error.response.data)}`);
      nodecg.log.error(`${error}`);
    }
  }

  // One of the paramters in the URL that we pass to Twitch to start
  // authorization is a randomlized string of text called the "state". This
  // value can be anything we like. When Twitch calls back to our callback URL
  // it passes the state string it was given back.
  //
  // Our end can use this to ensure that whenever the authorization endpoint is
  // triggered, that it is in response to a request that we initiated.
  let state = uuidv4();

  // The front end can ask us at any time to generate and send it a URL for
  // authorizing with Twitch; we respond by generating a new URL and sending
  // it back in another message.
  //
  // Every time this happens a new authorization state value is generated.
  nodecg.listenFor('get-twitch-auth-url', () => {
    state = uuidv4();
    nodecg.sendMessage('auth-redirect-url', getAuthURL(state));
  });

  // Ask the express server in NodeCG to create a new router for us.
  const app = nodecg.Router();

  // Listen for an incoming request from Twitch; this will happen in response to
  // the user clicking either Authorize or Cancel on the authorization page that
  // Twitch presents.
  app.get(new URL(config.get('twitch.core.callbackURL')).pathname, (req, res) => {
    // The query paramters that come back include a code value that we need to
    // use to obtain our actual access token.
    const code = req.query.code;
    const inState = req.query.state;

    // If no code comes back, it's because the user decided not to authorize.
    // We should respond to this by removing any tokens that we currently have.
    if (code === undefined) {
      nodecg.log.error(`User did not confirm authorization`);
    } else {
      // There is a code; if the state is not the same as the one that we gave
      // to Twitch when the authorization started, don't trust anything in this
      // resonse.
      if (inState !== state) {
        nodecg.log.error(`auth callback got out of date authorization code; potential spoof?`);
      } else {
        // Fetch the token.
        getAccessToken(code);
      }
    }

    // No matter what happened, tell the browser to redirect back to the
    // dashboard.
    res.redirect('/dashboard/')
  });

  nodecg.mount(app);
}

module.exports = auth;