// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This event handler is triggered to indicate that a user has been banned in
 * the channel, and indicates info about the ban such as whose channel it
 * happened in, who did it, who was banned, why, and when the ban expires. */
function ban_add(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event handler is triggered to indicate that a user has had their ban
 * listen in the channel, and indicates info about the unban such as the channel
 * it happened in, who was unbanned, and other info.
 *
 * This event shares the same event structure as a ban, but when used as an
 * unban event, not all fields will be present. */
function ban_remove(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      ban: ban_add,
      unban: ban_remove
    };
  },

  unload: async api => {
  }
};
