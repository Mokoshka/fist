'use strict';

var S_SEPARATOR = '\u0000';
var LRUCache = require('lru-cache');

var _ = require('lodash-node');
var inherit = require('inherit');
var vow = require('vow');

/**
 * @class Unit
 * */
var Unit = inherit(/** @lends Unit.prototype */ {

    /**
     * @private
     * @memberOf {Unit}
     * @method
     *
     * @constructs
     * */
    __constructor: function (params) {

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Object}
         * */
        this.params = _.extend({}, this.params, params);

        /**
         * @private
         * @memberOf {Unit}
         * @property
         * @type {LRUCache}
         * */
        this.__cache = this._createCache(this._getCacheOpts());

        //  make proto-deps own and unique
        this.addDeps(this.deps);
    },

    /**
     * @public
     * @memberOf {Unit}
     * @property
     * @type {String}
     * */
    path: 'unit',

    /**
     * @public
     * @memberOf {Unit}
     * @method
     * */
    addDeps: function () {
        this.deps = _.union(this.deps, _.flatten(arguments));
    },

    /**
     * @public
     * @memberOf {Unit}
     * @method
     * */
    delDeps: function () {

        var args = _.flatten(arguments);

        this.deps = _.reject(this.deps, function (path) {

            return _.contains(args, path);
        });
    },

    /**
     * @public
     * @abstract
     * @memberOf {Unit}
     * @method
     *
     * @param {Track} track
     * @param {Ctx} ctx
     *
     * @returns {*}
     * */
    data: function (track, ctx) {
        /*eslint no-unused-vars: 0*/
    },

    /**
     * @public
     * @memberOf {Unit}
     * @method
     *
     * @param {Track} track
     * @param {Ctx} defer
     *
     * @returns {*}
     * */
    getValue: function (track, defer) {

        var cacheKey = this.__getCacheKey(track, defer);
        var promise;

        if ( this.__cache.has(cacheKey) ) {

            return this.__cache.get(cacheKey);
        }

        promise = this.__call(track, defer);

        promise.done(null, function () {
            //  Если узел зареджектился то не кэшируем
            this.__cache.del(cacheKey);
        }, this);

        this.__cache.set(cacheKey, promise);

        return promise;
    },

    /**
     * @public
     * @memberOf {Unit}
     * @property
     * @type {Array<String>}
     * */
    deps: [],

    /**
     * @public
     * @memberOf {Unit}
     * @property
     * @type {Object}
     * */
    params: {},

    /**
     * @protected
     * @memberOf {Unit}
     * @method
     *
     * @param {Track} track
     * @param {Ctx} defer
     *
     * @returns {Array<String>}
     * */
    _getCacheKeyParts: function (track, defer) {
        /*eslint no-unused-vars: 0*/
        return [];
    },

    /**
     * @protected
     * @memberOf {Unit}
     * @method
     *
     * @param {Object} params
     *
     * @returns {LRUCache}
     * */
    _createCache: function (params) {

        return new LRUCache(params);
    },

    /**
     * @protected
     * @memberOf {Unit}
     * @method
     *
     * @returns {Object}
     * */
    _getCacheOpts: function () {

        var params = _.extend({}, this.params.cache, {
            maxAge: this._maxAge
        });

        params.maxAge = cast2LRUCacheMaxAge(params.maxAge);

        return params;
    },

    /**
     * @private
     * @memberOf {Unit}
     * @method
     *
     * @param {Track} track
     * @param {Ctx} defer
     *
     * @returns {String}
     * */
    __getCacheKey: function (track, defer) {

        return this._getCacheKeyParts(track, defer).join(S_SEPARATOR);
    },

    /**
     * @private
     * @memberOf {Unit}
     * @method
     *
     * @param {Track} track
     * @param {Ctx} defer
     *
     * @returns {*}
     * */
    __call: function (track, defer) {

        var self = this;

        if ( _.isFunction(self.data) ) {

            return vow.invoke(function () {

                return self.data(track, defer);
            });
        }

        return vow.resolve(self.data);
    }

});

/**
 * @private
 * @static
 * @memberOf Unit
 *
 * @method
 *
 * @param {*} n
 *
 * @returns {Number}
 * */
function cast2LRUCacheMaxAge (n) {

    n = +n;

    if ( _.isNaN(n) ) {

        return -Infinity;
    }

    if ( 0 === n ) {

        return -Infinity;
    }

    return n;
}

module.exports = Unit;
