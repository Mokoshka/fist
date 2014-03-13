'use strict';

var Ask = /** @type Ask */ require('../util/Ask');
var Unit = /** @type Unit */ require('./Unit');

var asker = require('asker');

/**
 * @class Request
 * @extends Unit
 * */
var Request = Unit.extend(/** @lends Request.prototype */ {

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Connect} track
     * @param {Object} errors
     * @param {Object} result
     * @param {Function} done
     *
     * @returns {Ask}
     * */
    _createAsk: function (track, errors, result, done) {

        return new Ask(track, errors, result, done);
    },

    /**
     * @public
     * @memberOf {Request}
     * @method
     *
     * @param {Connect} track
     * @param {Object} errors
     * @param {Object} result
     * @param {Function} done
     * */
    data: function (track, errors, result, done) {

        var ask = this._createAsk(track, errors, result, done.bind(this));

        this._options(ask);

        ask.next(function (res, done) {
            ask.opts = res;
            done(null, res);
        }, function (err) {
            ask.opts = err;
            track.agent.emitEvent('sys:req:eoptions', ask);
            this._onEOPTIONS(ask);
        }, this);

        this._setup(ask);

        ask.next(function (res, done) {
            track.agent.emit('sys:req:request', ask);
            done(null, res);
        }, function (err) {
            ask.opts = err;
            track.agent.emit('sys:req:esetup', ask);
            this._onESETUP(ask);
        }, this);

        //  там выполнился реквест
        this._request(ask);

        ask.next(function (res, done) {
            ask.data = res;
            done(null, res);
        }, function (err) {
            ask.data = err;
            track.agent.emitEvent('sys:req:erequest', ask);
            this._onEREQUEST(ask);
        }, this);

        this._parse(ask);

        ask.next(function (res, done) {
            ask.data.data = res;
            done(null, ask.data);
        }, function (err) {
            ask.data = err;
            track.agent.emitEvent('sys:req:erequest', ask);
            this._onEREQUEST(ask);
        }, this);

        ask.next(function (res, done) {
            track.agent.emitEvent('sys:req:success', ask);
            done(null, res);
        }, this);

        this._template(ask);

        ask.next(function (res) {
            ask.done(null, res);
        }, function (err) {
            ask.done(err);
        });
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Ask} ask
     * */
    _setup: function (ask) {
        /*eslint no-unused-vars: 0*/
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Ask} ask
     * */
    _request: function (ask) {
        ask.next(function (opts, done) {
            asker(opts, function (err, res) {
                if ( err ) {
                    done(err);
                } else {
                    done(null, res);
                }
            });
        });
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Object} ask
     * */
    _onEOPTIONS: function (ask) {
        ask.done(ask.opts);
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Object} ask
     * */
    _onEREQUEST: function (ask) {
        ask.done(ask.data);
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Object} ask
     * */
    _onESETUP: function (ask) {
        ask.done(ask.opts);
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Ask} ask
     * */
    _options: function (ask) {
        ask.next(function (res, done) {
            done(null, {
                port: 80,
                path: '/',
                method: 'GET',
                protocol: 'http:'
            });
        });
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Object} ask
     * */
    _parse: function (ask) {
        ask.next(function (res, done) {
            try {
                done(null, JSON.parse(res.data));
            } catch (err) {
                done(err);
            }
        });
    },

    /**
     * @protected
     * @memberOf {Request}
     * @method
     *
     * @param {Object} ask
     * */
    _template: function (ask) {
        ask.next(function (res, done) {
            done(null, res);
        });
    }

});

module.exports = Request;
