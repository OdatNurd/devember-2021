// =============================================================================


const { displayEventDetails } = require('../../utils');


// =============================================================================


/* This event handler tracks both moderator add and remove events, and indicates
 * information about users being made moderators or being removed as moderators
 * in the channel.
 *
 * This handler triggers for both a add and remove events; if you would like to
 * distinguish, use the name.  */
function moderator_update(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelModeratorEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelmoderatoradd
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelmoderatorremove
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
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
      moderator_add: moderator_update
    };
  },

  unload: async api => {
  }
};
