// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This event handler triggers whenever a new user follows the channel, and
 * provides information about the channel being followed and the user that is
 * doing the follow. */
function user_follow(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event handler triggers whenever someone subscribes to the channel,
 * and includes the channel being subscribed to, the user that is subscribed,
 * and information on the sub such as the tier and wether or not is is a gift.
 *
 * It does not however include a user that's resubscribing. To get that, use
 * the subscribe_messge event. */
function user_sub(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event triggers when a user's subscription lapses because they did not
 * renew it, and includes information on the user's subscription and includes
 * information such as the tier and whether or not it was a gift. */
function user_unsub(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event handler triggers to indicate that someone has gifted subscriptions
 * in a channel, and includes information on the channel getting the gift subs,
 * the amount and the tier, and an indication of wether or not the gift is
 * anonymous or not. */
function user_gift_sub(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


/* This event handler triggers to provide an indication that a user that has a
 * subscription to the channel has decided to resubscribe to the channel. The
 * information in the event includes the channel, the tier, and other info such
 * as the cumulative months subscribed and the streak, among other things/ */
function user_sub_message(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      follow: user_follow,
      subscribe: user_sub,
      unsubscribe: user_unsub,
      gift: user_gift_sub,
      subcribe_message: user_sub_message
    };
  },

  unload: async api => {
  }
};
