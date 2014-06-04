'use strict';

var Http = require('http');

var Connect = /** @type Connect */ require('./track/Connect');
var Nested = /** @type Nested */ require('./bundle/Nested');
var Raw = /** @type Raw */ require('./parser/Raw');
var Router = /** @type Router */ require('finger/Router');
var Tracker = /** @type Tracker */ require('./Tracker');

var _ = /** @type _ */ require('lodash-node');

/**
 * @class Framework
 * @extends Tracker
 * */
var Framework = Tracker.extend(/** @lends Framework.prototype */ {

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
         * Тут откладываются запросы поступившие во время инициализации
         *
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Array<Track>}
         * */
        this._pends = [];

        /**
         * Количество запущенных инициализаций
         *
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Number}
         * */
        this._pending = 0;

        /**
         * Состояние приложения
         *
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Number}
         * */
        this._state = -1;

        /**
         * Плагины, задачи на инициализацию
         *
         * @protected
         * @memberOf {Framework}
         * @property
         * @type {Array<Function>}
         * */
        this._tasks = [];

        /**
         * Шаблоны для track.render()
         *
         * @public
         * @memberOf {Framework}
         * @property {Object<Function>}
         * */
        this.renderers = Object.create(null);

        /**
         * @public
         * @memberOf {Framework}
         * @property {Router}
         * */
        this.router = this._createRouter(this.params.router);
    },

    /**
     * Возвращает коллбэк для запросов на сервер
     *
     * @public
     * @memberOf {Framework}
     * @method
     *
     * @returns {Function}
     * */
    getHandler: function () {

        var self = this;

        return function (req, res) {

            var date = new Date();
            var track = self._createTrack(req, res);

            res.once('finish', function () {
                track.time = new Date() - date;
                self.emit('sys:response', track);
            });

            self.emit('sys:request', track);

            self._handle(track);
        };
    },

    /**
     * Запускает сервер и инициализацию приложения
     *
     * @public
     * @memberOf {Framework}
     * @method
     * */
    listen: function () {

        var server = Http.createServer(this.getHandler());

        server.listen.apply(server, arguments);

        //  автоматически запускаю инициализацию
        this.ready();

        return server;
    },

    /**
     * Добавляет плагин
     *
     * @public
     * @memberOf {Framework}
     * @method
     * */
    plug: function () {
        Array.prototype.push.apply(this._tasks, arguments);
    },

    /**
     * Запускает инициализацию приложения
     *
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

        this._state = -1;

        if ( 0 === this._pending ) {
            this.emit('sys:pending');
        }

        //  увеличиваю количество запросов на инициализацию
        this._pending += 1;

        //  нет задач
        if ( 0 === length ) {
            this._pending -= 1;

            if ( 0 === this._pending ) {
                this._state = 0;
                this.emit('sys:ready');
                // TODO RESEARCH: могут ли тут быть отложенные запросы?
            }

            return;
        }

        function ready (err) {

            //  разрешение плагина не требуется,
            // потому что уже произошла ошибка
            if ( 1 === self._state ) {

                return;
            }

            //  плагин разрешен с ошибкой
            if ( 1 === arguments.length ) {

                //  Если произошла критическая ошибка то вы можете
                // поджечь сами sys:ready если можете ее разрешить
                self.once('sys:ready', function () {
                    self._pending -= 1;
                    self._state = 0;
                    ready();
                });

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

            this._callFunc(this._tasks.shift(), this, [], ready);
        }
    },

    /**
     * Запускает операцию разрешения узла.
     * Если один из узлов, участвующих в операции
     * разрешения выполнил ответ приложения самостоятельно,
     * то коллбэк вызван не будет
     *
     * @public
     * @memberOf {Tracker}
     * @method
     *
     * @param {Connect} track
     * @param {String} path
     * @param {Function} done
     * */
    resolve: function (track, path, done) {

        function resolve () {

            if ( track.sent() ) {

                return;
            }

            done.apply(this, arguments);
        }

        return Framework.parent.resolve.call(this, track, path, resolve);
    },

    /**
     * Определяет маршрут встроенного роутера
     *
     * @public
     * @memberOf {Framework}
     * @method
     *
     * @param {String} pattern
     * @param {{unit?:String, name?:String}|String} [data]
     * */
    route: function (pattern, data) {

        var route;

        if ( Object(data) !== data ) {
            data = {name: data};
        }

        route = this.router.addRoute(pattern, data);

        if ( _.isUndefined(route.data.unit) || _.isNull(route.data.unit) ) {
            route.data.unit = route.data.name;
        }

        return this;
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Object} unit
     * @param {Runtime} track
     * @param {Bundle} bundle
     * @param {Function} done
     * */
    _call: function (unit, track, bundle, done) {

        if ( 'function' === typeof unit.data ) {
            this._callFunc(unit.data, unit,
                [track, bundle.errors, bundle.result], done);

            return;
        }

        this._callRet(unit.data, unit, done, true);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Function} func
     * @param {*} ctxt
     * @param {Array|Arguments} args
     * @param {Function} done
     * */
    _callFunc: function (func, ctxt, args, done) {

        var called = false;
        var self = this;

        function resolve () {

            if ( called ) {

                return;
            }

            called = true;

            done.apply(self, arguments);
        }

        //  Необходимо скопировать свойства функции, не нравится мне это!
        _.extend(resolve, done);
        args = args.concat(resolve);

        if ( 'GeneratorFunction' === func.constructor.name ) {
            this._callGenFn(func, ctxt, args, done);

            return;
        }

        func = func.apply(ctxt, args);

        if ( called || void 0 === func ) {

            return;
        }

        called = true;

        this._callRet(func, ctxt, done, true);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Object} gen
     * @param {*} ctxt
     * @param {*} result
     * @param {Boolean} isError
     * @param {Function} done
     * */
    _callGen: function (gen, ctxt, result, isError, done) {

        try {
            result = isError ? gen.throw(result) : gen.next(result);
        } catch (err) {
            done.call(this, err);

            return;
        }

        if ( result.done ) {
            this._callYield(result.value, ctxt, done);

            return;
        }

        this._callYield(result.value, ctxt, function (err, res) {

            if ( 1 === arguments.length ) {
                this._callGen(gen, ctxt, err, true, done);

                return;
            }

            this._callGen(gen, ctxt, res, false, done);
        });
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Function} func
     * @param {*} ctxt
     * @param {Array|Arguments} args
     * @param {Function} done
     * */
    _callGenFn: function (func, ctxt, args, done) {
        func = func.apply(ctxt, args);
        this._callGen(func, ctxt, void 0, false, done);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Object} obj
     * @param {*} ctxt
     * @param {Function} done
     * */
    _callObj: function (obj, ctxt, done) {

        var isError;
        var keys = _.keys(obj);
        var klen = keys.length;
        var result = Array.isArray(obj) ? [] : {};

        if ( 0 === klen ) {
            done.call(this, null, result);

            return;
        }

        isError = false;

        _.forOwn(keys, function (i) {

            function onReturned (err, res) {

                if ( isError ) {

                    return;
                }

                if ( 1 === arguments.length ) {
                    isError = true;
                    done.call(this, err);

                    return;
                }

                result[i] = res;
                klen -= 1;

                if ( 0 === klen ) {
                    done.call(this, null, result);
                }
            }

            this._callRet(obj[i], ctxt, onReturned, true);
        }, this);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Promise} promise
     * @param {Function} done
     * */
    _callPromise: function (promise, done) {

        var self = this;

        try {
            promise.then(function (res) {
                done.call(self, null, res);
            }, function (err) {
                done.call(self, err);
            });

        } catch (err) {
            done.call(this, err);
        }

    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Readable} stream
     * @param {Function} done
     * */
    _callStream: function (stream, done) {
        new Raw().parse(stream, done.bind(this));
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {*} val
     * @param {*} ctxt
     * @param {Function} done
     * @param {Boolean} [asis]
     *
     * @returns {Boolean}
     * */
    _callRet: function (val, ctxt, done, asis) {

        if ( Object(val) === val ) {

            if ( 'function' === typeof val ) {
                this._callFunc(val, ctxt, [], done);

                return true;
            }

            if ( 'function' === typeof val.next &&
                 'function' === typeof val.throw ) {
                this._callGen(val, ctxt, void 0, false, done);

                return true;
            }

            if ( 'function' === typeof val.pipe ) {
                this._callStream(val, done);

                return true;
            }

            try {

                if ( 'function' === typeof val.then ) {
                    this._callPromise(val, done);

                    return true;
                }

            } catch (err) {
                done.call(this, err);

                return true;
            }

            if ( asis ) {
                done.call(this, null, val);

                return true;
            }

            return false;
        }

        done.call(this, null, val);

        return true;
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {*} value
     * @param {*} ctxt
     * @param {Function} done
     * */
    _callYield: function (value, ctxt, done) {

        if ( this._callRet(value, ctxt, done) ) {

            return;
        }

        this._callObj(value, ctxt, done);
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
     * @param {*} [params]
     *
     * @returns {Router}
     * */
    _createRouter: function (params) {

        return new Router(params);
    },

    /**
     * @public
     * @memberOf {Framework}
     * @method
     *
     * @returns {Connect}
     * */
    _createTrack: function (req, res) {

        return new Connect(this, req, res);
    },

    /**
     * @protected
     * @memberOf {Framework}
     * @method
     *
     * @param {Connect} track
     * */
    _handle: function (track) {

        /*eslint complexity: [2, 11]*/
        var route;

        //  был сделан send() где-то в обработчке события sys:request
        if ( track.sent() ) {

            return;
        }

        //  При инициализации произошла ошибка
        if ( 1 === this._state ) {
            track.send(502);

            return;
        }

        //  еще не проинициализирован
        if ( -1 === this._state ) {

            //  отложить запрос
            this._pends.push(track);

            return;
        }

        route = this.router.find(track.method, track.url.pathname, track.route);

        //  однозначно нет такого маршрута
        if ( null === route ) {
            this.emit('sys:ematch', track);
            track.send(404);

            return;
        }

        //  возвращен массив
        if ( Array.isArray(route) ) {

            //  это тоже значит что нет такого роута
            this.emit('sys:ematch', track);

            //  если массив пустой, то на сервере совсем нет ни одного
            //  маршрута отвечающего по такому методу запроса
            if ( 0 === route.length ) {

                //  Not Implemented
                track.send(501);

                return;
            }

            //  Иначе есть такие маршруты, но для них не
            // поддерживается такой метод
            track.header('Allow', route.join(', '));

            //  Method Not Allowed
            track.send(405);

            return;
        }

        track.match = route.match;
        route = route.route;
        track.route = route.data.name;

        this.emit('sys:match', track);

        this.resolve(track, route.data.unit, function (err, res) {

            if ( 2 > arguments.length ) {
                track.send(500, err);

                return;
            }

            track.send(200, res);
        });
    }

});

module.exports = Framework;
