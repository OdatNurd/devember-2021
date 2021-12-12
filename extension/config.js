'use strict';

// =============================================================================

const convict = require('convict');
const json5 = require('json5');
const path = require('path');

// =============================================================================

// Tell convict about json5 so that our configuation files can have comments
// in them without the parser taking a dump on our heads.
convict.addParser([
  { extension: 'json', parse: json5.parse }
]);

/* This simple handler verifies that the value provided is non-null and throws
 * if it is. This is used to enforce configuration options that must exist in
 * combination with having their default values be null. */
const required = value => {
  if (value === null) {
    throw new Error('A configuration value for this key must be provided');
  }
};

/* This handler is an extension of the above and further verifies that the
 * value is exactly 32 characters long; this is required for the encruption
 * secret. */
const required_len_32 = value => {
  required(value);
  if (value.length !== 32) {
    throw new Error('This value must be exactly 32 characters long');
  }
}

/* This sets the configuration schema to be used for the bot configuration. It's
 * split up into sections based on functionality.
 *
 * The overarching goal is that twitch.core.* and crypto.* are absolutely
 * required since they control the bot's ability to do anything at all, but
 * apart from that all other options are considered optional and missing
 * configuration will disable any functionality that requires those settings
 * in order to operate, unless there's a sensible default that can be falled
 * back upon. */
const config = convict({
  // These configuration options relate to the interactions between the bot
  // and Twitch; some of them are specific to Twitch as a whole, some to the
  // ability to react to events, etc.
  twitch: {
    // These configuration options are strictly required; they provide the
    // required information to talk to Twitch.
    core: {
      clientId: {
        doc: 'The Client ID of the twitch application underpinning the bot',
        format: required,
        env: 'TWITCHBOT_CLIENT_ID',
        default: null
      },
      clientSecret: {
        doc: 'The Twitch Client Secret for the Twitch application underpinning the bot',
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
        doc: 'The configured OAuth callback URL used during authentication of the user account',
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
  // raise an exeption.
  config.loadFile(path.resolve(baseDir, 'twitchbot.json'));
  config.validate();

  return config;
}

// =============================================================================

module.exports = loadConfig;
