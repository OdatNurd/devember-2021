// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This event handler tracks both ban and unban events, and indicates info about
 * the ban such as whose channel it happened in, who did it, who was banned,
 * why, and when the ban expires. Unban events have some undefined fields since
 * they do not apply, such as there not being a reason for the unban.
 *
 * This handler triggers for both a ban and unban event; if you would like to
 * distinguish, use the name.  */
function ban_unban(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      ban: ban_unban
    };
  },

  unload: async api => {
  }
};
