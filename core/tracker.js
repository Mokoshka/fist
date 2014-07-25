'use strict';

var Agent = /** @type Agent */ require('./agent');
var Deps = /** @type Deps */ require('./deps/deps');
var Skip = /** @type Skip */ require('./skip/skip');

var _ = require('lodash-node');
var inherit = require('inherit');
var vow = require('vow');

/**
 * @class Tracker
 * @extends Agent
 * */
var Tracker = inherit(Agent, /** @lends Tracker.prototype */ {

    /**
     * @private
     * @memberOf {Tracker}
     * @method
     *
     * @constructs
     *
     * @param {Object} [params]
     * */
    __constructor: function (params) {

        this.__base(params);

        /**
         * @public
         * @memberOf {Tracker}
         * @property
         * @type {Object}
         * */
        this.tasks = {};

        /**
         *
         * @private
         * @memberOf {Tracker}
         * @property
         * @type {Array<Function>}
         * */
        this.__plugs = [];
    },

    /**
     * @public
     * @memberOf {Tracker}
     * @method
     * */
    plug: function () {
        this.__plugs = this.__plugs.concat(_.flatten(arguments));

        return this;
    },

    /**
     * Запускает операцию разрешения узла
     *
     * @public
     * @memberOf {Tracker}
     * @method
     *
     * @param {Track} track
     * @param {String} path
     * @param {*} [params]
     *
     * @returns {vow.Promise}
     * */
    resolve: function (track, path, params) {

        var ready = this.ready();

//        -1 possible tick
        if ( ready.isFulfilled() ) {

            return this.__resolvePath(track, path, params);
        }

        return ready.then(function () {

            return this.__resolvePath(track, path, params);
        }, this);
    },

    /**
     * @protected
     * @memberOf {Tracker}
     * @method
     *
     * @param {Track} track
     * @param {String} path
     * @param {Object} params
     *
     * @returns {Deps}
     * */
    _createCtx: function (track, path, params) {

        return new Deps(track, path, params);
    },

    /**
     * @protected
     * @memberOf {Tracker}
     * @method
     *
     * @returns {vow.Promise}
     * */
    _getReady: function () {

        var promise = vow.resolve();

        _.forEach(this.__plugs, function (func) {
            promise = promise.then(function () {

                var defer;

                if ( 0 === func.length ) {

                    return func.call(this);
                }

                defer = vow.defer();

                func.call(this, function (err) {

                    if ( arguments.length ) {
                        defer.reject(err);

                        return;
                    }

                    defer.resolve();
                });

                return defer.promise();

            }, this);
        }, this);

        return promise.then(this.__base, this);
    },

    /**
     * @private
     * @memberOf {Tracker}
     * @method
     *
     * @param {Track} track
     * @param {String} path
     * @param {Object} [params]
     *
     * @returns {vow.Promise}
     * */
    __executeUnit: function (track, path, params) {

        var deps = this._createCtx(track, path, params);
        var exec = vow.defer();
        var unit = track.agent.getUnit(path);

        deps.trigger('ctx:pending');

        exec.promise().then(function (data) {
            deps.trigger('ctx:accept', data);
        }, function (data) {
            deps.trigger('ctx:reject', data);
        });

        if ( _.isUndefined(unit) ) {
            exec.reject();

            return exec.promise();
        }

        if ( 0 === _.size(unit.deps) ) {
            exec.resolve(unit.getValue(deps));

            return exec.promise();
        }

        deps.append(unit.deps).done(function (promises) {

            var promise = _.find(promises, function (promise) {

                return promise.valueOf() instanceof Skip;
            });

            if ( _.isUndefined(promise) ) {
                promise = unit.getValue(deps);
            }

            exec.resolve(promise);
        });

        return exec.promise();
    },

    /**
     * @private
     * @memberOf {Tracker}
     * @method
     *
     * @param {Track} track
     * @param {String} path
     * @param {Object} [params]
     *
     * @returns {vow.Promise}
     * */
    __resolvePath: function (track, path, params) {

        if ( !_.has(track.tasks, path) ) {
            track.tasks[path] = this.__executeUnit(track, path, params);
        }

        return track.tasks[path];
    }

});

module.exports = Tracker;
