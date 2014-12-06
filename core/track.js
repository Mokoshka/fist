'use strict';

var hasProperty = Object.prototype.hasOwnProperty;
var uniqueId = require('unique-id');

/**
 * @class Track
 * @param {Server} agent
 * */
function Track(agent) {

    /**
     * @public
     * @memberOf {Track}
     * @property
     * @type {String}
     * */
    this.id = uniqueId();

    /**
     * @public
     * @memberOf {Track}
     * @property
     * @type {Logger}
     * */
    this.logger = agent.logger.bind(this.id);

    /**
     * @public
     * @memberOf {Track}
     * @property
     * @type {Object}
     * */
    this.params = {};

    /**
     * @protected
     * @memberOf {Track}
     * @property
     * @type {Server}
     * */
    this._agent = agent;

    /**
     * @protected
     * @memberOf {Track}
     * @property
     * @type {Object}
     * */
    this._calls = {};

    /**
     * @protected
     * @memberOf {Track}
     * @property
     * @type {Boolean}
     * */
    this._isFlushed = false;
}

/**
 * @public
 * @memberOf {Track}
 * @method
 *
 * @constructs
 * */
Track.prototype.constructor = Track;

/**
 * @public
 * @memberOf {Track}
 * @method
 *
 * @param {UnitCommon} unit
 * @param {*} [args]
 *
 * @returns {vow.Promise}
 * */
Track.prototype.invoke = function (unit, args) {
    var argsHash;
    var calls = this._calls;
    var name = unit.name;

    if (hasProperty.call(calls, name)) {
        calls = calls[name];
    } else {
        calls = calls[name] = {};
    }

    if (Object(args) !== args || hasProperty.call(args, 'toString')) {
        //  The arguments are well hashable
        argsHash = String(args);

        if (hasProperty.call(calls, argsHash)) {
            //  score!
            return calls[argsHash];
        }

        calls[argsHash] = unit.call(this, args);

        return calls[argsHash];
    }

    this.logger.warn('The arguments %j could not be hashed for memorize "%s" invocation\n' +
    '   Hint: define own args.toString function to provide unique arguments hash', args, name);

    return unit.call(this, args);
};

/**
 * @public
 * @memberOf {Track}
 * @method
 *
 * @param {String} name
 * @param {*} [args]
 *
 * @returns {vow.Promise}
 * */
Track.prototype.eject = function (name, args) {
    return this._agent.callUnit(name, this, args).then(function (res) {
        return res && res.result;
    });
};

/**
 * @public
 * @memberOf {Track}
 * @method
 *
 * @returns {Boolean}
 * */
Track.prototype.isFlushed = function () {
    return this._isFlushed;
};

module.exports = Track;
