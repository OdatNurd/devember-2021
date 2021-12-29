// =============================================================================


const { displayEventDetails } = require('../../utils');


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
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelBanEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelban
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelunban
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'endDate',
    'isPermanent',
    'moderatorDisplayName',
    'moderatorId',
    'moderatorName',
    'reason',
    'userDisplayName',
    'userId',
    'userName',
  ], [
    '[A] getBroadcaster',
    '[A] getModerator',
    '[A] getUser',
  ]);
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
