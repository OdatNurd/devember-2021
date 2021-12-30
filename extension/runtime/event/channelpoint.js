// =============================================================================


const { displayEventDetails } = require('../../event_list');
const { addNewCustomRedeemHandler, removeOldCustomRedeemHandler,
        renameExistingRedeemHandler } = require('../../point_redeem');


// =============================================================================


/* This event handler tracks events that tells you when a brand new custom
 * channel point redemption has been added to the channel. The event details
 * provide information about the new redeem that has been added. */
function channel_point_add_new(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);

  // Dispatch this record to the redeem handler, which will update the database
  // to include a new stub redeem entry.
  addNewCustomRedeemHandler(api, event.broadcasterId, event.title, event.id);
}


// =============================================================================


/* This event handler tracks events that tells you when an existing custom
 * channel point redemption has been removed from the channel. The event details
 * provide information about the redeem that has been removed. */
function channel_point_remove_existing(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);

  // Dispatch this record to the redeem handler, which will update the database
  // and runtime to remove this redeem from consideration.
  removeOldCustomRedeemHandler(api, event.broadcasterId, event.title, event.id);
}


// =============================================================================


/* This event handler tracks events that tells you when an existing custom
 * channel point redemption has had its details updated. The event details
 * provide information about the redeem that has been updated and what the new
 * redeem information is. */
function channel_point_update_details(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);

  // Dispatch this record to the redeem handler, which will update the database
  // and runtime if the title of the redeem has changed from what it used to be.
  renameExistingRedeemHandler(api, event.broadcasterId, event.title, event.id);
}


// =============================================================================


/* This event handler tracks events that tells you when an custom channel point
 * redemptions in the channel have actually been redeemed by users in the
 * channel. The event details provide information about the redeem that has been
 * redeemed as well as who has done the redemption.
 *
 * Events of of this type are only triggered for custom redemption items,
 * never for items that are built into twitch. */
function channel_point_redemption(api, name, event) {
  // Display the properties of the event, for debug purposes.
  // displayEventDetails(api, name, event);

  // Check in the list of known channel point redemptions to find an entry that
  // matches the channel point reward id. The main name for each item is the
  // human readable title, each has an alias on the unique reward id.
  const redeemHandler = api.channelpoints.find(event.rewardId);
  if (redeemHandler !== null) {
    redeemHandler.execute(api, event);
  } else {
    api.log.warn(`unknown channel point redeem: ${event.rewardId} (${event.rewardTitle})`);
  }
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      channelpoint_add: channel_point_add_new,
      channelpoint_remove: channel_point_remove_existing,
      channelpoint_update: channel_point_update_details,
      channelpoint_redeem: channel_point_redemption
    };
  },

  unload: async api => {
  }
};
