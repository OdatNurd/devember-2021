const trilogy = require('trilogy');
const path = require('path');

const { AuthorizationSchema } = require('./schema/');


/* Initialize the Trilogy database system, storing a handle to the db in the
 * passed in API.
 *
 * The database uses SQLite; if it does not exist, a new file will be created
 * automatically. */
async function setup_db(api) {
  // Connect to the database; we keep the file in the root of the bundle.
  const db_file = path.resolve(api.baseDir, 'twitchbot.db');
  const db = trilogy.connect(db_file);

  const modelList = [
    db.model('authorize', AuthorizationSchema),
  ];
  await Promise.all(modelList);

  // Store the database handle in the API for anything that would like it.
  api.db = db;
}

module.exports = setup_db;