// =============================================================================


/* This associates a list of Twitch events with the Twurple EventSubListener
 * endpoint that knows how to handle them and the name we know them by
 * internally when they are dispatched.
 *
 * Each event is annotated with a comment that contains an example Twitch CLI
 * invocation that allows you to simulate that event for testing purposes.
 *
 * To use these, install the Twitch CLI and make sure that there are environment
 * variables TWITCHBOT_SIGNING_SECRET, TWITCH_USERID and TWITCH_URI are set,
 * which specify the signing secret you're using for the bot, and the userID of
 * your channel and the reverse proxy URI you're using respectively.
 *
 * The Twitch CLI client can be found at:
 *     https://github.com/twitchdev/twitch-cli */
const twitch_event_list = [
  {
    // Moderator privileges were added to a user on a specified channel.
    //
    // To test this event:
    //     twitch event trigger add-moderator -s channel.moderator.add.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.moderator.add.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelmoderatoradd
    twitchName: 'channel.moderator.add',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'moderator_add',
    internalAliases: ['moderator_remove'],

    // The internal source file that contains the handler for this event
    sourceFile: "event/moderate.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'moderation:read',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelModeratorAddEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelModeratorEvent.html
    twurpleEventClass: 'EventSubChannelModeratorEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getUser',
    ]
  },
  {
    // Moderator privileges were removed from a user on a specified channel.
    //
    // To test this event:
    //     twitch event trigger remove-moderator -s channel.moderator.remove.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.moderator.remove.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelmoderatorremove
    twitchName: 'channel.moderator.remove',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'moderator_remove',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/moderate.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'moderation:read',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelModeratorRemoveEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelModeratorEvent.html
    twurpleEventClass: 'EventSubChannelModeratorEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getUser',
    ]
  },


  // ===========================================================================


  {
    // A viewer is banned from the specified channel.
    //
    // To test this event:
    //     twitch event trigger ban -s channel.ban.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.ban.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelban
    twitchName: 'channel.ban',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'ban',
    internalAliases: ['unban'],

    // The internal source file that contains the handler for this event
    sourceFile: "event/ban.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:moderate',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelBanEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelBanEvent.html
    twurpleEventClass: 'EventSubChannelBanEvent',
    fields: [
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
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getModerator',
      '[A] getUser',
    ]
  },
  {
    // A viewer is unbanned from the specified channel.
    //
    // To test this event:
    //     twitch event trigger unban -s channel.unban.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.unban.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelunban
    twitchName: 'channel.unban',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'unban',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/ban.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:moderate',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelUnbanEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelBanEvent.html
    twurpleEventClass: 'EventSubChannelBanEvent',
    fields: [
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
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getModerator',
      '[A] getUser',
    ]
  },


  // ===========================================================================


  {
    // A Hype Train begins on the specified channel.
    //
    // To test this event:
    //     twitch event trigger hype-train-begin -s channel.hype_train.begin.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.hype_train.begin.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelhype_trainbegin
    twitchName: 'channel.hype_train.begin',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'hypeBegin',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/hypetrain.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:hype_train',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelHypeTrainBeginEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelHypeTrainBeginEvent.html
    twurpleEventClass: 'EventSubChannelHypeTrainBeginEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'expiryDate',
      'goal',
      'id',
      'lastContribution',
      'progress',
      'startDate',
      'topContributors',
      'total',
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },
  {
    // A Hype Train makes progress on the specified channel.
    //
    // To test this event:
    //     twitch event trigger hype-train-progress -s channel.hype_train.progress.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.hype_train.progress.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelhype_trainprogress
    twitchName: 'channel.hype_train.progress',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'hypeUpdate',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/hypetrain.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:hype_train',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelHypeTrainProgressEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelHypeTrainProgressEvent.html
    twurpleEventClass: 'EventSubChannelHypeTrainProgressEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'expiryDate',
      'goal',
      'id',
      'lastContribution',
      'level',
      'progress',
      'startDate',
      'topContributors',
      'total',
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },
  {
    // A Hype Train ends on the specified channel.
    //
    // To test this event:
    //     twitch event trigger hype-train-end -s channel.hype_train.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.hype_train.end.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelhype_trainend
    twitchName: 'channel.hype_train.end',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'hypeEnd',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/hypetrain.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:hype_train',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelHypeTrainEndEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelHypeTrainEndEvent.html
    twurpleEventClass: 'EventSubChannelHypeTrainEndEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'cooldownEndDate',
      'endDate',
      'id',
      'level',
      'startDate',
      'topContributors',
      'total',
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },


  // ===========================================================================


  {
    // A user cheers on the specified channel.
    //
    // To test this event:
    //     twitch event trigger cheer -s channel.cheer.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.cheer.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelcheer
    twitchName: 'channel.cheer',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'cheer',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/bits.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'bits:read',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelCheerEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelCheerEvent.html
    twurpleEventClass: 'EventSubChannelCheerEvent',
    fields: [
      'bits',
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'isAnonymous',
      'message',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getUser',
    ]
  },


  // ===========================================================================


  {
    // A specified channel receives a follow.
    //
    // To test this event:
    //     twitch event trigger follow -s channel.follow.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.follow.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelfollow
    twitchName: 'channel.follow',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'follow',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/follow_sub.js",

    // The scope that must be authorized on the app token to receive this event;
    // this event requires no special scopes to be requested.
    scope: undefined,

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelFollowEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelFollowEvent.html
    twurpleEventClass: 'EventSubChannelFollowEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'followDate',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getUser',
    ]
  },
  {
    // A notification when a specified channel receives a subscriber. This does
    // not include resubscribes.
    //
    // To test this event:
    //     twitch event trigger subscribe -s channel.subscribe.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscribe.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelsubscribe
    twitchName: 'channel.subscribe',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'subscribe',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/follow_sub.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:subscriptions',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelSubscriptionEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelSubscriptionEvent.html
    twurpleEventClass: 'EventSubChannelSubscriptionEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'isGift',
      'tier',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getUser',
    ]
  },
  {
    // A notification when a subscription to the specified channel ends.
    //
    // To test this event:
    //     twitch event trigger unsubscribe -s channel.subscription.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscription.end.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelsubscriptionend
    twitchName: 'channel.subscription.end',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'unsubscribe',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/follow_sub.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:subscriptions',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelSubscriptionEndEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelSubscriptionEndEvent.html
    twurpleEventClass: 'EventSubChannelSubscriptionEndEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'isGift',
      'tier',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getUser',
    ]
  },
  {
    // A notification when a viewer gives a gift subscription to one or more
    // users in the specified channel.
    //
    // To test this event:
    //     twitch event trigger gift -s channel.subscription.gift.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscription.gift.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelsubscriptiongift
    twitchName: 'channel.subscription.gift',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'gift',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/follow_sub.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:subscriptions',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelSubscriptionGiftEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelSubscriptionGiftEvent.html
    twurpleEventClass: 'EventSubChannelSubscriptionGiftEvent',
    fields: [
      'amount',
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'cumulativeAmount',
      'gifterDisplayName',
      'gifterId',
      'gifterName',
      'isAnonymous',
      'tier',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getGifter',
    ]
  },
  {
    // A notification when a user sends a resubscription chat message in a
    // specific channel.
    //
    // To test this event:
    //     twitch event trigger subscribe-message -s channel.subscription.message.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.subscription.message.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelsubscriptionmessage
    twitchName: 'channel.subscription.message',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'subcribe_message',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/follow_sub.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:subscriptions',

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelSubscriptionMessageEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelSubscriptionMessageEvent.html
    twurpleEventClass: 'EventSubChannelSubscriptionMessageEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'cumulativeMonths',
      'durationMonths',
      'messageText',
      'streakMonths',
      'tier',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getUser',
      'parseEmotes',
    ]
  },


  // ===========================================================================


  {
    // The specified broadcaster starts a stream.
    //
    // To test this event:
    //     twitch event trigger streamup -s stream.online.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/stream.online.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#streamonline
    twitchName: 'stream.online',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'streamOnline',
    internalAliases: ['streamOffline'],

    // The internal source file that contains the handler for this event
    sourceFile: "event/streamstatus.js",

    // The scope that must be authorized on the app token to receive this event;
    // this event requires no special scopes to be requested.
    scope: undefined,

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToStreamOnlineEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubStreamOnlineEvent.html
    twurpleEventClass: 'EventSubStreamOnlineEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'startDate',
      'streamType',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getStream',
    ]
  },
  {
    // The specified broadcaster stops a stream.
    //
    // To test this event:
    //     twitch event trigger streamdown -s stream.offline.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/stream.offline.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#streamoffline
    twitchName: 'stream.offline',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'streamOffline',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/streamstatus.js",

    // The scope that must be authorized on the app token to receive this event;
    // this event requires no special scopes to be requested.
    scope: undefined,

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToStreamOfflineEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubStreamOfflineEvent.html
    twurpleEventClass: 'EventSubStreamOfflineEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'startDate',
      'streamType',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getStream',
    ]
  },
  {
    // A broadcaster updates their channel properties e.g., category, title,
    // mature flag, broadcast, or language.
    //
    // To test this event:
    //     twitch event trigger stream-change -s channel.update.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.update.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelupdate
    twitchName: 'channel.update',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'update',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/streamstatus.js",

    // The scope that must be authorized on the app token to receive this event;
    // this event requires no special scopes to be requested.
    scope: undefined,

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelUpdateEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelUpdateEvent.html
    twurpleEventClass: 'EventSubChannelUpdateEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'categoryId',
      'categoryName',
      'isMature',
      'streamLanguage',
      'streamTitle'   ,
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getGame',
    ]
  },


  // ===========================================================================


  {
    // A broadcaster raids another broadcaster’s channel.
    //
    // To test this event:
    //     twitch event trigger raid -s channel.raid.to.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.raid.to.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelraid
    twitchName: 'channel.raid',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'raidIn',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/raid.js",

    // The scope that must be authorized on the app token to receive this event;
    // this event requires no special scopes to be requested.
    scope: undefined,

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelRaidEventsTo',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRaidEvent.html
    twurpleEventClass: 'EventSubChannelRaidEvent',
    fields: [
      'raidedBroadcasterDisplayName',
      'raidedBroadcasterId',
      'raidedBroadcasterName',
      'raidingBroadcasterDisplayName',
      'raidingBroadcasterId',
      'raidingBroadcasterName',
      'viewers',
    ],
    methods:  [
      '[A] getRaidedBroadcaster',
      '[A] getRaidingBroadcaster',
    ]
  },
  {
    // A broadcaster raids another broadcaster’s channel.
    //
    // To test this event:
    //     twitch event trigger raid -s channel.raid.from.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.raid.from.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelraid
    twitchName: 'channel.raid',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'raidOut',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/raid.js",

    // The scope that must be authorized on the app token to receive this event;
    // this event requires no special scopes to be requested.
    scope: undefined,

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelRaidEventsFrom',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRaidEvent.html
    twurpleEventClass: 'EventSubChannelRaidEvent',
    fields: [
      'raidedBroadcasterDisplayName',
      'raidedBroadcasterId',
      'raidedBroadcasterName',
      'raidingBroadcasterDisplayName',
      'raidingBroadcasterId',
      'raidingBroadcasterName',
      'viewers',
    ],
    methods:  [
      '[A] getRaidedBroadcaster',
      '[A] getRaidingBroadcaster',
    ]
  },


  // ===========================================================================


  {
    // A custom channel points reward has been created for the specified channel.
    //
    // To test this event:
    //     twitch event trigger add-reward -s channel.channel_points_custom_reward.add.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward.add.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelchannel_points_custom_rewardadd
    twitchName: 'channel.channel_points_custom_reward.add',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'channelpoint_add',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/channelpoint.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:redemptions', //  (or channel:manage:redemptions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelRewardAddEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRewardEvent.html
    twurpleEventClass: 'EventSubChannelRewardEvent',
    fields: [
      'autoApproved',
      'backgroundColor',
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'cooldownExpiryDate',
      'cost',
      'globalCooldown',
      'id',
      'isEnabled',
      'isInStock',
      'isPaused',
      'maxRedemptionsPerStream',
      'maxRedemptionsPerUserPerStream',
      'prompt',
      'redemptionsThisStream',
      'title',
      'userInputRequired',
    ],
    methods:  [
      '[A] getBroadcaster',
      'getImageUrl',
    ]
  },
  {
    // A custom channel points reward has been removed from the specified channel.
    //
    // To test this event:
    //     twitch event trigger update-reward -s channel.channel_points_custom_reward.remove.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward.remove.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelchannel_points_custom_rewardremove
    twitchName: 'channel.channel_points_custom_reward.remove',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'channelpoint_remove',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/channelpoint.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:redemptions', //  (or channel:manage:redemptions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelRewardRemoveEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRewardEvent.html
    twurpleEventClass: 'EventSubChannelRewardEvent',
    fields: [
      'autoApproved',
      'backgroundColor',
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'cooldownExpiryDate',
      'cost',
      'globalCooldown',
      'id',
      'isEnabled',
      'isInStock',
      'isPaused',
      'maxRedemptionsPerStream',
      'maxRedemptionsPerUserPerStream',
      'prompt',
      'redemptionsThisStream',
      'title',
      'userInputRequired',
    ],
    methods:  [
      '[A] getBroadcaster',
      'getImageUrl',
    ]
  },
  {
    // A custom channel points reward has been updated for the specified channel.
    //
    // To test this event:
    //     twitch event trigger update-reward -s channel.channel_points_custom_reward.update.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward.update.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelchannel_points_custom_rewardupdate
    twitchName: 'channel.channel_points_custom_reward.update',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'channelpoint_update',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/channelpoint.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:redemptions', //  (or channel:manage:redemptions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelRewardUpdateEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRewardEvent.html
    twurpleEventClass: 'EventSubChannelRewardEvent',
    fields: [
      'autoApproved',
      'backgroundColor',
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'cooldownExpiryDate',
      'cost',
      'globalCooldown',
      'id',
      'isEnabled',
      'isInStock',
      'isPaused',
      'maxRedemptionsPerStream',
      'maxRedemptionsPerUserPerStream',
      'prompt',
      'redemptionsThisStream',
      'title',
      'userInputRequired',
    ],
    methods:  [
      '[A] getBroadcaster',
      'getImageUrl',
    ]
  },
  {
    // A viewer has redeemed a custom channel points reward on the specified channel.
    //
    // To test this event:
    //     twitch event trigger add-redemption -s channel.channel_points_custom_reward_redemption.add.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.channel_points_custom_reward_redemption.add.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelchannel_points_custom_reward_redemptionadd
    twitchName: 'channel.channel_points_custom_reward_redemption.add',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'channelpoint_redeem',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/channelpoint.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:redemptions', //  (or channel:manage:redemptions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelRedemptionAddEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelRedemptionAddEvent.html
    twurpleEventClass: 'EventSubChannelRedemptionAddEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'id',
      'input',
      'redeemedAt',
      'rewardCost',
      'rewardId',
      'rewardPrompt',
      'rewardTitle',
      'status',
      'userDisplayName',
      'userId',
      'userName',
    ],
    methods:  [
      '[A] getBroadcaster',
      '[A] getReward',
      '[A] getUser',
      '[A] updateStatus',
    ]
  },


  // ===========================================================================


  {
    // A poll started on a specified channel.
    //
    // To test this event:
    //     twitch event trigger poll-begin -s channel.poll.begin.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.poll.begin.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpollbegin
    twitchName: 'channel.poll.begin',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'pollBegin',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/polling.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:polls', // (or channel:manage:polls)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelPollBeginEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPollBeginEvent.html
    twurpleEventClass: 'EventSubChannelPollBeginEvent',
    fields: [
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
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },
  {
    // Users respond to a poll on a specified channel.
    //
    // To test this event:
    //     twitch event trigger poll-progress -s channel.poll.progress.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.poll.progress.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpollprogress
    twitchName: 'channel.poll.progress',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'pollUpdate',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/polling.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:polls', // (or channel:manage:polls)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelPollProgressEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPollProgressEvent.html
    twurpleEventClass: 'EventSubChannelPollProgressEvent',
    fields: [
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
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },
  {
    // A poll ended on a specified channel.
    //
    // To test this event:
    //     twitch event trigger poll-end -s channel.poll.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.poll.end.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpollend
    twitchName: 'channel.poll.end',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'pollEnd',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/polling.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:polls', // (or channel:manage:polls)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelPollEndEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPollEndEvent.html
    twurpleEventClass: 'EventSubChannelPollEndEvent',
    fields: [
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
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },


  // ===========================================================================


  {
    // A Prediction started on a specified channel.
    //
    // To test this event:
    //     twitch event trigger prediction-begin -s channel.prediction.begin.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.begin.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionbegin
    twitchName: 'channel.prediction.begin',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'predictionBegin',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/predictions.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:predictions', // (or channel:manage:predictions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelPredictionBeginEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionBeginEvent.html
    twurpleEventClass: 'EventSubChannelPredictionBeginEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'id',
      'lockDate',
      'outcomes',
      'startDate',
      'title',
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },
  {
    // Users participated in a Prediction on a specified channel.
    //
    // To test this event:
    //     twitch event trigger prediction-progress -s channel.prediction.progress.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.progress.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionprogress
    twitchName: 'channel.prediction.progress',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'predictionUpdate',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/predictions.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:predictions', // (or channel:manage:predictions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelPredictionProgressEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionProgressEvent.html
    twurpleEventClass: 'EventSubChannelPredictionProgressEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'id',
      'lockDate',
      'outcomes',
      'startDate',
      'title',
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },
  {
    // A Prediction was locked on a specified channel.
    //
    // To test this event:
    //     twitch event trigger prediction-lock -s channel.prediction.lock.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.lock.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionlock
    twitchName: 'channel.prediction.lock',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'predictionLock',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/predictions.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:predictions', // (or channel:manage:predictions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelPredictionLockEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionLockEvent.html
    twurpleEventClass: 'EventSubChannelPredictionLockEvent',
    fields: [
      'broadcasterDisplayName',
      'broadcasterId',
      'broadcasterName',
      'id',
      'lockDate',
      'outcomes',
      'startDate',
      'title',
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  },
  {
    // A Prediction ended on a specified channel.
    //
    // To test this event:
    //     twitch event trigger prediction-end -s channel.prediction.end.$TWITCH_USERID.$TWITCHBOT_SIGNING_SECRET -F https://$TWITCH_URI/event/channel.prediction.end.$TWITCH_USERID
    //
    // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types#channelpredictionend
    twitchName: 'channel.prediction.end',

    // Our name for this event internally; this is the handler that will be
    // invoked when this event is received.
    internalName: 'predictionEnd',
    internalAliases: [],

    // The internal source file that contains the handler for this event
    sourceFile: "event/predictions.js",

    // The scope that must be authorized on the app token to receive this event
    scope: 'channel:read:predictions', // (or channel:manage:predictions)

    // The EventSubListener method that sets up a listener for this event
    setupHandler: 'subscribeToChannelPredictionEndEvents',

    // The Twurple class that wraps the data provided by this event.
    //  - https://twurple.js.org/reference/eventsub/classes/EventSubChannelPredictionEndEvent.html
    twurpleEventClass: 'EventSubChannelPredictionEndEvent',
    fields: [
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
    ],
    methods:  [
      '[A] getBroadcaster',
    ]
  }
];

/* Create as simple lookup table that allows us to associate our internal
 * event names with the object that represents them, so that when we look up
 * events at runtime we don't need to do linear searches. */
const event_lookup = {};
twitch_event_list.forEach(event => event_lookup[event.internalName] = event);


// =============================================================================


/* This is useful for displaying information about incoming events that are
 * delivered to the event system via the Twurple libraries. Each such event has
 * a list of properies (fields) that comes from Twitch, as well as a potential
 * set of methods that can be invoked to get extra information.
 *
 * In use, this will output informtion on the named event, and display the
 * values of the event fields as well as the list of methods. The methods are
 * not actually invoked here, since they could conceivably return anything. */
function displayEventDetails(api, name, event) {
  const evtRecord = event_lookup[name];
  if (evtRecord === undefined) {
    api.log.warn(`unable to find information on internal event ${name}`);
    return;
  }

  const fields = evtRecord.fields;
  const methods = evtRecord.methods;

  api.log.info(`=== event: ${name} ===`);
  fields.forEach(field => api.log.info(`  \`- ${field}: ${event[field]}`));
  if (methods !== undefined && methods.length !== 0) {
    api.log.info(`=== event methods ==`)
    api.log.info(`  ${methods.join(', ')}`)
  }

  api.log.info(`======================`);
}


// =============================================================================




module.exports = {
  displayEventDetails,
  twitch_event_list
};