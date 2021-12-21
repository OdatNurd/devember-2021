'use strict';


// =============================================================================


/* This schema is used by the core text command to represent simple text
 * responses in response to a command invocation; that is, commands which, when
 * invoked, get the bot to respond with some predefined text and that's all.
 *
 * It associates an name with a string of text and allows for setting up a
 * simple text response from the bot without requiring custom code.
 *
 * Since it is common to want a longer and shorter version of such commands,
 * this also supports an "alias" (or link) which can link multuiple entries
 * together such that multiple entries can associate with the same text without
 * reauiring many edits. */
const ResponseSchema = {
  // Unique ID for this entry
  id: 'increments',

  // The textual name for this entry. This should ideally be a command name or
  // alias of such, but the interpretation is up to the command that utilizes
  // the data.
  name: { type: String, unique: true, nullable: false },

  // The ID value of another entry in the table that this entry should draw its
  // text from. When this is 0, the text in the field below represents the text
  // for this entry; otherwise the text for this entry comes from the linked ID.
  link: { type: Number, defaultsTo: 0 },

  // The text that represents this response.
  text: { type: String, nullable: false, defaultsTo: '' },

  // The access level required for this to execute; this is similar to how
  // commands work, but here it's used to specify specific permissions for this
  // particular expansion.
  //
  // When an item is linked, it inherits the userLevel of it's linked entry.
  userLevel: { type: Number, defaultsTo: 0 },

  // When non zero, this is the amount of time in milliseconds that must elapsed
  // between insertions of this message. Within the cooldown period, the command
  // is silently dropped.
  //
  // Moderators and the Broadcaster are exempt from the cooldown period and may
  // always execute a command even if it's in cooldown.
  cooldown: { type: Number, defaultsTo: 0 }
};


// =============================================================================


module.exports = {
  ResponseSchema
};
