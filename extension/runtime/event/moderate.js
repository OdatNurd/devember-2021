// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This event handler is used to indicate that a new user has been given the
 * status of moderator in the channel. */
function moderator_add(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}

// =============================================================================


/* This event handler is used to indicate that a user has had their status of
 * moderator revoked in the channel. */
function moderator_remove(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}

// =============================================================================


module.exports = {
  load: async api => {
    return {
      moderator_add: moderator_add,
      moderator_remove: moderator_remove
    };
  },

  unload: async api => {
  }
};
