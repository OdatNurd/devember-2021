'use strict';

const convict = require('convict');
const json5 = require('json5');
const path = require('path');

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

/* This sets the configuration schema to be used for the bot configuration. It's
 * split up into sections based on functionality.
 *
 * The overarching goal is that twitch.core.* are absolutely required since they
 * control the bot's ability to do anything at all, but apart from that all
 * other options are considered optional and missing configuration will disable
 * any functionality that requires those settings in order to operate. */
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
      callbackURL: {
        doc: 'The configured OAuth callback URL used during authentication',
        format: required,
        default: null,
        env: 'TWITCHBOT_AUTH_CALLBACK'
      }
    },
  },
});

// Load and validate the configuration.
config.loadFile(path.resolve(__dirname, '..', 'twitchbot.json'));
config.validate();

module.exports = config;
