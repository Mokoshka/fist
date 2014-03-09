'use strict';

var StreamLoader = /** @type StreamLoader */ require('../StreamLoader');
var QueryString = /** @type QueryString */ require('querystring');
var R_URLENCODED = /^application\/x-www-form-urlencoded(?:;|$)/i;

/**
 * @class Urlencoded
 * @extends StreamLoader
 * */
var Urlencoded = StreamLoader.extend(/** @lends Urlencoded.prototype*/ {

    /**
     * @protected
     * @memberOf {Urlencoded}
     * @method
     *
     * @param {*} opts
     * @param {Function} done
     * */
    _parse: function (opts, done) {

        function entireDone (err, res) {

            if ( 2 > arguments.length ) {

                return done(err);
            }

            return done(null, {
                input: QueryString.parse(String(res)),
                files: Object.create(null)
            });
        }

        Urlencoded.parent._parse.call(this, opts, entireDone);
    }
}, {

    /**
     * @public
     * @static
     * @memberOf Urlencoded
     *
     * @param {Object} req
     *
     * @returns {Boolean}
     * */
    isUrlencoded: function (req) {

        return R_URLENCODED.test(req.headers['content-type']);
    }
});

module.exports = Urlencoded;
