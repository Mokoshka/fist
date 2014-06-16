'use strict';

var REDIRECT_CODES = [300, 301, 302, 303, 305, 307];
var STATUS_CODES = require('http').STATUS_CODES;

var BodyParser = /** @type BodyParser */ require('../util/BodyParser');
var ContentType = /** @type ContentType */ require('../util/ContentType');
var Raw = /** @type Raw */ require('../parser/Raw');
var Track = /** @type Track */ require('./Track');
var Url = require('url');

var _ = require('lodash-node');
var cookie = require('cookie');
var inherit = require('inherit');
var vow = require('vow');

/**
 * @class Connect
 * @extends Track
 * */
var Connect = inherit(Track, /** @lends Connect.prototype */ {

    /**
     * @private
     * @memberOf {Connect}
     * @method
     *
     * @constructs
     * */
    __constructor: function (agent, req, res) {
        this.__base(agent);

        /**
         * @public
         * @memberOf {Connect}
         * @property
         * @type {*}
         * */
        this.match = null;

        /**
         * @public
         * @memberOf {Connect}
         * @property
         * @type {String}
         * */
        this.method = req.method.toUpperCase();

        /**
         * @public
         * @memberOf {Connect}
         * @property
         * @type {String}
         * */
        this.route = null;

        /**
         * @public
         * @memberOf {Connect}
         * @property
         * @type {Object}
         * */
        this.url = this.__self.fetchUrl(req);

        /**
         * @protected
         * @memberOf {Connect}
         * @property
         * @type {Object}
         * */
        this._req = req;

        /**
         * @protected
         * @memberOf {Connect}
         * @property
         * @type {http.IncomingMessage}
         * */
        this._res = res;
    },

    /**
     * Возвращает аргумент запроса из pathname или query
     *
     * @public
     * @memberOf {Connect}
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
     * Возвращает body в разобранном виде
     *
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @returns {vow.Promise}
     * */
    body: function () {

        var params;

        if ( !vow.isPromise(this._body) ) {
            params = _.extend(this.mime().toParams(),
                //  в глобальных опциях body можно определить настройки,
                // которые будут ограничивать параметры запроса
                this.agent.params.body, {
                    //  кроме этого!
                    // По наличию этого параметра определяется в принципе
                    // есть ли body у запроса причем оно
                    // должно всегда соответствовать реально длине тела
                    length: this.header('Content-Length')
                });

            this._body = this._createBodyParser(params).parse(this._req);
        }

        return this._body;
    },

    /**
     * Создает path по одному из маршрутов
     *
     * @public
     * @memberOf {Connect}
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
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @param {String} name
     * @param {Object} [params]
     * */
    goToPath: function (name, params) {

        return this.redirect(this.buildPath(name, params));
    },

    /**
     * Читает заголовок запроса или ставит заголовок ответа
     *
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @param {String} [name]
     * @param {*} [value]
     * @param {Boolean} [soft] set only if not already set
     *
     * @returns {*}
     * */
    header: function (name, value, soft) {
        /*eslint consistent-return: 0*/
        if ( _.isObject(name) ) {
            soft = value;

            _.forOwn(name, function (value, name) {
                this._setHead(name, value, soft);
            }, this);

            return;
        }

        if ( 2 > arguments.length ) {

            if ( 0 === arguments.length ) {

                return this._req.headers;
            }

            return this._getHead(name);
        }

        this._setHead(name, value, soft);
    },

    /**
     * Читает куку или ставит ее
     *
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @param {String} [name]
     * @param {String} [value]
     * @param {Object} [opts]
     * */
    cookie: function (name, value, opts) {

        var cookies;

        if ( 2 > arguments.length ) {

            if ( !this._cookies ) {
                this._cookies = cookie.parse(this._req.headers.cookie || '');
            }

            cookies = this._cookies;

            if ( 0 === arguments.length ) {

                return cookies;
            }

            return cookies[name];
        }

        if ( null === value ) {
            value = '';

            if ( !opts ) {
                opts = {};
            }

            opts.expires = new Date();
        }

        value = cookie.serialize(name, value, opts);

        return this._setHead('Set-Cookie', value);
    },

    /**
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @param {String} [mime]
     * @param {Object} [params]
     *
     * @returns {ContentType|void}
     * */
    mime: function (mime, params) {

        //  getter
        if ( 0 === arguments.length ) {

            if ( !this._reqMime ) {
                this._reqMime = new ContentType(this.header('Content-Type'));
            }

            return this._reqMime;
        }

        //  setter
        this._setHead('Content-Type', ContentType.create(mime, params));
    },

    /**
     * Шортхэнд для редиректов
     *
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @param {*} [code]
     * @param {String} url
     * */
    redirect: function (code, url) {

        if ( _.isNumber(code) ) {

            if ( !_.contains(REDIRECT_CODES, code) ) {
                code = 302;
            }

        } else {
            url = code;
            code = 302;
        }

        this._setHead('Location', url);

        url = _.escape(url);

        //  TODO смотреть на Accept!
        if ( 'text/html' === new ContentType(this._res.
            getHeader('Content-Type')).value ) {

            url = '<a href="' + url + '">' + url + '</a>';
        }

        this.send(code, url);
    },

    /**
     * Выполняет шаблонизацию переданных данных и
     * выполняет ответ приложения
     *
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @param {*} [code]
     * @param {String} id
     * @param {*} [arg...]
     * */
    render: function (code, id, arg) {
        /*eslint no-unused-vars: 0*/
        var args;
        var i;

        if ( _.isNumber(code) ) {
            i = 2;
            this.status(code);

        } else {
            i = 1;
            id = code;
        }

        args = _.rest(arguments, i);
        this.send(this.agent.renderers[id].apply(this, args));
    },

    /**
     * Выполняет ответ приложения
     *
     * @public
     * @memberOf {Connect}
     * @method
     * */
    send: function () {
        this.send = Connect.noop;
        this._respond.apply(this, arguments);
    },

    /**
     * Проверяет, был ли выполнен ответ приложением
     *
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @returns {Boolean}
     * */
    sent: function () {

        return this.send === Connect.noop;
    },

    /**
     * Ставит статус ответа или возыращает его
     *
     * @public
     * @memberOf {Connect}
     * @method
     *
     * @param {Number} [statusCode]
     *
     * @returns {Number}
     * */
    status: function (statusCode) {

        if ( 0 === arguments.length ) {

            return this._res.statusCode;
        }

        this._res.statusCode = statusCode;

        return statusCode;
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {*} [params]
     *
     * @returns {BodyParser}
     * */
    _createBodyParser: function (params) {

        return new BodyParser(params);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {String} name
     * @param {*} value
     * @param {Boolean} [soft]
     * */
    _setHead: function (name, value, soft) {
        name = String(name).toLowerCase();

        if ( soft && this._res.getHeader(name) ) {

            return;
        }

        if ( 'set-cookie' === name ) {
            value = (this._res.getHeader(name) || []).concat(value);
            this._res.setHeader(name, value);

            return;
        }

        this._res.setHeader(name, value);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {String} name
     *
     * @returns {String}
     * */
    _getHead: function (name) {

        return this._req.headers[ String(name).toLowerCase() ];
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {*} [status]
     * @param {*} [body]
     * */
    _respond: function (status, body) {

        if ( _.isNumber(status) && _.has(STATUS_CODES, status) ) {
            this._res.statusCode = status;

            if ( 2 > arguments.length ) {
                body = STATUS_CODES[status];
            }

        } else {
            body = status;
        }

        if ( void 0 === body ) {
            body = STATUS_CODES[this._res.statusCode];
        }

        this._writeBody(body);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {*} [body]
     * */
    _writeBody: function (body) {

        if ( _.isString(body) ) {
            this._writeString(body);

            return;
        }

        if ( Buffer.isBuffer(body) ) {
            this._writeBuffer(body);

            return;
        }

        if ( _.isObject(body) && _.isFunction(body.pipe) ) {
            this._writeReadable(body);

            return;
        }

        if ( body instanceof Error ) {
            this._writeError(body);

            return;
        }

        this._writeJson(body);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {Error} body
     * */
    _writeError: function (body) {

        if ( 500 <= this._res.statusCode ) {

            if ( this.agent.params.staging ) {
                this._writeString(STATUS_CODES[this._res.statusCode]);

                return;
            }

            this._writeString(body.stack);

            return;
        }

        this._writeJson(body);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {String} body
     * */
    _writeString: function (body) {
        this._setHead('Content-Type', 'text/plain', true);
        this._setHead('Content-Length', Buffer.byteLength(body), true);
        this._res.end(body);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {Buffer} body
     * */
    _writeBuffer: function (body) {
        this._setHead('Content-Type', 'application/octet-stream', true);
        this._setHead('Content-Length', body.length, true);
        this._res.end(body);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {*} body
     * */
    _writeJson: function (body) {
        body = JSON.stringify(body);
        this._setHead('Content-Type', 'application/json', true);
        this._setHead('Content-Length', Buffer.byteLength(body), true);
        this._res.end(body);
    },

    /**
     * @protected
     * @memberOf {Connect}
     * @method
     *
     * @param {*} body
     * */
    _writeReadable: function (body) {

        var self = this;

        if ( this._res.getHeader('Content-Length') ) {
            this._setHead('Content-Type', 'application/octet-stream', true);

            body.on('error', function (err) {
                self._res.removeHeader('Content-Type');
                self._respond(500, err);
            });

            body.pipe(this._res);

            return;
        }

        new Raw().parse(body).done(function (body) {
            this._setHead('Content-Type', 'application/octet-stream', true);
            this._setHead('Content-Length', body.length, true);
            this._res.end(body);
        }, function (err) {
            this._respond(500, err);
        }, this);
    }

}, {

    /**
     * @public
     * @static
     * @memberOf Connect
     * @method
     * */
    noop: function () {},

    /**
     * @public
     * @static
     * @memberOf Connect
     * @method
     *
     * @returns {Object}
     * */
    fetchUrl: function (req) {

        var headers = req.headers;
        var url = Url.parse(req.url);
        var value = headers['x-forwarded-host'] || headers.host;

        url.host = value.split(/\s*,\s*/)[0];

        if ( req.socket.encrypted ) {
            value = 'https';

        } else {
            value = headers['x-forwarded-proto'] || 'http';
        }

        url.protocol = value;
        url = Url.format(url);

        return Url.parse(url, true);
    }

});

module.exports = Connect;
