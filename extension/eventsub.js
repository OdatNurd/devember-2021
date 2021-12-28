// =============================================================================


const { getUserInfo } = require('./auth');
const { dedent: _ } = require('./utils');

const { ReverseProxyAdapter, ConnectionAdapter, EventSubListener } = require('@twurple/eventsub');


// =============================================================================


/* This associates a list of events that we know how to handle with the EventSub
 * endpoint that knows how to handle them. In this mapping, the key is the
 * event name given in the events table and the value is the name of a method
 * in the Twurple EventSubListener class that sets up a listener for that event.
 *
 * Each item is annotated with a comment that contains an example Twitch CLI
 * invocation that allows you to simulate that event.
 *
 * To use that, install the Twitch CLI and make sure that there are environment
 * variables TWITCHBOT_SIGNING_SECRET, TWITCH_USERID and TWITCH_URI are set,
 * which specify the signing secret you're using for the bot, and the userID of
 * your channel and the reverse proxy URI you're using respectively. */
const eventHandlers = {
  //----------------------------//
  // No special scopes required //
  //----------------------------//

  // twitch event trigger follow -s channel.follow.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.follow.$TWITCH_USERID
  follow: 'subscribeToChannelFollowEvents',

  // twitch event trigger streamup -s stream.online.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/stream.online.$TWITCH_USERID
  streamOnline: 'subscribeToStreamOnlineEvents',

  // twitch event trigger streamdown -s stream.offline.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/stream.offline.$TWITCH_USERID
  streamOffline: 'subscribeToStreamOfflineEvents',

  // twitch event trigger stream-change -s channel.update.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.update.$TWITCH_USERID
  update: 'subscribeToChannelUpdateEvents',

  // twitch event trigger raid -s channel.raid.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.raid.$TWITCH_USERID
  raid: 'subscribeToChannelRaidEventsFrom',

  //------------------//
  // Scope: bits:read //
  //------------------//

  // twitch event trigger cheer -s channel.cheer.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.cheer.$TWITCH_USERID
  cheer: 'subscribeToChannelCheerEvents',

  //-------------------------//
  // Scope: channel:moderate //
  //-------------------------//

  // twitch event trigger ban -s channel.ban.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.ban.$TWITCH_USERID
  ban: 'subscribeToChannelBanEvents',

  // twitch event trigger unban -s channel.unban.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.unban.$TWITCH_USERID
  unban: 'subscribeToChannelUnbanEvents', // scope: moderation:read

  //------------------------//
  // Scope: moderation:read //
  //------------------------//

  // twitch event trigger add-moderator -s channel.moderator.add.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.moderator.add.$TWITCH_USERID
  moderator_add: 'subscribeToChannelModeratorAddEvents',

  // twitch event trigger remove-moderator -s channel.moderator.remove.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.moderator.remove.$TWITCH_USERID
  moderator_remove: 'subscribeToChannelModeratorRemoveEvents',

  //-----------------------------------//
  // Scope: channel:read:subscriptions //
  //-----------------------------------//

  // twitch event trigger subscribe -s channel.subscribe.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscribe.$TWITCH_USERID
  subscribe: 'subscribeToChannelSubscriptionEvents',

  // twitch event trigger unsubscribe -s channel.subscription.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscription.end.$TWITCH_USERID
  unsubscribe: 'subscribeToChannelSubscriptionEndEvents',

  // twitch event trigger gift -s channel.subscription.gift.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscription.gift.$TWITCH_USERID
  gift: 'subscribeToChannelSubscriptionGiftEvents',

  // twitch event trigger subscribe-message -s channel.subscription.message.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscription.message.$TWITCH_USERID
  subcribe_message: 'subscribeToChannelSubscriptionMessageEvents',

  //--------------------------------//
  // Scope: channel:read:hype_train //
  //--------------------------------//

  // twitch event trigger hype-train-begin -s channel.hype_train.begin.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.hype_train.begin.$TWITCH_USERID
  hypeBegin: 'subscribeToChannelHypeTrainBeginEvents',

  // twitch event trigger hype-train-progress -s channel.hype_train.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.hype_train.end.$TWITCH_USERID
  hypeUpdate: 'subscribeToChannelHypeTrainProgressEvents',

  // twitch event trigger hype-train-end -s channel.hype_train.progress.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.hype_train.progress.$TWITCH_USERID
  hypeEnd: 'subscribeToChannelHypeTrainEndEvents',

  //-----------------------------------------------------------------//
  // Scope: channel:read:redemptions (or channel:manage:redemptions) //
  //-----------------------------------------------------------------//

  // twitch event trigger add-reward -s channel.channel_points_custom_reward.add.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward.add.$TWITCH_USERID
  channelpoint_add: 'subscribeToChannelRewardAddEvents',

  // twitch event trigger update-reward -s channel.channel_points_custom_reward.update.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward.remove.$TWITCH_USERID
  channelpoint_remove: 'subscribeToChannelRewardRemoveEvents',

  // twitch event trigger remove-reward -s channel.channel_points_custom_reward.remove.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward.update.$TWITCH_USERID
  channelpoint_update: 'subscribeToChannelRewardUpdateEvents',

  // twitch event trigger add-redemption -s channel.channel_points_custom_reward_redemption.add.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward_redemption.add.$TWITCH_USERID
  channelpoint_redeem: 'subscribeToChannelRedemptionAddEvents',

  //-----------------------------------------------------//
  // Scope: channel:read:polls (or channel:manage:polls) //
  //-----------------------------------------------------//

  // twitch event trigger poll-begin -s channel.poll.begin.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.poll.begin.$TWITCH_USERID
  pollBegin: 'subscribeToChannelPollBeginEvents',

  // twitch event trigger poll-end -s channel.poll.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.poll.end.$TWITCH_USERID
  pollEnd: 'subscribeToChannelPollEndEvents',

  // twitch event trigger poll-progress -s channel.poll.progress.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.poll.progress.$TWITCH_USERID
  pollUpdate: 'subscribeToChannelPollProgressEvents',

  //-----------------------------------------------------------------//
  // Scope: channel:read:predictions (or channel:manage:predictions) //
  //-----------------------------------------------------------------//

  // twitch event trigger prediction-begin -s channel.prediction.begin.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.begin.$TWITCH_USERID
  predictionBegin: 'subscribeToChannelPredictionBeginEvents',

  // twitch event trigger prediction-end -s channel.prediction.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.end.$TWITCH_USERID
  predictionEnd: 'subscribeToChannelPredictionEndEvents',

  // twitch event trigger prediction-lock -s channel.prediction.lock.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.lock.$TWITCH_USERID
  predictionLock: 'subscribeToChannelPredictionLockEvents',

  // twitch event trigger prediction-progress -s channel.prediction.progress.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.progress.$TWITCH_USERID
  predictionUpdate: 'subscribeToChannelPredictionProgressEvents'
};


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be authorized. We use this to determine if it's ok for
 * us to set up Twitch events.
 *
 * This will get invoked for all authorizations, but we only care about the user
 * account, since EventSub works at the channel level and will work even if
 * there is no authorized bot account for chat purposes. */
async function handleAuthEvent(api, info) {
  // If the event is a bot event, we don't care; we need the authorization of
  // the user's account to set up events in their channel.
  if (info.type !== 'user') {
    return;
  }

  // Set up an EventSub listener that we will use to listen for all of our
  // incoming events. As we listen for new events, this will do all of the work
  // needed to either add a new event subscription for this channel or reuse the
  // existing one.
  api.eventSub.listener = new EventSubListener({
    apiClient: api.twitch,
    secret: api.eventSub.secret,
    adapter: new ReverseProxyAdapter({hostName: api.eventSub.uri, port: api.eventSub.port}),
  });

  // Set up all of the Twitch EventSub events.
  //
  // Each one uses the same handler function, which uses the name of any given
  // event to look up in the event handlers list the event that should be
  // trigger, and then if found executes the handler.
  api.log.info(`Setting up for incoming Twitch events`);
  await api.eventSub.listener.listen();

  // Enable all handlers; this uses the same handler for everything, which uses
  // the name of any given event to look up the handler, and if found execute
  // it.
  for (const [name, handler] of Object.entries(eventHandlers)) {
    try {
      // The EventSubListener object contains a series of methods that allow you
      // to listen for specific incoming events. Our event map maps those to the
      // associated events, so we can associate things easier.
      //
      // Each event uses the same listener thatt checks the event list to see if
      // it can find an item with the name provided, and if so it will dispatch
      // the event by executing it. Otherwise, it logs an error.
      await api.eventSub.listener[handler](info.userId, event => {
        const eventHandler = api.eventSub.find(name);
        if (eventHandler !== null) {
          api.log.info(`Dispatching event ${name}`);
          eventHandler.execute(api, name, event);
        } else {
          api.log.error(`Unknown event: ${name}`);
        }
      });
    } catch (e) {
      api.log.error(`Unable to set up handler for event ${name}: ${e}`);
    }
  }
}


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be deauthorized. We use this to determine if we should be
 * removing any events that we happen to be already listening for or not.
 *
 * This will get invoked for all authorizations, but we only care about the user
 * account, since EventSub works at the channel level and will work even if
 * there is no authorized bot account for chat purposes. */
async function handleDeauthEvent(api, info) {
  // If the event is a bot event, we don't care; we need the authorization of
  // the user's account to set up events in their channel.
  if (info.type !== 'user') {
    return;
  }

  api.log.info(`Shutting down Twitch event system`)
  await api.eventSub.listener.unlisten();
}

// =============================================================================


/* This sets up the Twitch EventSub integrations in the bot. This requires that
 * the configuration options for this have been set appropriately; otherwise
 * nothing will happen and the setup will silently do nothing.
 *
 * In action, this uses the Twurple libraries for EventSub to set up appropriate
 * listeners that allow Twitch to tell us when events happen for our channel.
 *
 * To work, this requires that the bot be authorized for a specific user's
 * channel; the events will be removed from the channel when the authorization
 * from the channel is revoked.
 *
 * This includes elements in the API structure that is passed in to include the
 * Twitch API endpoint that we need:
 *    - api.eventSub.listener
 *    - api.eventSub.uri
 *    - api.eventSub.port
 *    - api.eventSub.secret */
async function setup_twitch_eventsub(api) {
  // Set up the top level namespace that we will store our event API in. This
  // will store our event listener object when we create it, and it also stores
  // the static event config so that it can be easily accessed at runtime as
  // needed.
  api.eventSub = {
    listener: undefined,
    uri: api.config.get('events.notificationUri'),
    port: api.config.get('events.serverPort'),
    secret: api.config.get('events.signingSecret'),
  }

  // These values must be configured for the event system to listen for
  // events; if they're not present, then we should leave.
  if (api.eventSub.uri === '' || api.eventSub.port === '' || api.eventSub.secret === '') {
    api.log.warn('Twitch EventSub is turned off; configure events to enable it');
    return;
  }

  api.log.info(_(`Twitch EventSub enabled; delivering from https://${api.eventSub.uri}
                  to http://localhost:${api.eventSub.port}`));

  // Listen for events that tell us when the authorization state of the various
  // accounts has completed, which is our signal to either set up or revoke our
  // event listeners.
  api.nodecg.listenFor('auth-complete',   info => handleAuthEvent(api, info));
  api.nodecg.listenFor('deauth-complete', info => handleDeauthEvent(api, info));
}


// =============================================================================


module.exports = setup_twitch_eventsub;
