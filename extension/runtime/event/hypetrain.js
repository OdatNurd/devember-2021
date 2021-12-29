// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/*******************************************************************************
 * NOTE: Twitch does not guarantee that events are triggered in any given order
 *       (and may in fact trigger the same event more than once, if it thinks
 *       you never got it).
 *
 *       The implications for that here is that it's entirely possible to
 *       receive a progress event for a train before ever being told that it is
 *       actually beginning.
 *
 *       As such, code to handle these needs to be smart enough to know when
 *       this might be occurring. */


// =============================================================================


/* This event triggers to indicate that a hype train is starting within a given
 * channel, and provides information such as the current progress, the top
 * contributors so far and the time the train started, among other info. */
function hype_train_begin(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event triggers to provide information on the progress of an ongoing hype
 * train in a channel, and provides updated status information about the train
 * such as the new level, last contribution and the new top contributors. */
function hype_train_update(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event triggers when a hype train finishes in a channel, and provides info
 * such as when the train ended and who the top contributors overall were. */
function hype_train_end(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      hype_begin: hype_train_begin,
      hype_update: hype_train_update,
      hype_end: hype_train_end
    };
  },

  unload: async api => {
  }
};
