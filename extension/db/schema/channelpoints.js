
// =============================================================================


/* This schema is used to represent custom Twitch channel point redemptions,
 * which are found and associated with handlers by their unique ID values from
 * dynamically loaded files, just as the bot commands are.
 *
 * The system allows for channel point redemptions to be individually enabled
 * or disabled, aliased to give them a more human readable name, and hot
 * reloaded. */
const ChannelPointSchema = {
  // Unique ID for this particular redeem
  id: 'increments',

  // The channel point name and the aliases that it can be known by (which can
  // be an empty list). All redeems must have unique names.
  //
  // It is suggested that the name be the official ID, and the alias be
  // something  more human readable; the name will be used to invoke the
  // handler, but the aliases will appear in the list.
  name: { type: String, unique: true, nullable: false },
  aliases: { type: Array, defaultsTo: [] },

  // Whether this redeem is enabled or not. Disabled redeems will not fire
  // from the back end handler.
  enabled: { type: Boolean, defaultsTo: true },

  // The file that is expected to contain the implementation of this redeem.
  sourceFile: { type: String, nullable: false }
};


// =============================================================================


module.exports = {
  ChannelPointSchema
};
