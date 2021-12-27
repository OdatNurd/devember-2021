
// =============================================================================


const { command_prefix_list } = require('./utils');

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

  // These items relate to the encryption that we use when we store tokens in
  // the database so that they're safe from casual inspection.
  crypto: {
    secret: {
      doc: 'The encryption secret; this must be exactly 32 characters long',
      format: required_len_32,
      default: null,
      env: 'TWITCHBOT_CRYPTO_SECRET',
      sensitive: true
    }
  },

  // These items relate to the configuration of the underlying bot code and how
  // it runs and interacts with Twitch.
  bot: {
    role: {
      doc: 'The role of this installation of the bot; can be used to direct commands',
      format: '*',
      env: 'TWITCHBOT_ROLE',
      default: 'dev'
    },
    defaultPrefix: {
      doc: 'The default character to use as a command prefix if none is provided',
      format: command_prefix_list.split(''),
      env: 'TWITCHBOT_DEFAULT_PREFIX',
      default: '!'
    }
  },

  // These options relate to the configuration of the Twitch event system; in
  // this system we set up for listening for twitch to tell us when specific
  // things happen (such as a new follow or a subscription, etc).
  //
  // These are optional; if notificationUri or signingSecret are not
  // provided, then the server will not be started and no events will be
  // listened for.
  events: {
    notificationUri: {
      doc: 'The URI to provide to Twitch to deliver event notifications',
      format: '*',
      env: 'TWITCHBOT_NOTIFICATION_URI',
      default: ''
    },
    serverPort: {
      doc: 'The port that the internal notification event server should listen on',
      format: 'port',
      env: 'TWITCHBOT_NOTIFICATION_PORT',
      default: 3000
    },
    signingSecret: {
      doc: 'Signing secret to use when setting up notifications',
      format: '*',
      env: 'TWITCHBOT_SIGNING_SECRET',
      default: '',
      sensitive: true
    }
  },

  // These items relate to the configuration of the TTS system (powered by
  // Google's TTS API). They specify the different parameters that can be used
  // to select the voice that is used.
  //
  // In order for the Google TTS system to work, the
  // GOOGLE_APPLICATION_CREDENTIALS variable must be set and point to the file
  // that has the appropriate credentials for the application inside. That is
  // not configured here (though you could store it in your .env file); if it's
  // not set, then TTS will be disabled.
  tts: {
    language: {
      doc: 'The language that the TTS system should use to speak',
      format: '*',
      env: 'TWITCHBOT_TTS_LANGUAGE',
      default: 'en-US'
    },
    gender: {
      doc: 'The gender of the TTS voice',
      format: ['MALE', 'FEMALE'],
      env: 'TWITCHBOT_TTS_GENDER',
      default: 'MALE'
    },
    voice: {
      doc: 'The name of the voice used to speak',
      format: '*',
      env: 'TWITCHBOT_TTS_VOICE',
      default: 'en-US-Standard-J'
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
