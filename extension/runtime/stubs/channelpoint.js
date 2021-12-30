// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This function implements the '{{ redeem.title }}' channel point redeem for
 * redeem: {{ redeem.id }}
 *
 * The bot API is available via api, while event is the details of the channel
 * point redeem event that triggered this redemption. */
function {{ redeem.handler }}(api, event) {
  // Display the properties of the event that spawned us, for debug purposes.
  displayEventDetails(api, 'channelpoint_redeem', event);

  api.log.info('I am the {{ redeem.id }} ({{ redeem.title }}) channel point redeem');
}


// =============================================================================


/* Every redeem handler must export an object with a load and unload function,
 * which are used to set up and tear down any state that the redeems in this
 * file need to run (if any). */
module.exports = {
  /* Set up any state required for the redeems in this file to execute, and
   * return back a mapping between the redeems implemented here and the
   * functions that implement them.  */
  load: async api => {
    // The api.shared table can be used to set up arbitrary data that is shared
    // between the events in this file and events in other files, if desired.
    //
    // api.shared.mydata = {}
    return {
      '{{ redeem.id }}': {{ redeem.handler }}
    };
  },

  /* Tear down any global state that no longer needs to be saved when the
   * file is unloaded. This should clean up any resources that are no longer
   * needed, but it's also possible for the 'api.shared' table to persist
   * information across a reload, for example. */
  unload: async api => {
  }
};
