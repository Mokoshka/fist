'use strict';

var inherit = require('inherit');

/**
 * @class Track
 * */
var Track = inherit(/** @lends Track.prototype */{

    /**
     * @private
     * @memberOf {Track}
     * @method
     *
     * @constructs
     *
     * @returns void
     * */
    __constructor: function (agent) {

        /**
         * @public
         * @memberOf {Track}
         * @property
         * @type {Tracker}
         * */
        this.agent = agent;

        /**
         * @public
         * @memberOf {Track}
         * @property {Object}
         * */
        this.tasks = {};
    },

    /**
     * @public
     * @memberOf {Track}
     * @method
     *
     * @param {String} path
     * @param {*} [params]
     *
     * @returns {vow.Promise}
     * */
    invoke: function (path, params) {

        return this.agent.resolve(this, path, params);
    }

});

module.exports = Track;
