// =============================================================================


const { displayEventDetails } = require('../../utils');


// =============================================================================


/* This event handler tracks an incoming raid event, which tells you when the
 * channel is being raided, by whom, and how many people came in as a part of
 * the raid. */
function incoming_raid(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRaidEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelraid
  displayEventDetails(api, name, event, [
    'raidedBroadcasterDisplayName',
    'raidedBroadcasterId',
    'raidedBroadcasterName',
    'raidingBroadcasterDisplayName',
    'raidingBroadcasterId',
    'raidingBroadcasterName',
    'viewers',
  ], [
    '[A] getRaidedBroadcaster',
    '[A] getRaidingBroadcaster',
  ]);
}


// =============================================================================


/* This event handler tracks an outgoing raid event, which tells you when the
 * broadcaster of the channel raids out to some other channel, and indicates who
 * is being raided and how many people are going along as part of the raid. */
function outgoing_raid(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRaidEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelraid
  displayEventDetails(api, name, event, [
    'raidedBroadcasterDisplayName',
    'raidedBroadcasterId',
    'raidedBroadcasterName',
    'raidingBroadcasterDisplayName',
    'raidingBroadcasterId',
    'raidingBroadcasterName',
    'viewers',
  ], [
    '[A] getRaidedBroadcaster',
    '[A] getRaidingBroadcaster',
  ]);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      raidIn: incoming_raid,
      raidOut: outgoing_raid,
    };
  },

  unload: async api => {
  }
};
