'use strict';

var Http = require('http');
var Nested = /** @type Nested */ require('./bundle/Nested');
var Runtime = /** @type Runtime */ require('./track/Runtime');
var Server = /** @type Server */ require('./Server');
var Toobusy = /** @type Toobusy */ require('./util/Toobusy');

var caller = require('./util/caller');

/**
 * @class Framework
 * @extends Server
 * */
var Framework = Server.extend(/** @lends Framework.prototype */ {

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @constructs
     * */
    constructor: function () {
        Framework.Parent.apply(this, arguments);

        /**
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Array}
         * */
        this._tasks = [];

        /**
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Array}
         * */
        this._pends = [];

        /**
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Number}
         * */
        this._pending = 0;

        /**
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Number}
         * */
        this._state = -1;

        /**
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Toobusy}
         * */
        this._toobusy = new Toobusy({
            maxLag: this.params.busyHWM
        });

        /**
         * @public
         * @memberOf {Framework}
         * @property {Object<Function>}
         * */
        this.renderers = Object.create(null);
    },

    /**
     * @public
     * @memberOf {Framework}
     * @method
     * */
    listen: function () {

        var server = Http.createServer(this.getHandler());

        server.listen.apply(server, arguments);
        //  автоматически запускаю инициализацию
        this.ready();
    },

    /**
     * @public
     * @memberOf {Framework}
     * @method
     * */
    ready: function () {

        var length = this._tasks.length;
        var self = this;

        //  приложение в состоянии ошибки
        if ( 1 === this._state ) {

            return;
        }

        //  нет задач
        if ( 0 === length ) {

            return;
        }

        //  увеличиваю количество запросов на инициализацию
        this._pending += 1;

        if ( 1 === this._pending ) {
            this.emit('sys:pending');
        }

        function ready (err) {

            //  разрешение плагина не требуется,
            // потому что уже произошла ошибка
            if ( 1 === self._state ) {

                return;
            }

            //  плагин разрешен с ошибкой
            if ( 2 > arguments.length ) {
                self._state = 1;
                self.emit('sys:error', err);

                return;
            }

            //  уменьшаем количество разрешенных задач
            length -= 1;

            //  все задачи разрешены
            if ( 0 === length ) {
                //  уменьшаем количество запросов на инициализацию
                self._pending -= 1;

                //  все запросы на инициализацию завершены
                if ( 0 === self._pending ) {
                    self._state = 0;
                    self.emit('sys:ready');

                    while ( self._pends.length ) {
                        self._handle(self._pends.shift());
                    }
                }
            }
        }

        while ( this._tasks.length ) {

            if ( 1 === self._state ) {

                break;
            }

            this._tasks.shift().call(this, ready);
        }
    },

    /**
     * @public
     * @memberOf {Framework}
     * @method
     * */
    plug: function () {
        Array.prototype.push.apply(this._tasks, arguments);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Function} func
     * @param {Runtime} track
     * @param {Bundle} bundle
     * @param {Function} done
     * */
    _call: function (func, track, bundle, done) {

        if ( 'function' === typeof func ) {
            caller.callFunc(func, [track, bundle.errors, bundle.result], done);

            return;
        }

        caller.callRet(func, done);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @returns {Nested}
     * */
    _createBundle: function () {

        return new Nested();
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @returns {Runtime}
     * */
    _createTrack: function (req, res) {

        return new Runtime(this, req, res);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Runtime} track
     * */
    _handle: function (track) {

        if ( this._toobusy.busy() ) {
            track.send(503);

            return;
        }

        if ( 0 === this._pending ) {
            Framework.parent._handle.apply(this, arguments);

            return;
        }

        this._pends.push(track);
    }

});

module.exports = Framework;
