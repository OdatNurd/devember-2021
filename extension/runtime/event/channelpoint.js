// =============================================================================


/* This is the event handler for knowing when a brand new channel point
 * redemption item has been added to the channel. The event that comes in
 * indicates the key details of the new redeemable item. */
function channel_point_add_new(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('Added a new channel point redemption to the channel');
}


// =============================================================================


/* This is the event handler for knowing when an existing channel point
 * redemption item is being removed from the channel. */
function channel_point_remove_existing(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('Removed a channel point redemption from the channel');
}


// =============================================================================


/* This is the event handler for knowing when the details of an existing channel
 * point redemption item have been updated in some manner. */
function channel_point_update_details(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('Update the details for a channel point redemption');
}


// =============================================================================


/* This is the event handler for knowing when someone is redeeming a channel
 * point redemption item.
 *
 * These are only triggered for custom redemption items, never for items that
 * are built into twitch.
 *
 * This handler defers the incoming redemption to the list of configured items
 * for channel point redeems, to allow for redemptions to be fully dynamic. */
function channel_point_redemption(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('Redeeming a channel point item in the channel');
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
