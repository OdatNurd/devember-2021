
// =============================================================================


/* The schema that represents the users that regularly frequent the channel;
 * these users have extra permissions to execute commands that fall between the
 * general user and people that are subs or VIP's, allowing for access to
 * trusted people without requiring them to buy subs, etc. */
const RegularUserSchema = {
  // Unique ID for this particular regular
  id: 'increments',

  // The id that uniquely identifies this particular regular. Although these
  // look like numbers, they are strings and should be handled as such.
  userId: { type: String, unique: true, nullable: false },

  // The user name and display name of this regular; the first is the name of
  // their account and the second is the display version. Both of these values
  // are captured at the time that the regular is added and since they can be
  // changed by the user, could conceivably change.
  //
  // As such, don't take as gospel the names shown here.
  userName: { type: String, unique: true, nullable: false },
  displayName: { type: String, unique: true, nullable: false }
};


// =============================================================================


module.exports = {
  RegularUserSchema
};
