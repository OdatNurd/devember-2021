'use strict';


// =============================================================================


/* This schema represents the user table, which is used to store the userID's
 * of the Twitch users that the bot deals with.
 *
 * Currently that would be the single account that the bot runs as, and the
 * user of the channel within which the bot resides.
 *
 * This stores only the static unchanging information about the user, since
 * anything else is subject to change and this should not be persisted in such
 * a permanent manner. */
const UserSchema = {
  // Unique ID for this particular token
  id: 'increments',

  // The type of this user record this row pertains to; this is something like
  // 'bot' if this is the ID of the bot account, or 'user' if this is the ID of
  // the user whose channel the bot resides in.
  type: { type: String, nullable: false },

  // The identication ID of this user; unlike the name and display name, the
  // userid remains always distinct and unchanging.
  userId: { type: String, nullable: false },
};


// =============================================================================


module.exports = {
  UserSchema
};
