
// =============================================================================


const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');


// =============================================================================


// Given a query dictionary and a list of valid fields for that query,
// return back a filtered copy of the object containing just fields that
// are valid and no others.
function queryFilter(query, fields) {
  return Object.keys(query)
    .filter(key => fields.indexOf(key) !== -1)
    .reduce((res, key) => (res[key] = query[key], res), {});
}


// =============================================================================


// Transmit the file for the provided item using the given response object. The
// file should be rooted within the runtimePath provided and the item should
// have a name relative to that path.
//
// If this fails, a 404 error will be generated instead.
function sendItemFile(api, runtimePath, item, res) {
  const options = {
    root: runtimePath,
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true,
      'x-item-filename': item.sourceFile
    }
  };

  // TODO: This should fail if the file doesn't exist; does that happen?
  res.sendFile(item.sourceFile, options, err => {
    if (err) {
      api.log.error(`Error: ${err}`);
      res.status(404).send('Error sending file');
    } else {
      api.log.info('Transmitted:', item.sourceFile);
    }
  });
}


// =============================================================================


// Write new file content to disk for the item specified using the given
// response object. The file will be writtem rooted into the given runtimePath.
//
// The response written back will contain JSON that indicates if the operation
// This will catch errors and response back wi
function storeItemFile(api, runtimePath, item, fileContent, res) {
  try {
    fs.writeFileSync(path.join(runtimePath, item.sourceFile), fileContent);
    res.json({ filename: item.sourceFile, success: true });
  } catch (error) {
    res.json({ filename: item.sourceFile, success: false, reason: error });
  }
}


// =============================================================================


/* This sets up the Twitch API that is used to make all of our requests. This
 * is done using an App token, which is a token that is not associated with
 * any particular user at all.
 *
 * Some requests will require gathering information for or taking an action for
 * a particular user. For such requests, it's enough that at some point in the
 * past that user has authorized this application to do such things.
 *
 * That level of authorization is what happens in the Auth code when you set up
 * the bot account and the channel that the bot will run inside of.
 *
 * This includes elements in the API structure that is passed in to include the
 * Twitch API endpoint that we need:
 *    - api.twitch */
async function setup_file_server(api) {
  api.log.info('Setting up the web file API');

  // Create an express router for our runtime data access
  const runtime = api.nodecg.Router();

  // For our routes that are being used to ship data back to us from the front
  // end, this is used to parse out the incoming body as text instead of as
  // JSON, which is the default.
  const parser = bodyParser.raw({ type: 'text/javascript' });

  // All of the code here requires access to the data models in order to access
  // the database; this pre-fetches them all before we enter.
  const commands = api.db.getModel('commands');


  // One of the things the API can do is serve up and receive changes for
  // files from the runtime of the bot, which implement the items above. This
  // sets the path for where those files are rooted.
  const runtimePath = path.join(api.baseDir, '/extension/runtime');

  // GET and PUT information about each of the core components:
  //
  // These can be hit using GET or POST and will allow you to find all of the
  // items of a particular type (GET) or create a new one based on arguments
  // (POST), which would return to you the ID of the newly created item.
  // When using POST to create a new item, an associated file is created on
  // the back end using an appropriate stub; using the API below to update
  // the content with something more specific.
  //
  // /commands                  <- get whole list, post to add a new one (return :id)
  //
  // These can be hit with PUT to specifically update a particular item
  // with new information
  //
  // /commands/:id              <- put to update specifics
  //
  // These can be with GET or PUT to fetch the contents of a file associated
  // with a particular item (GET) or store changes back (PUT).
  //
  // /files/commands/:id        <- get the file, put changes back

  // --------------------------------------------------------------------------
  // GET information on existing commands

  // The items here allow for getting the list of commands. This allows you to
  // specify some of the fields in the related underlying entry in order to find
  // items that match that  specific criteria.

  // Currently this does not support comparisons, only equality.
  // --------------------------------------------------------------------------

  runtime.get('/commands', async (req, res) => {
    api.log.info(JSON.stringify(req.query));
    const query = queryFilter(req.query, ['id', 'name', 'enabled', 'sourceFile',
                                          'core', 'hidden', 'userLevel']);
    const result = await commands.find(query);

    api.log.info(`GET /commands -> ${result.length} for ${JSON.stringify(query)}`);
    res.json(result);
  });

  //--------------------------------------------------------------------------
  // GET the file content of the file that implements commands
  //
  // This returns the contents of the file that implements the item with the
  // specific ID. The filename
  //--------------------------------------------------------------------------

  runtime.get('/files/commands/:id', async (req, res) => {
    api.log.info(`GET /files/commands/${req.params.id}`);
    const item = await commands.findOne({ id: req.params.id });

    sendItemFile(api, runtimePath, item, res);
  });

  //--------------------------------------------------------------------------
  // PUT new file content into the files that implements commands
  //
  // This returns a message that indicates if the operation was or a
  // failure.
  //--------------------------------------------------------------------------

  runtime.put('/files/commands/:id', parser, async (req, res) => {
    api.log.info(`PUT /files/commands/${req.params.id}`);
    const item = await commands.findOne({ id: req.params.id });

    storeItemFile(api, runtimePath, item, req.body, res);
  });

  //--------------------------------------------------------------------------
  // POST a request to reload a specific command
  //--------------------------------------------------------------------------

  runtime.post('/files/commands/:id/reload', async (req, res) => {
    api.log.info(`POST /files/commands/${req.params.id}/reload`);
    const item = await commands.findOne({ id: req.params.id });

    // Reload based on the name of the item
    const result = await api.commands.reload([item.name], true);

    switch (result) {
      case true:
        api.nodecg.sendMessage('set-cmd-log', 'The last reload command completed successfully');
        return;

      case false:
        api.nodecg.sendMessage('set-cmd-log', 'The last reload command did not find anything to reload');
        return;
    }

    // If we get here, the reload resulted in a failure of some sort; turn the
    // error objects into a block of text and transmit it.
    api.nodecg.sendMessage('set-cmd-log', result.map(err => `${err}\n${err.stack}`).join("\n"))
  });

  api.nodecg.mount(runtime);
}


// =============================================================================


module.exports = setup_file_server;
