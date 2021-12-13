'use strict';


// =============================================================================

const trilogy = require('trilogy');
const path = require('path');

const { TokenSchema, UserSchema } = require('./schema/');


// =============================================================================


/* The back end code uses an SQLite database that is accessed via Trilogy to
 * make it appear to be more like MongoDB and other DB solutions.  This setup
 * routine sets up the database and makes sure that the appropriate tables are
 * present.
 *
 * SQLite is used here because it is user friendly and zero setup is required on
 * the user's end.
 *
 * Data stored in the DB is meant to be dynamic in nature and the sort of data
 * that might change at runtime. This includes some configuration data, which
 * is not covered by the main config code since that is meant to be a static
 * configuration not changed once things start up.
 *
 * This includes elements in the API structure that is passed in to include the
 * database endpoints that we need:
 *    - api.db */
async function setup_db(api) {
  // Connect to the database; this will create the database file automagically
  // if it doesn't already exist.
  const db_file = path.resolve(api.baseDir, 'twitchbot.db');
  const db = trilogy.connect(db_file);

  // Trilogy works on the basis of "models" that map an expected JSON data
  // structure into tables on the back end of the code. This ensures that all
  // such models/tables are configured and ready to go at runtime, since this
  // is an async operation.
  const modelList = [
    db.model('tokens', TokenSchema),
    db.model('users', UserSchema),
  ];
  await Promise.all(modelList);

  // Store the database handle in the API.
  api.db = db;
}


// =============================================================================


module.exports = setup_db;