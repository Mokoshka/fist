'use strict';

var STATUS_CODES = require('http').STATUS_CODES;
var Connect = /** @type Connect */ require('fist.io.server/track/Connect');

/**
 * @class Runtime
 * @extends Connect
 * */
var Runtime = Connect.extend(/** @lends Runtime.prototype */ {

    /**
     * @public
     * @memberOf {Runtime}
     * @method
     *
     * @param {String} name
     * @param {Boolean} [only]
     *
     * @returns {String|void}
     * */
    arg: function (name, only) {

        var result = this.match[name];

        if ( only ) {

            return result;
        }

        return result || this.url.query[name];
    },

    /**
     * @public
     * @memberOf {Runtime}
     * @method
     *
     * @param {String} name
     * @param {Object} [params]
     *
     * @returns {String}
     * */
    buildPath: function (name, params) {

        return this.agent.router.getRoute(name).build(params);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {*} body
     * */
    _writeBody: function (body) {

        if ( body instanceof Error && this._res.statusCode >= 500 ) {

            if ( this.agent.params.staging ) {
                body = STATUS_CODES[this._res.statusCode];

            } else {
                body = body.stack;
            }
        }

        Runtime.parent._writeBody.call(this, body);
    }

});

module.exports = Runtime;
