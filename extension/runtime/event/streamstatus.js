// =============================================================================


const { displayEventDetails } = require('../../utils');


// =============================================================================


/* This event handler tracks both online and offline events, which indicate when
 * the status of the stream is changing from online or offline as appropriate.
 * Both include the broadcaster information, but only the online event tells
 * when the start of the stream happened and its state. Similarly only the
 * online event has the method that tells you about the stream.
 *
 * This handler triggers for both online and offline events; if you would like
 * to distinguish, use the name. */
function stream_online_status(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubStreamOnlineEvent.html
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubStreamOfflineEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#streamonline
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#streamoffline
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'startDate',
    'streamType',
  ], [
    '[A] getBroadcaster',
    '[A] getStream',
  ]);
}


// =============================================================================


/* This is the event handlers for knowing when the meta information about the
 * stream is being modified, such as the title changing. */
function stream_update(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelUpdateEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelupdate
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'categoryId',
    'categoryName',
    'isMature',
    'streamLanguage',
    'streamTitle '   ,
  ], [
    '[A] getBroadcaster',
    '[A] getGame',
  ]);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      streamOnline: stream_online_status,
      update: stream_update
    };
  },

  unload: async api => {
  }
};
