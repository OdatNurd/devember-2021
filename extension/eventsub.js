// =============================================================================


const { getUserInfo } = require('./auth');
const { dedent: _ } = require('./utils');
const { twitch_event_list } = require('./event_list');

const { ReverseProxyAdapter, ConnectionAdapter, EventSubListener } = require('@twurple/eventsub');


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be authorized. We use this to determine if it's ok for
 * us to set up Twitch events.
 *
 * This will get invoked for all authorizations, but we only care about the user
 * account, since EventSub works at the channel level and will work even if
 * there is no authorized bot account for chat purposes. */
async function handleAuthEvent(api, info) {
  // If the event is a bot event, we don't care; we only need the authorization
  // of the user's account to set up events in their channel.
  if (info.type !== 'user') {
    return;
  }

  // Set up an EventSub listener that we will use to listen for all of our
  // incoming events.
  //
  // To set up an event, we need to make a request to Twitch to turn it on,
  // and then respond to a request that verifies that we have access to the URI
  // we provide.
  //
  // The EventSubListener does that for us, and will also first check Twitch to
  // see if we've previously set up a listener or not; if so, it don't need to
  // try to add it again.
  api.eventSub.listener = new EventSubListener({
    apiClient: api.twitch,
    secret: api.eventSub.secret,
    adapter: new ReverseProxyAdapter({hostName: api.eventSub.uri, port: api.eventSub.port}),
  });

  // The EventSubListener starts an internal web server on the port that we
  // configured to listen for the incoming events from Twitch. It's also
  // possible via Twurple MiddleWare to use this directly with an existing
  // express server if desired.
  //
  // This sets the server listening for incoming events that have been
  // registered with it. This needs to be done first because setting up a
  // listener for the first time requires Twitch to send us a verification that
  // we need to respond to.
  api.log.info(`Setting up for incoming Twitch events`);
  await api.eventSub.listener.listen();

  // The twitch_event_list contains a list of all of the Twitch EventSub events
  // that we want to handle, with each entry indicating our internal name for
  // each event and the method in the EventSubListener class that is used to set
  // up a listener for that event.
  //
  // To set up all of the listeners, we loop over all of the items and call the
  // appropriate method to set things up.
  //
  // The handler for every event is identical and responds to the event by
  // looking up the event name in our internal event handler list and invoking
  // the defined function if it's found.
  //
  // Since each setup requires a potentially costly series of web requests to
  // finalize, we let them all run simultaneously and wait for them all to
  // finish.
  Promise.all(twitch_event_list.map(async ({internalName, setupHandler}) => {
    api.log.info(`Listening for event: ${internalName}`);
    try {
      // The EventSubListener object contains a series of methods that allow you
      // to listen for specific incoming events. Look that up by indexing the
      // object directly.
      await api.eventSub.listener[setupHandler](info.userId, event => {
        api.log.info(`received event: ${internalName}`);
        const eventHandler = api.events.find(internalName);
        if (eventHandler !== null) {
          eventHandler.execute(api, internalName, event);
        } else {
          api.log.error(`unable to find handler for event: ${internalName}`);
        }
      });
    } catch (e) {
      api.log.error(`Unable to set up handler for event ${internalName}: ${e}`);
    }
  }));
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
