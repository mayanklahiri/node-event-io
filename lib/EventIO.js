const _ = require('lodash'),
  assert = require('assert')
  ;


class EventIO {
  constructor() {
    this.reset();
  }

  reset() {
    this.$acceptHandlerMap = {};  // event name -> handler function
    this.$acceptSchemaMap = {};   // event name -> function schemas
    this.$emitSchemaMap = {};     // event name -> emit schemas
    this.$emitListeners = {};     // event name -> event listeners
  }

  setAcceptHandlers(handlerMap) {
    assert(_.isObject(handlerMap));
    const acceptHandlers = this.$acceptHandlerMap;
    _.forEach(handlerMap, (handlerFn, eventName) => {
      assert(_.isString(eventName), 'Expected string event name.');
      assert(
          _.isFunction(handlerFn),
          `Handler "${eventName}" requires a function definition.`);
      acceptHandlers[eventName] = handlerFn;
    });
  }

  accept(eventName, ...argsArray) {
    assert(_.isString(eventName), 'Expected string event name.');
    assert(
        eventName in this.$acceptHandlerMap,
        `No matching handler for event type "${eventName}".`);
    return this.$acceptHandlerMap[eventName].call(this, argsArray);
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

  emit(eventName, ...evtArgs) {
    assert(_.isString(eventName), 'Expected string event name.');
    const listeners = this.$emitListeners[eventName];
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
  }
}


module.exports = EventIO;
