'use strict';


// =============================================================================


/* This schema is used for represent text responders; a special class of
 * commands which, when triggered, will cause the bot to generate text into the
 * chat. These are commonly used to generate responses to often asked questions
 * and the like.
 *
 * Each entry here associates a main name and a set of potential aliases for the
 * same thing, all of which associate with text to display, and contain a user
 * level required to trigger them, and a cooldown timer.
 *
 * This is very similar to commands, except that without a source file they
 * need to be linked via special dispatcher in the chat code. */
const ResponderSchema = {
  // Unique ID for this text response entry
  id: 'increments',

  // The responder name and the aliases that it can be known by (which can be an
  // empty list). All responders must have unique names. The name of responders
  // and the aliases for them must always include a valid command prefix.
  name: { type: String, unique: true, nullable: false },
  aliases: { type: Array, defaultsTo: [] },

  // The text for the bot to say when this responder is triggered.
  text: { type: String, nullable: false, defaultsTo: '' },

  // The access level required to trigger this responder. User access levels
  // must be equal to or lower than the value here to be able to trigger the
  // responder.
  //    0: isBroadcaster
  //    1: isMod
  //    2: isVip
  //    3: isRegular
  //    4: isSubscriber
  //    5: isEveryone
  userLevel: { type: Number, defaultsTo: 0 },

  // When non zero, this is the amount of time in milliseconds that must elapsed
  // between invocations of this responder. Within the cooldown period, the
  // request for the response is silently dropped.
  //
  // Moderators and the Broadcaster are exempt from the cooldown period and may
  // always trigger a responder even if it's in cooldown.
  cooldown: { type: Number, defaultsTo: 0 }
};


// =============================================================================


module.exports = {
  ResponderSchema
};
