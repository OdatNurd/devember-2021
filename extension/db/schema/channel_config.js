'use strict';

// =============================================================================

/* This schema represents the `channelconfig` table, which is used to store
 * information about the channel that the bot is running inside of. This is
 * information garnered from the account that is authorized in the front end to
 * contain the bot.
 *
 * The authorization associates that user with the permissions for us to take
 * actions in that channel, so we don't need to persist the token and instead
 * all we need is to store the information about that user's channel here for
 * other portions of the bot to use. */
const ChannelConfigSchema = {
  // Unique ID for this particular token
  id: 'increments',

  // The idenficiation of this user; this is a unique ID number (stored as a string),
  // the name of the account (used for logins) and the display name (which is always
  // the account name, but with a different capitalization)
  userid: { type: String, nullable: false },
  name: { type: String, nullable: false },
  displayName: { type: String, nullable: false },

  // The type of this user; for example 'affiliate'
  broadcasterType: { type: String, nullable: false },

  // The date that this account was created on
  creationDate: { type: Date, nullable: false },

  // The account type for this user; this can be things like 'staff', 'admin',
  // 'global_mod' or ''.
  type: { type: String, nullable: false },

  // The total number of views of the user's channel
  views: { type: Number, defaultsTo: 0 },

  // The description of the user
  description: { type: String, nullable: false },

  // URL's to the placeholder art for when the stream is offline, and the
  // profile picture of this user.
  profilePictureUrl: { type: String, nullable: false },
  offlinePlaceholderUrl: { type: String, nullable: false },
};

// =============================================================================

module.exports = {
  ChannelConfigSchema
};
