'use strict';

var Task = /** @type Task */ require('../util/Task');
var extend = require('fist.lang.extend');

/**
 * @class Parser
 * @extends Task
 * */
var Parser = Task.extend(/** @lends Parser.prototype */ {

    /**
     * @protected
     * @memberOf {Parser}
     * @method
     *
     * @constructs
     *
     * @param {Object} readable
     * @param {*} [opts]
     * */
    constructor: function (readable, opts) {

        //  clone options
        opts = extend(Object.create(null), opts);

        opts.limit = +opts.limit;

        if ( isNaN(opts.limit) ) {
            opts.limit = Infinity;
        }

        opts.length = +opts.length;

        if ( isNaN(opts.length) ) {
            opts.length = Infinity;
        }

        Parser.Parent.call(this, this._parse, this, [opts]);

        /**
         * @protected
         * @memberOf {Parser}
         * @property {Object}
         * */
        this._readable = readable;
    },

    /**
     * @protected
     * @memberOf {Parser}
     * @method
     *
     * @param {*} opts
     * @param {Function} done
     * */
    _parse: function (opts, done) {
        done(null, new Buffer(0));
    }

}, {

    /**
     * @public
     * @static
     * @memberOf Parser
     *
     * @method
     *
     * @returns {Error}
     * */
    ELIMIT: function (opts) {

        return extend(new Error(), {
            code: 'ELIMIT'
        }, opts);
    },

    /**
     * @public
     * @static
     * @memberOf Parser
     *
     * @method
     *
     * @returns {Error}
     * */
    ELENGTH: function (opts) {

        return extend(new Error(), {
            code: 'ELENGTH'
        }, opts);
    }

});

module.exports = Parser;
