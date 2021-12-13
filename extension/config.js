'use strict';


// =============================================================================


const convict = require('convict');
const json5 = require('json5');
const path = require('path');

// Tell convict about json5 so that our configuration file can have comments in
// it without the parser taking a dump on our heads.
convict.addParser([
  { extension: 'json', parse: json5.parse }
]);


// =============================================================================


/* This simple handler verifies that the value provided is non-null and throws
 * if it is. This is used to enforce configuration options that must exist in
 * combination with having their default values be null. */
const required = value => {
  if (value === null) {
    throw new Error('A configuration value for this key must be provided');
  }
};


// =============================================================================


/* This handler is an extension of the above and further verifies that the
 * value is exactly 32 characters long; this is required for the encryption
 * secret. */
const required_len_32 = value => {
  required(value);
  if (value.length !== 32) {
    throw new Error('This value must be exactly 32 characters long');
  }
}


// =============================================================================


/* This sets the configuration schema to be used for the bot configuration. It's
 * split up into sections based on functionality.
 *
 * The overarching goal is that twitch.core.* and crypto.* are absolutely
 * required since they control the bot's ability to do anything at all, but
 * apart from that all other options are considered optional and missing
 * configuration will disable any functionality that requires those settings
 * in order to operate, unless there's a sensible default that can be fallen
 * back upon.
 *
 * This only specifies the static config; that is, the information that you
 * set up once and it remains that way for the entire run of the bot. Anything
 * that is configuration based that can be changed at runtime (such as the
 * channel the bot runs in) is a dynamic configuration object, which is stored
 * in the database. */
const config = convict({
  // These configuration options relate to the interactions between the bot
  // and Twitch.
  twitch: {
    core: {
      clientId: {
        doc: 'The Client ID of the application underpinning the bot',
        format: required,
        env: 'TWITCHBOT_CLIENT_ID',
        default: null
      },
      clientSecret: {
        doc: 'The Twitch Client Secret for the application underpinning the bot',
        format: required,
        default: null,
        env: 'TWITCHBOT_CLIENT_SECRET',
        sensitive: true
      },
      botCallbackURL: {
        doc: 'The configured OAuth callback URL used during authentication of the bot account',
        format: required,
        default: null,
        env: 'TWITCHBOT_BOT_AUTH_CALLBACK'
      },
      userCallbackURL: {
        doc: 'The configured OAuth callback URL used during authentication of the user channel account',
        format: required,
        default: null,
        env: 'TWITCHBOT_USER_AUTH_CALLBACK'
      }
    },
  },
  crypto: {
    secret: {
      doc: 'The encryption secret; this must be exactly 32 characters long',
      format: required_len_32,
      default: null,
      env: 'TWITCHBOT_CRYPTO_SECRET',
      sensitive: true
    }
  }
});


// =============================================================================


/* Load the configuration file into memory and verify that all of the fields are
 * valid. If so, return back the config object that allows code to determine
 * what it's configuration parameters are.
 *
 * This will raise an exception if the configuration file is missing, invalid
 * or has keys set to nonsensical values. */
function loadConfig(baseDir) {
  // Load and validate the configuration file, and if all is successful, return
  // the config object that loaded the config.  Otherwise we would instead
  // raise an exception.
  config.loadFile(path.resolve(baseDir, 'twitchbot.json'));
  config.validate();

  return config;
}


// =============================================================================


module.exports = loadConfig;
