
// =============================================================================


/* This class is used as the values stored in an instance of a CodeHandlerMap
 * to associate a function that has been dynamically loaded from a file on disk
 * with a named piece of code, such as a command, event handler, and so on.
 *
 * This is the base class that specifies the minimum core needed in order to
 * be a part of the code map; subclasses can and should specialize this to add
 * their own custom handling. */
class CodeHandler {
    // All handlers will, at a minimum, contain these fields because they are
    // required by the CodeHandlerMap classes file loading mechanism. Other
    // properties may also exist, depending on the shape of the code being
    // modeled.
    id;
    name;
    aliases;
    enabled;
    sourceFile;

    // All items are associated with a handler, which is some function that will
    // be invoked by the execute() method, if one exists.
    handler;

    /* Construct an instance by taking an object that represents the fields for
     * an instance (as taken from a database record) and using it to set up our
     * instance variables. */
    constructor(config) {
      this.applyConfig(config);
    }

    /* Given an object that represents the fields for an instance of this class,
     * apply that configuration to the fields in this instance.
     *
     * This needs to be defined by subclasses (because all instances will have a
     * different set of fields), or construction of instances will fail. */
    applyConfig(config) {
      // A default implementation could try to apply all fields from the
      // incoming config to properties on the object, but I prefer a more
      // manual approach since some fields may need to be skipped or others
      // synthesized.
      throw new Error(`${this.constructor.name}.applyConfig() has not been overloaded`);
    }

    /* Set the function that will be invoked by a call to the execute() method
     * on this class instance.
     *
     * It is valid to pass null here to erase any previously set handler, if
     * desired. */
    setHandler(handler) {
      this.handler = handler;
    }

    /* This method should return true if a call to execute() should attempt to
     * execute the handler associated with this instance, or false to block such
     * an attempt.
     *
     * The call will get the same arguments as those passed to the execute()
     * call itself, so that it can better determine if it applies in the current
     * situation.
     *
     * The default implementation of this only verifies that there is a handler
     * present. */
    can_execute(api, ...args) {
      // A handler is required or we have nothing to execute.
      if (this.handler === null || this.handler === undefined) {
        api.log.warn(`-> ${this.name} cannot execute; handler is missing`);
        return false;
      }

      // If we're disabled, we do not need to execute
      if (this.enabled === false) {
        api.log.warn(`-> ${this.name} cannot execute; disabled`);
        return false;
      }

      // All good.
      return true;
    }

    /* Execute the handler associated with this particular instance. Any
     * arguments that are provided to this call will be passed directly through
     * to the handler.
     *
     * A call to this.can_execute() is done prior to the execution to verify that
     * the execution should occur; if it returns false, the execution is
     * blocked.
     *
     * The return value should be true if the command executed, or false if it
     * did not, including if an error occurred that stopped the execution from
     * happening. */
    execute(api, ...args) {
      try {
        if (this.can_execute(api, ...args)) {
          this.handler(api, ...args);
          return true;
        }
      } catch (error) {
        api.log.warn(`-> ${this.name}: error while executing; ${error}`);
        throw error;
      }

      return false;
    }
}


// =============================================================================


module.exports = {
  CodeHandler
};
