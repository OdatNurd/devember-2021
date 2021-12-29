// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This event handler triggers as an indication that a specific channel is now
 * online and streaming, and indicates what channel is streaming and what type
 * of stream it is.*/
function stream_online_status(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event handler triggers as an indication that a specific channel has gone
 * from online to offline.
 *
 * This event shares the same event structure as the online event, but here
 * not all fields are filled out because some only apply to being online. */
function stream_offline_status(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This is the event handlers for knowing when the meta information about the
 * stream is being modified, such as the title changing. */
function stream_update(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      stream_online: stream_online_status,
      stream_offline: stream_offline_status,
      update: stream_update
    };
  },

  unload: async api => {
  }
};
