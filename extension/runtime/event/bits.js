// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This is the event handler for a cheer, indicating that someone is using bits
 * in the channel. */
function bit_donation(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      cheer: bit_donation
    };
  },

  unload: async api => {
  }
};
