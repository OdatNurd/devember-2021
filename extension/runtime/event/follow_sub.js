// =============================================================================


/* This event handler triggers whenever someone actively follows the channel;
 * this provides information as to who did the actual follow. */
function user_follow(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.chat.say(`@${event.userDisplayName} just followed! Welcome!`);
}


// =============================================================================


/* This event handler triggers whenever someone subscribes to the channel,
 * including when a sub is gifted to someone else.
 *
 * Unlike when Twitch provides this information to the chat, the event here does
 * not provide a direct indication that someone is paying forward a gift sub or
 * continuing a gifted sub; for that we would need to track the list of users
 * that are subscribed and how that happened, if we care. */
function user_sub(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.userName} just got a sub`);
}


// =============================================================================


/* This event handler trigger when a user's subscription to the channel
 * expires. This indicates the tier of the sub and whether or not it was a
 * gift. */
function user_unsub(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.userName} just dropped their sub`);
}


// =============================================================================


/* This event handler triggers whenever someone subscribes as the result of a
 * gift subscription. The message indicates who the subscriber is and that the
 * sub is a gift, but not who gifted it. */
function user_gift_sub(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.gifterDisplayName} just gifted a sub`);
}


// =============================================================================


/* This event handler triggers whenever a message would be displayed that
 * indicates that someone is subscribing or being gifted a sub.
 *
 * Whereas the user_sub event triggers whenever anyone subscribes, this one
 * triggers when a user resubscribes in the channel and provides a message that
 * goes along with the resub.
 *
 * This includes information like the message, the total number of months
 * subscribed, and the subscription streak. */
function user_sub_message(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.userName} just got a sub`);
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
