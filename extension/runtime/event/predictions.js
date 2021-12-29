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


/* This event triggers to indicate that a prediction is being started in a given
 * channel, and provides information such as the channel that the prediction is
 * starting in, how long the prediction will run, what the options are, among
 * other info.
 *
 * The prediction will run until the provided time has expired, at which point
 * it will lock pending the broadcaster ending the prediction by choosing the
 * winning outcome. */
function prediction_begin(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionBeginEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionbegin
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'id',
    'lockDate',
    'outcomes',
    'startDate',
    'title',
  ], [
    '[A] getBroadcaster',
  ]);
}


// =============================================================================


/* This event triggeers while a prediction in the channel is currently ongoing
 * and the status of votes in the prediction has been changed as a result of
 * user input. This provides information such as the number of votes for each
 * of the outcomes.
 *
 * Updates can occur up until the lock date of the prediction arrives, at which
 * point the prediction locks, no further votes are allowed, and everything
 * waits for the broadcaster to end the prediction by choosing the winner. */
function prediction_update(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionProgressEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionprogress
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'id',
    'lockDate',
    'outcomes',
    'startDate',
    'title',
  ], [
    '[A] getBroadcaster',
  ]);
}


// =============================================================================


/* This event triggers to indicate that an ongoing prediction has been locked.
 * A prediction is locked when the amount of time given for it has expired. Once
 * locked, no further votes on the prediction are allowed.
 *
 * The prediction ends when the broadcaster chooses the winning outcome. */
function prediction_lock(api, name, event) {
  // Display the properties of the event, for debug purposes.
  // - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionLockEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionlock
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'id',
    'lockDate',
    'outcomes',
    'startDate',
    'title',
  ], [
    '[A] getBroadcaster',
  ]);
}


// =============================================================================


/* This event triggers when a prediction in a channel ends. A prediction is
 * started with a specific amount of time for votes to be recorded, and once
 * that time expires, the prediction locks.
 *
 * The prediction ends when the broadcaster chooses the winning outcome. */
function prediction_end(api, name, event) {
  // Display the properties of the event, for debug purposes.
  //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionEndEvent.html
  //  - https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionend
  displayEventDetails(api, name, event, [
    'broadcasterDisplayName',
    'broadcasterId',
    'broadcasterName',
    'endDate',
    'id',
    'outcomes',
    'startDate',
    'status',
    'title',
    'winningOutcome',
    'winningOutcomeId',
  ], [
    '[A] getBroadcaster',
  ]);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      predictionBegin: prediction_begin,
      predictionUpdate: prediction_update,
      predictionLock: prediction_lock,
      predictionEnd: prediction_end
    };
  },

  unload: async api => {
  }
};
