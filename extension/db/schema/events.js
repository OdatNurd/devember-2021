
// =============================================================================


/* This schema is used to represent Twitch EventSub events, which are found and
 * associated with handlers by name from dynamically loaded files, just as the
 * bot commands are.
 *
 * The system allows for events to be individually enabled  or disabled,
 * aliased, and hot reloaded. */
const EventSchema = {
  // Unique ID for this particular event
  id: 'increments',

  // The event name and the aliases that it can be known by (which can be an
  // empty list). All events must have unique names.
  name: { type: String, unique: true, nullable: false },
  aliases: { type: Array, defaultsTo: [] },

  // Whether this event is enabled or not. Disabled events will not fire from
  // the back end handler.
  enabled: { type: Boolean, defaultsTo: true },

  // The file that is expected to contain the implementation of this event.
  sourceFile: { type: String, nullable: false }
};


// =============================================================================


module.exports = {
  EventSchema
};
