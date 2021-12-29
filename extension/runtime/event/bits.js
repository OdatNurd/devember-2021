// =============================================================================


const { displayEventDetails } = require('../../utils');


// =============================================================================


/* This is the event handler for a cheer, indicating that someone is using bits
 * in the channel. */
function bit_donation(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelCheerEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelcheer
  displayEventDetails(api, name, event, [
    'bits',
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'isAnonymous',
    'message',
    'userDisplayName',
    'userId',
    'userName',
  ], [
    '[A] getBroadcaster',
    '[A] getUser',
  ]);
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
