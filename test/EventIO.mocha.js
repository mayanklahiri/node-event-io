/* eslint-disable */
const _ = require('lodash')
  , assert = require('chai').assert
  , json = JSON.stringify
  , EventIO = require('../lib/EventIO')
  ;


describe('EventIO: ES6 event acceptor and emitter', function() {

  class TestClass extends EventIO { }
  var testInstance;

  beforeEach(function() {
    testInstance = new TestClass();
  });

  afterEach(function() {
    testInstance.reset();
  });

  it('should add the correct interface to child classes', function() {
    let x = testInstance;
    assert.isTrue(_.isFunction(x.emit), 'should add emit()');
    assert.isTrue(_.isFunction(x.on), 'should add on()');
    assert.isTrue(_.isFunction(x.once), 'should add once()');
    assert.isTrue(_.isFunction(x.accept), 'should add accept()');
    assert.isTrue(
        _.isFunction(x.setAcceptHandlers), 'should add setAcceptHandlers()');
  });


  it('accept() should throw on unknown events', function() {
    let x = testInstance;
    assert.throws(() => {
      testInstance.accept('null', 123, 456);
    }, /no matching handler/i);
    assert.throws(() => {
      testInstance.accept(['null', 123, 456]);
    }, /expected string event name/i);
    assert.throws(() => {
      testInstance.accept();
    }, /expected string event name/i);
  });


  it('accept() should invoke handlers on known events and return results',
      function() {
    let x = testInstance;
    x.setAcceptHandlers({
      first (argsArray) {
        return _.first(argsArray);
      },
      size (argsArray) {
        return _.size(argsArray);
      }
    });
    assert.strictEqual(1, x.accept('first', 1, 2, 3));
    assert.deepEqual([1, 2], x.accept('first', [1, 2]));
    assert.strictEqual(3, x.accept('size', 1, 2, 3));
    assert.strictEqual(0, x.accept('size'));
  });


  it('emit() within accept() should occur synchronously in order', function() {
    let x = testInstance;

    x.setAcceptHandlers({
      alarm (argsArray) {
        this.emit('trigger_alarm', argsArray);
      },
    });

    let eventLog = [];
    x.on('trigger_alarm', (argsArray) => {
      eventLog.push(argsArray);
    });

    x.accept('alarm', 1, 2, 3);
    x.accept('alarm', 4);
    x.accept('alarm');

    // emitted events should have been received on return from accept()
    assert.deepEqual(eventLog, [[1, 2, 3], [4], []]);
  });


  it('emit() should respect call counts set by on(), once(), upto()',
      function() {
    let x = testInstance;

    x.setAcceptHandlers({
      alarm (argsArray) {
        this.emit('alarm_1');
        this.emit('alarm_2');
        this.emit('alarm_3');
      },
    });

    let eventLog = [];
    x.on('alarm_1', () => {
      eventLog.push('alarm_1');
    });
    x.once('alarm_2', (argsArray) => {
      eventLog.push('alarm_2');
    });
    x.upto(2, 'alarm_3', (argsArray) => {
      eventLog.push('alarm_3');
    });

    x.accept('alarm');
    x.accept('alarm');
    x.accept('alarm');

    // emitted events should have been received on return from accept()
    assert.deepEqual(eventLog, [
        // accept call 1: all 3 trigger
        'alarm_1',
        'alarm_2',
        'alarm_3',

        // accept call 2: alarm_2 should have expired
        'alarm_1',
        'alarm_3',

        // accept call 3: alarm_3 should have expired
        'alarm_1',
      ]);
  });


  it('emit() should respect call counts set by on(), once(), upto()',
      function() {
    let x = testInstance;

    x.setAcceptHandlers({
      alarm (argsArray) {
        this.emit('alarm_1');
        this.emit('alarm_2');
        this.emit('alarm_3');
      },
    });

    let eventLog = [];
    x.on('alarm_1', () => {
      eventLog.push('alarm_1');
    });
    x.once('alarm_2', (argsArray) => {
      eventLog.push('alarm_2');
    });
    x.upto(2, 'alarm_3', (argsArray) => {
      eventLog.push('alarm_3');
    });

    x.accept('alarm');
    x.accept('alarm');
    x.accept('alarm');

    // emitted events should have been received on return from accept()
    assert.deepEqual(eventLog, [
        // accept call 1: all 3 trigger
        'alarm_1',
        'alarm_2',
        'alarm_3',

        // accept call 2: alarm_2 should have expired
        'alarm_1',
        'alarm_3',

        // accept call 3: alarm_3 should have expired
        'alarm_1',
      ]);
  });



  it('removeListener() should remove listeners of all types', function() {
    let x = testInstance;

    x.setAcceptHandlers({
      alarm (argsArray) {
        this.emit('alarm_1');
        this.emit('alarm_2');
        this.emit('alarm_3');
      },
    });

    let eventLog = [];
    let cb1 = x.on('alarm_1', () => {
      eventLog.push('alarm_1');
    });
    x.on('alarm_1', () => {
      eventLog.push('alarm_1-a');
    });
    x.once('alarm_2', (argsArray) => {
      eventLog.push('alarm_2');
    });
    let cb3 = x.upto(2, 'alarm_3', (argsArray) => {
      eventLog.push('alarm_3');
    });

    x.removeListener('alarm_1', cb1);
    x.removeAllListeners('alarm_2');
    x.removeEventListener('alarm_3', cb3);

    x.accept('alarm');

    // no emits should have been triggers.
    assert.deepEqual(eventLog, ['alarm_1-a']);
  });

});
