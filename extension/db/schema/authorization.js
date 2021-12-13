'use strict';

// =============================================================================

/* This schema represents the token table, which is used to persist access
 * tokens after they're granted to us for any tokens that we want to keep around
 * for longer than just ephemeral purposes. Each record contains information
 * about the token such as when it will expire, the scopes associated and of
 * course the token itself.
 *
 * The extra field name is not a standard token field, and is used as the key
 * to find the token you want; as each token is created it is associated with
 * a given name as provided by the code. */
const TokenSchema = {
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
  obtained: { type: Number, defaultsTo: 0 },
  expiration: { type: Number, defaultsTo: 0 },
};

// =============================================================================

module.exports = {
  TokenSchema
};
