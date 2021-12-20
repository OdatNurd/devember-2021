'use strict';


// =============================================================================


const loadModule = require('import-fresh');
const micromatch = require('micromatch');


// =============================================================================


/* This class maintains a mapping between some textual name for some code path
 * in the bot and the handler function that is responsible for executing it,
 * such as the handler associated with a command name, or the handler for an
 * event.
 *
 * The map is given the name of a database collection and can load all items
 * from that model, wrap them in a specific object, and provide the ability to
 * look up functions based on the names.
 *
 * A key aspect of this is that the items from the database contain the name of
 * implementation files that should be loaded in order for this to work.
 *
 * The collection provided must contain the following key fields:
 *     - id : unique numeric ID for this item
 *     - name : unique textual name for this item
 *     - aliases : array of optional alias names (can be empty)
 *     - sourceFile : The source file that contains the handler for this
 *
 * In use the class is given the name of a collection, from which it loads all
 * records, loads associated files, and populates an internal searchable list
 * that maps the names of the items with the code gathered from the source file
 * loaded. It can also reload some or all of the files, replacing implementation
 * details on the fly.
 *
 * The source files loaded are expected to export an object which contains two
 * functions, load(api) and unload(api). When the file is loaded, load() is
 * invoked, and if the file is reloaded or unloaded, unload() is called. The
 * API provided allows the code to do setup.
 *
 * The load() function so exported is expected to return an object that maps
 * the names of items (e.g. commands) with the functions that handle them. The
 * names in the list would coincide with the names from the database.
 *
 * Users of this class may have further implementation requirements, such as
 * what the functions expect as arguments. That is defined by their usage of the
 * class. */
class CodeHandlerMap {
    api;
    modelName;
    dataModel;
    factory;
    handlerList;
    sourceMap;

    /* When the handler map is constructed, it's given an API handle that will
     * be passed to the load() and unload() methods of loaded files, as well as
     * the name of the model in the database that holds the items.
     *
     * We also are passed a function which, when called with a database record,
     * will return a constructed object that can be placed into the the internal
     * list, mapped to the name of the item for easy lookup. */
    constructor(api, modelName, factory) {
      this.api = api;
      this.modelName = modelName;
      this.factory = factory;

      // Get the data model for the model name we were given; we will use this
      // to pluck data out of the database.
      this.dataModel = api.db.getModel(modelName);

      // This maps the names of loaded items to the object that should be used
      // to handle them. That object is created by the factory we get.
      this.handlerList = new Map();

      // This maps the names of loaded source files with the object that they
      // exported which contains the load/unload endpoints. It's used to keep
      // the items around to track what files we have loaded and to be able to
      // handle an unload operation/
      this.sourceMap = new Map();
    }

    /* Given an item name or alias, look for the handler object associated with
     * it and return it. The result is null if there is no such entry. */
    find(name) {
      return this.handlerList.get(name) || null;
    }

    /* This will find the entry in the handler list for the named command and
     * then, if found, apply it as an alias to the command in the table. This
     * will ensure that the alias is available and that the command being
     * aliased exists,
     *
     * This only changes the handler list; the command isn't updated to know
     * that it has a new alias. For that, modify the cmd entry manually. */
    addAlias(name, alias) {
      const cmd = this.find(name);
      if (cmd === null) {
        this.api.log.warn(`WARN: Alias ${alias} cannot be added to ${name}; aliased command was not found`);
        return
      }

      // If there is already a command with this alias, we can't add one as it
      // would be a collision.
      if (this.find(alias) !== null) {
        this.api.log.warn(`WARN: Alias ${alias} collides with ${this.modelName} name; skipping`);
        return;
      }

      // Set the actual alias up
      this.handlerList.set(alias, cmd)
    }

    /* This will find the entry in the handler list that represents both the
     * name and the alias, and if they both represent the same command, the
     * alias will be removed from the list. A warning is generated if the alias
     * doesn't exist or doesn't alias the given command.
     *
     * This only changes the handler list; the command isn't updated to know
     * that it has one fewer aliases. For that, modify the cmd entry manualy. */
    removeAlias(name, alias) {
      const cmd = this.find(name);
      if (cmd === null) {
        this.api.log.warn(`WARN: Alias ${alias} cannot be added to ${name}; aliased command was not found`);
        return
      }

      // We need to find the entry that matches the alias; it both needs to
      // exist and have the same name as the command we found above.
      const aliasCmd = this.find(alias);
      if (aliasCmd === null) {
        this.api.log.warn(`WARN: Alias ${alias} cannot be removed from ${name}; aliased command was not found`);
        return;
      }

      if (aliasCmd.name !== cmd.name) {
        this.api.log.warn(`WARN: Alias ${alias} is not an alias for ${name}; skipping removal`);
        return;
      }

      this.handlerList.delete(alias);
    }

    /* This will initialize the map by loading all of the database records from
     * the defined model, creating all of the appropriate objects, and loading
     * all of the implementation files.
     *
     * The load will also apply any configured aliases, as defined in the
     * database records.
     *
     * This will return back a list of errors that occured while the list was
     * initializing, which may be empty. */
    async initialize() {
      // Find all of the records from our model and create the appropriate
      // list items out of them. This will create an entry for each item, load
      // and install the handler code, and apply aliases.
      try {
        const itemInfo = await this.dataModel.find({});
        return await this.#createItems(itemInfo);
      } catch (error) {
        this.api.log.error(`Error loading ${this.modelName}: ${error.toString()}`);
      }
    }

    /* Return a list of all of the currently loaded modules for items contained
     * within the list. This is garnered from the list of items that are
     * currently in the list already. */
    sources() {
      return [...new Set(Array.from(this.handlerList.values(), value => value.sourceFile))];
    }

    /* This takes the name of a new file and attempts to load it, adding in any
     * new commands.
     *
     * This should be a file that is not currently loaded, and is meant to be
     * used in situations where a new file needs to be added, since adding a new
     * file isn't actually a reload operation.
     *
     * The return value of this is a list of errors that occured while loading
     * the file; this may be empty. */
    async loadNewFile(loadSpec) {
      this.api.log.info(`* Adding ${loadSpec} `);

      if (this.sourceMap.get(loadSpec) !== undefined) {
        this.api.log.warn('File was already loaded previously');
      }

      // Trigger an inner reload on the loadSpec we were given; if somehow
      // the file was actually loaded previously, this will still work because
      // the loader makes sure to always unload files first.
      try {
        return await this.#innerReload(new Set([loadSpec]));
      } catch (error) {
        this.api.log.error(`Error adding ${this.modelName}: ${error.toString()}`);
      }
    }

    /* This takes a list of files to reload or items whose implemenations should
     * be reloaded, and performs the reload operation on them.
     *
     * The incoming list can be source file glob patterns OR a list of item and
     * alias names. Since some items may start with the same character as a
     * negation glob spec (for example, command names), the list must contain
     * only one type of item.
     *
     * The argument "name" indicates wether the incoming list represents names
     * or not; false indicates that the list contains glob file specs.
     *
     * The return value is true if the reload succeeded, false if there was
     * nothing to reload, and a list of errors if the reload happened but
     * there were issues. */
    async reload(reloadSpec, name) {
      this.api.log.info(`* Reloading ${name ? 'named items' : 'file globs'}: ${JSON.stringify(reloadSpec)}`);
      if (reloadSpec.length === 0) {
        this.api.log.info('* Nothing to reload');
        return false;
      }

      // From the existing list of items, gather the unique list of all source
      // files that were originally loaded. Ultimately we want this to be an
      // array; we just need it to be unique in the interim.
      const sources = this.sources();

      // Iterate over all reload specifications.
      //
      // For each match, the appropriate source file is added to the set of
      // selected files, either based on glob match or because it is the file
      // declared to implement that entry.
      const selected = new Set();
      for (const spec of reloadSpec) {
        if (name === true) {
          const cmd = this.handlerList.get(spec);
          if (cmd !== undefined) {
            selected.add(cmd.sourceFile);
          }
        } else {
          // Add in all globbed matches.
          micromatch(sources, [spec]).forEach(selected.add, selected);
        }
      }

      // If nothing was selected, we can't reload
      if (selected.size === 0) {
        this.api.log.info('* Nothing found to reload');
        return false;
      }

      // Perform the reload; this call takes care the entirety of the
      // operation.
      let load_errors = []
      try {
        load_errors = await this.#innerReload(selected);
      } catch (error) {
        load_errors.push(error)
        this.api.log.error(`Error reloading ${this.modelName}: ${error.toString()}`);
        return null;
      }

      return (load_errors.length === 0) ? true : load_errors;
    }

    /* This takes a list of database records that represent new or changed items
     * for the list, and does the work of creating entries for them in the
     * handler list. Each record in the list will be wrapped in an object
     * provided by the factory provided in the constructor, and the handler
     * attached will come from loading the file in the record.
     *
     * The optional argument unloadFileList represents a list of files that
     * should be unloaded before the new files are loaded; if not given nothing
     * is unloaded first.
     *
     * The return value is a list of errors that occured during the load, such
     * as compilation failures and the like. This list will be empty if there
     * were no errors. */
    async #createItems(itemInfo, unloadFileList) {
      // Get a unique'd list of source files implementing each item so that we
      // can load them.
      const sources = new Set(itemInfo.map(e => e.sourceFile));

      // Obtain the handlers by loading all source files. This call will
      // unload any files we were told to unload first, and returns a Map that
      // keys on item name with values that are the associated handler
      // function.
      const [handlers, load_errors] = await this.#loadSources(sources, unloadFileList);

      // For each new item, use the factory to create a new wrapper and add
      // it to the list of added items.
      const newItems = [];
      for (const nItem of itemInfo) {
        const item = this.factory(nItem);

        // Apply the handler, if there is one. This adjusts the list as we
        // go so that at the end we know if there are any extraneous
        // handlers defined.
        const handler = handlers.get(item.name);
        if (handler === undefined) {
          this.api.log.warn(`${item.name}: handler implementation not found (should be in ${item.sourceFile})`);
        } else {
          handlers.delete(item.name);
          item.setHandler(handler);
        }

        // Add this item to the list and save it as a new item.
        this.handlerList.set(item.name, item);
        newItems.push(item);
        // this.api.log.info(`Adding ${this.modelName}: ${item.name}`);
      }

      this.api.log.info(`* Added ${this.modelName}: [${newItems.map(i => i.name).join(', ')}]`);

      // Warn about unclaimed handlers; this is potentially harmless, but in
      // combination with warnings about items with no handler, it may point
      // out an error.
      if (handlers.size !== 0) {
        this.api.log.warn(`${handlers.size} unclaimed handlers in loaded source files:`);
        this.api.log.warn(`    ${[...handlers.keys()].join(', ')}`);
      }

      // Install aliases for the new items in the list. This happens last to
      // ensure that aliases can't collide with an existing item, as otherwise
      // an alias may be put in place prior to a native item.
      for (const item of newItems) {
        this.#applyAliases(item);
      }

      // Send errors back.
      return load_errors;
    }

    /* This takes a list of file specifications to load and an optional list of
     * files to unload, and performs the actions needed to unload and reload
     * the related files.
     *
     * As a part of this operation, the list of source files is adjusted to know
     * about new files and to drop records of files that were unloaded but not
     * subsequently reloaded.
     *
     * Various checks are done, such as ensuring that the same handler appearing
     * in multiple files does not cause problems.
     *
     * The return value is a Map that maps the names of items declared in all
     * loaded files with the handlers that represent them, so that they can be
     * applied later, and a list of errors that occured as a result of loading
     * those files (if any). */
    async #loadSources(srcList, unloadFileList) {
      // Start by unloading files in the unload list, if one was given. This
      // also removes it from the source list since we're now done with it and
      // it might not come back.
      for (const file of unloadFileList || []) {
        this.api.log.info(`* Unloading: ${file}`);
        const handler = this.sourceMap.get(file);
        if (handler === undefined) {
          this.api.log.info(' -> file was not previously loaded; cannot unload');
        } else {
          handler.unload(this.api);
          this.sourceMap.delete(file);
        }
      }

      // While loading the source files, this will store any errors that are
      // generated so that they can be returned back to the caller, where they
      // can stored, displayed, etc.
      const load_errors = [];

      // Iterate over all of the incoming files that we should be loading, and
      // import them. We use import-fresh here, which makes sure that the
      // module cache won't get in the way.
      const handlers = new Map();
      for (const src of srcList) {
        try {
          // Files in the database are relative to a specific location, so
          // adjust them now.
          const srcFile = `../runtime/${src}`;
          this.api.log.info(`* Loading: ${src}`);

          // As a sanity, if this file appears in the list of sources,
          // someone forgot to unload it. Do so now and generate a warning
          // about it.
          const oldLoader = this.sourceMap.get(src);
          if (oldLoader !== undefined) {
            this.api.log.warn(`Warning: ${src} was not unloaded prior to a reload; unloading now`);

            // The ordering here is important; make sure it's not in the
            // list first in case the unload causes a problem.
            this.sourceMap.delete(src);
            oldLoader.unload(this.api);
          }

          // Load the module now and store it in the source map.
          //
          // Each module should return an object that defines a load() and
          // unload() function used to set up and tear down the module.
          const loader = loadModule(srcFile);
          this.sourceMap.set(src, loader);

          // Invoke this module's load() method, which is expected to
          // return an object that maps items to their handler functions.
          //
          // We store these in the handler list, making sure not to
          // clobber anything if there are duplicates.
          for (const [itemName, handleFunc] of Object.entries(await loader.load(this.api))) {
            if (handlers.has(itemName) === false) {
              handlers.set(itemName, handleFunc);
            } else {
              this.api.log.warn(`rejecting ${itemName}:${src}; duplicate handler for this ${this.modelName}`);
            }
          }
        } catch (error) {
          this.api.log.error(`Error: ${error}`);
          this.api.log.error(`Stack: ${error.stack}`);

          load_errors.push(error);
        }
      }

      return [handlers, load_errors];
    }

    /* Given an item, add any aliases it might contain to the overall handler
     * list, making sure that we don't clobber anything that already exists,
     * since native items take precedence. */
    #applyAliases(item) {
      const applied = [];
      for (const alias of item.aliases) {
        if (this.handlerList.has(alias)) {
          this.api.log.warn(`WARN: Alias ${alias} collides with ${this.modelName} name; skipping`);
        } else {
          applied.push(alias);
          // this.api.log.info(`Adding ${this.modelName} alias: ${alias} <-> ${item.name}`);
          this.handlerList.set(alias, item);
        }
      }

      if (applied.length > 0) {
        this.api.log.info(` * Adding aliases for ${item.name}: [${applied.join(', ')}]`);
      }
    }

    /* Given an item, remove any of its aliases from the handler list. This
     * uses the alias names in the item to search, but will not remove an item
     * from the list if it is not a true alias. */
    #removeAliases(item) {
      for (const alias of item.aliases) {
        // If this alias exists and is the same item as the base, remove it.
        // Attempts to remove aliases that aren't true aliases are silently
        // dropped since the associated warning for that happens at alias
        // creation time.
        if (this.handlerList.has(alias)) {
          const aliasItem = this.handlerList.get(alias);
          if (aliasItem.id === item.id) {
            this.api.log.info(`Removing ${this.modelName} alias: ${alias} <-> ${item.name}`);
            this.handlerList.delete(alias);
          }
        }
      }
    }

    /* When reload requests happen, the public facing method collects the
     * appropriate data and then invokes this method to actually carry out the
     * reload action.
     *
     * The method is given a list of files that are to be loaded, and any items
     * in the configured database model that say they come from any of the files
     * in this list will be loaded in order to update the list.
     *
     * Once this is complete, any files that were previously loaded will have
     * their commands and aliases removed, followed by new files being loaded
     * and new items and aliases being added.
     *
     * The return value is a list of errors that occured while the reload was
     * happening, which can be an empty list if everything suceeded. */
    async #innerReload(fileList) {
      // If there's nothing to reload, silently leave. This is a safety since
      // the public facing item should filter such requests away.
      if (fileList.size === 0) {
        return [];
      }

      // Scan the entire current list of items looking for anything that comes
      // from one of the source files that are being reloaded. For any such
      // item, remove the item and it's aliases from the list in preparation for
      // them to be recreated.
      //
      // For each command we are removing, keep track of it's old data so that
      // we can try and find them to reload them; command id values should never
      // change, but the files they're stored in might. So we don't want to rely
      // on that.
      const cmds = [];
      for (const [name, item] of this.handlerList.entries()) {
        if (fileList.has(item.sourceFile) && name === item.name) {
          // Store this command for later.
          cmds.push(item)

          // Remove the aliases and the command so that this item no longer
          // exists and is ready to be replaced.
          this.#removeAliases(item);
          this.handlerList.delete(name);
          this.api.log.info(`Removing ${this.modelName}: ${name}`);
        }
      }

      // Fetch from the database new information for all commands that we just
      // removed; this should come up with the same number of commands but may
      // end up generating potential warnings if a file name change makes the
      // list of commands handled by a file different than it was.
      //
      // Here we use a series of promises because Trilogy does not seem to
      // support "in" in queries, and using the wrapped knex instance does not
      // pass the data through Trilogy's data manipulation layer when the
      // results come back.
      const newItemInfo = [];
      const query = Promise.all(Array.from(cmds, cmd => this.dataModel.find(['id', '=', cmd.id])));
      (await query).forEach(result => newItemInfo.push(...result));

      // If the items to reload is a different number than the items that we
      // just unloaded, some database entries have been removed, so generate a
      // message to say what commands no longer exist.
      if (newItemInfo.length !== cmds.length) {
        // Determine which items are in the old list but not in the new list so
        // that we can see which are the ones that are missing. Array.some()
        // tells us if there's at least one item in the array that matches, so
        // we just need to determine which items are not matches.
        const missing = cmds.filter(({ id: id1 }) => newItemInfo.some(({ id: id2 }) => id2 === id1) === false);
        const names = missing.map(cmd => cmd.name);

        this.api.log.warn(`During reload, some commands no longer exist in the database: ${names.join(', ')}`);
      }

      // If there is nothing to reload now, then just return an empty error list
      // back since there's nothing to do.
      if (newItemInfo.length === 0) {
        return [];
      }

      // Using the list of new items, treat this as an initial load and add
      // the new items to the list; this will also handle unloading items from
      // the list we were originally given.
      return await this.#createItems(newItemInfo, fileList);
    }

    // Given an item name or alias, look for the handler object associated with
    // it and remove it from the list, along with all other aliases.
    remove(name) {
      const item = this.handlerList.get(name);
      if (item !== undefined) {
        this.#removeAliases(item);
        this.handlerList.delete(item.name);
        this.api.log.info(`Removing ${this.modelName}: ${item.name}`);
      }
    }
}


// =============================================================================


module.exports = {
  CodeHandlerMap
};
