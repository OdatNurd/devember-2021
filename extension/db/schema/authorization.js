/* The schema that represents the access tokens that we have, as well as the
 * information we have that relates to knowing when they are likely to expire
 * and the refresh token that's needed to refresh them (if applicable). */
const AuthorizationSchema = {
  // Unique ID for this particular token
  id: 'increments',

  // For every token we store, we store what the name of that token is; the name
  // is used to distinguish what the token's going to be used for.
  name: {type : String, nullable: false },

  // For each token we store, we have a type (e.g. 'bearer'), the actual token
  // itself, the token to use to refresh it when it expires, the scopes that
  // were used the token was granted,k and the number of seconds until the token
  // is expired.
  type: { type: String, nullable: false },
  token: { type: String, nullable: false },
  refreshToken: { type: String, nullable: false },
  scopes: { type: Array, defaultsTo: [] },
  expiration: { type: Number, defaultsTo: 0 },
};

module.exports = {
  AuthorizationSchema
};
