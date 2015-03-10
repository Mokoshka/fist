'use strict';

var Unit = /** @type Unit */ require('./unit');

var _ = require('lodash-node');
var errors = require('./errors');
var f = require('util').format;
var inherit = require('inherit');

function init(app) {

    /**
     * default cache interface "local"
     *
     * @public
     * @memberOf app.caches
     * @property
     * @type {LRUDictTtlAsync}
     * */
    app.caches.local = Unit.prototype.cache;

    /**
     * @class app.Unit
     * @extends Unit
     * */
    app.Unit = inherit(Unit, /** @lends app.Unit.prototype */ {

        /**
         * @public
         * @memberOf {app.Unit}
         * @method
         * */
        __constructor: function () {
            // Close `app` in constructor to allow to simplify base calls in subclasses
            this.__base(app);

            /**
             * @public
             * @memberOf {app.Unit}
             * @property
             * @type {Object}
             * */
            this.cache = this.createCache();
        },

        /**
         * @public
         * @memberOf {app.Unit}
         * @method
         *
         * @returns {Object}
         * @throw {FistError}
         * */
        createCache: function () {
            if (_.isObject(this.cache)) {
                return this.cache;
            }

            if (_.has(this.app.caches, this.cache)) {
                return this.app.caches[this.cache];
            }

            throw new errors.NoSuchCacheError(f('You should define app.caches[%j] interface', this.cache));
        }

    });
}

module.exports = init;
