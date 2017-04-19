const _ = require('lodash'),
  assert = require('assert'),
  construct = require('runtype').construct
  ;


class EventIO {
  constructor() {
    this.reset();
  }

  reset() {
    this.$acceptHandlers = {};  // event name -> handler function
    this.$emitListeners = {};    // event name -> event listeners
  }

  setAcceptHandlers(handlerMap) {
    assert(_.isObject(handlerMap));
    const acceptHandlers = this.$acceptHandlers;
    _.forEach(handlerMap, (handlerFn, eventName) => {
      assert(_.isString(eventName), 'Expected string event name.');
      if (!handlerFn) {
        delete acceptHandlers[eventName];
      } else {
        assert(
            _.isFunction(handlerFn),
            `Handler "${eventName}" requires a function definition.`);
        acceptHandlers[eventName] = handlerFn;
      }
    });
  }

  on(eventName, handlerFn) {
    assert(_.isString(eventName), 'Expected string event name.');
    assert(_.isFunction(handlerFn), 'Expected handler function.');
    return this.upto(-1, eventName, handlerFn);
  }

  once(eventName, handlerFn) {
    return this.upto(1, eventName, handlerFn);
  }

  upto(eventCount, eventName, handlerFn) {
    const listeners = this.$emitListeners;
    listeners[eventName] = listeners[eventName] || [];
    listeners[eventName].push({
      fn: handlerFn,
      count: eventCount,
    });
    return handlerFn;
  }

  removeListener(eventName, handlerFn) {
    assert(_.isString(eventName), 'Expected string event name.');
    assert(_.isFunction(handlerFn), 'Expected handler function.');
    let listeners = this.$emitListeners;
    assert(eventName in listeners, `Unregistered event "${eventName}".`);
    listeners = listeners[eventName];
    let nRemoved = 0;
    for (let i = 0; i < listeners.length; i += 1) {
      if (listeners[i].fn === handlerFn) {
        listeners.splice(i, 1);
        i -= 1;
        nRemoved += 1;
      }
    }
    assert(nRemoved, `No such handler for event "${eventName}".`);
    return nRemoved;
  }

  removeEventListener(eventName, handlerFn) {
    return this.removeListener(eventName, handlerFn);
  }

  removeAllListeners(eventName) {
    assert(_.isString(eventName), 'Expected string event name.');
    const listeners = this.$emitListeners;
    assert(eventName in listeners, `Unregistered event "${eventName}".`);
    const nRemoved = listeners[eventName].length;
    assert(nRemoved, `No listeners to remove for event "${eventName}".`);
    delete listeners[eventName];
    return nRemoved;
  }

  accept(eventName, ...argsArray) {
    assert(_.isString(eventName), 'Expected string event name.');
    assert(
        eventName in this.$acceptHandlers,
        `No matching handler for event type "${eventName}".`);
    const handlerFn = this.$acceptHandlers[eventName].bind(this);
    if (_.isObject(this.$schema) && _.isObject(this.$schema.accept)) {
      const acceptSchema = this.$schema.accept[eventName];
      if (acceptSchema) {
        assert(
            _.isArray(acceptSchema),
            `Invalid accept schema for event "${eventName}", not an array.`);
        try {
          construct({ type: 'array', elements: acceptSchema }, argsArray);
        } catch (e) {
          const errorMsg = e.message.toString();
          const except = new Error(
              `Invalid data for event "${eventName}": ${errorMsg}`);
          except.eventName = eventName;
          except.direction = 'accept';
          throw except;
        }
      }
    }
    return handlerFn(...argsArray);
  }

  emit(eventName, ...evtArgs) {
    assert(_.isString(eventName), 'Expected string event name.');

    if (_.isObject(this.$schema) && _.isObject(this.$schema.emit)) {
      const emitSchema = this.$schema.emit[eventName];
      if (emitSchema) {
        assert(
            _.isArray(emitSchema),
            `Invalid emit schema for event "${eventName}", not an array.`);
        try {
          construct({ type: 'array', elements: emitSchema }, evtArgs);
        } catch (e) {
          const errorMsg = e.message.toString();
          const except = new Error(
              `Invalid data for event "${eventName}": ${errorMsg}`);
          except.eventName = eventName;
          except.direction = 'emit';
          throw except;
        }
      }
    }

    let listeners = this.$emitListeners[eventName];
    if (listeners) {
      for (let i = 0; i < listeners.length; i += 1) {
        const listener = listeners[i];
        listener.fn(...evtArgs);
        if (listener.count !== -1) {
          listener.count -= 1;
          if (listener.count === 0) {
            listeners.splice(i, 1);
            i -= 1;
          }
        }
      }
      if (!listeners.length) {
        delete this.$emitListeners[eventName];
      }
    }

    listeners = this.$emitListeners['*'];
    if (listeners) {
      for (let i = 0; i < listeners.length; i += 1) {
        const listener = listeners[i];
        listener.fn(eventName, ...evtArgs);
        if (listener.count !== -1) {
          listener.count -= 1;
          if (listener.count === 0) {
            listeners.splice(i, 1);
            i -= 1;
          }
        }
      }
      if (!listeners.length) {
        delete this.$emitListeners['*'];
      }
    }
  }
}


module.exports = EventIO;
