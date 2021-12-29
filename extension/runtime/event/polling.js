// =============================================================================


const { displayEventDetails } = require('../../utils');


// =============================================================================


/*******************************************************************************
 * NOTE: Twitch does not guarantee that events are triggered in any given order
 *       (and may in fact trigger the same event more than once, if it thinks
 *       you never got it).
 *
 *       The implications for that here is that it's entirely possible to
 *       receive a progress event for a train before ever being told that it is
 *       actually beginning.
 *
 *       As such, code to handle these needs to be smart enough to know when
 *       this might be occurring. */


// =============================================================================


/* This event triggers to provide information about a poll starting in a channel
 * and includes information on the items that were added to the poll, other
 * config info, if extra votes are allowed and so on. */
function poll_begin(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPollBeginEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpollbegin
  displayEventDetails(api, name, event, [
    'bitsPerVote',
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'channelPointsPerVote',
    'choices',
    'endDate',
    'id',
    'isBitsVotingEnabled',
    'isChannelPointsVotingEnabled',
    'startDate',
    'title',
  ], [
    '[A] getBroadcaster',
  ]);
}


// =============================================================================


/* This event triggers while a poll is in progress and provides a status update
 * on how the poll is progressing, including such things as the current choices
 * and how many votes have been received, among other info. */
function poll_update(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPollProgressEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpollprogress
  displayEventDetails(api, name, event, [
    'bitsPerVote',
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'channelPointsPerVote',
    'choices',
    'endDate',
    'id',
    'isBitsVotingEnabled',
    'isChannelPointsVotingEnabled',
    'startDate',
    'title',
  ], [
    '[A] getBroadcaster',
  ]);
}


// =============================================================================


/* This event triggers when a poll in a channel has concluded, and provides
 * information about the poll such as the options and the final results of the
 * poll, among other things. */
function poll_end(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPollEndEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpollend
  displayEventDetails(api, name, event, [
    'bitsPerVote',
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'channelPointsPerVote',
    'choices',
    'endDate',
    'id',
    'isBitsVotingEnabled',
    'isChannelPointsVotingEnabled',
    'startDate',
    'status',
    'title',
  ], [
    '[A] getBroadcaster',
  ]);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      pollBegin: poll_begin,
      pollUpdate: poll_update,
      pollEnd: poll_end
    };
  },

  unload: async api => {
  }
};
