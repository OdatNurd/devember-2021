
// =============================================================================


/* This is a version of the generic handler map, which handles versions of the
 * handler class that aren't dynamically loaded from source files and as such
 * cannot be hot reloaded.
 *
 * The public facing API on the class remains similar, though the unrequired
 * members are not included. Howevere, those are all related to hot reloading of
 * handlers, which is not needed here. */
class StaticHandlerMap  {
    api;
    modelName;
    dataModel;
    factory;
    handlerList;

    /* When the handler map is constructed, it's given an API handle that it can
     * use to access the API itself.
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

      // This maps the textual names of items in the list with the entries that
      // represent them, so that they can be triggered at runtime. That object
      // is creatred by the factory we get.
      this.handlerList = new Map();
    }

    /* Given an item name or alias, look for the handler object associated with
     * it and return it. The result is null if there is no such entry. */
    find(name) {
      return this.handlerList.get(name) || null;
    }

    /* Given an item name that exists in the database but not in this existing
     * handler list, add a new stub entry into the handler list for this item.
     *
     * The data for the stub entry will come from the database record.
     *
     * This is used to add in new items dynamically at runtime. */
    async addItemStub(name) {
      // Sanity check; don't blow stuff up.
      if (this.find(name) !== null) {
        api.log.error(`trying to add a new stub item ${name} in ${this.modelName} when it already exists`);
        return;
      }

      // Pull a record out of the database for the item with his name; we need
      // to make sure that it actually exists.
      const record = await this.dataModel.findOne({ name });
      if (record === undefined) {
        api.log.error(`trying to add a new stub item ${name} in ${this.modelName} but no such record exists`);
        return;
      }

      // Create a new item using the factory and plug it into the list.
      const item = this.factory(record);
      this.handlerList.set(item.name, item);
    }

    /* This will find the entry in the handler list for the named item and then
     * if found, apply it as an alias to the item in the table. This will ensure
     * that the alias is available and that the item being aliased exists.
     *
     * This only changes the handler list; the item isn't updated to know that
     * it has a new alias. For that, modify the entry manually. */
    addAlias(name, alias) {
      const item = this.find(name);
      if (item === null) {
        this.api.log.warn(`WARN: Alias ${alias} cannot be added to ${name}; aliased item was not found`);
        return
      }

      // If there is already an item with this alias, we can't add one as it
      // would be a collision.
      if (this.find(alias) !== null) {
        this.api.log.warn(`WARN: Alias ${alias} collides with ${this.modelName} name; skipping`);
        return;
      }

      // Set the actual alias up
      this.handlerList.set(alias, item)
    }

    /* This will find the entry in the handler list that represents both the
     * name and the alias, and if they both represent the same item, the alias
     * will be removed from the list. A warning is generated if the alias
     * doesn't exist or doesn't alias the given item.
     *
     * This only changes the handler list; the item isn't updated to know
     * that it has one fewer aliases. For that, modify the entry manualy. */
    removeAlias(name, alias) {
      const item = this.find(name);
      if (item === null) {
        this.api.log.warn(`WARN: Alias ${alias} cannot be added to ${name}; aliased item was not found`);
        return
      }

      // We need to find the entry that matches the alias; it both needs to
      // exist and have the same name as the item we found above.
      const aliasItem = this.find(alias);
      if (aliasItem === null) {
        this.api.log.warn(`WARN: Alias ${alias} cannot be removed from ${name}; aliased item was not found`);
        return;
      }

      if (aliasItem.name !== item.name) {
        this.api.log.warn(`WARN: Alias ${alias} is not an alias for ${name}; skipping removal`);
        return;
      }

      this.handlerList.delete(alias);
    }

    /* This will initialize the map by loading all of the database records from
     * the defined model and creating all of the appropriate objects.
     *
     * The load will also apply any configured aliases, as defined in the
     * database records. */
    async initialize() {
      // Find all of the records from our model and create the appropriate list
      // items out of them. This will create an entry for each item, and apply
      // aliases.
      try {
        const itemInfo = await this.dataModel.find({});
        await this.#createItems(itemInfo);
      } catch (error) {
        this.api.log.error(`Error loading ${this.modelName}: ${error.toString()}`);
      }
    }

    /* This takes a list of database records that represent new items for the
     * list, and does the work of creating entries for them in the handler list.
     * Each record in the list will be wrapped in an object provided by the
     * factory provided in the constructor. */
    async #createItems(itemInfo) {
      // For each new item, use the factory to create a new wrapper and add
      // it to the list of added items.
      const newItems = [];
      for (const nItem of itemInfo) {
        // Add this item to the list and save it as a new item.
        const item = this.factory(nItem);
        this.handlerList.set(item.name, item);
        newItems.push(item);
      }

      this.api.log.info(`* Added ${this.modelName}: [${newItems.map(i => i.name).join(', ')}]`);

      // Install aliases for the new items in the list. This happens last to
      // ensure that aliases can't collide with an existing item, as otherwise
      // an alias may be put in place prior to a native item.
      for (const item of newItems) {
        this.#applyAliases(item);
      }
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
  StaticHandlerMap
};
