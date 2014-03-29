'use strict';

var Class = require('fist.lang.class/Class');
var Pathr = /** @type Pathr */ require('../route/Pathr');

var _ = /** @type _*/ require('lodash');

/**
 * @class Router
 * @extends Router
 * */
var Router = Class.extend(/** @lends Router.prototype */ {

    /**
     * @protected
     * @memberOf {Router}
     * @method
     *
     * @constructs
     * */
    constructor: function () {
        Router.Parent.apply(this, arguments);

        /**
         * @public
         * @memberOf {Router}
         * @property {Array<Route>}
         * */
        this.routes = [];

        /**
         * @public
         * @memberOf {Router}
         * @property {Object}
         * */
        this.verbs = Object.create(null);
    },

    /**
     * @public
     * @memberOf {Router}
     * @method
     *
     * @param {String} verb     метод запроса
     * @param {String} expr     шаблон урла запроса
     * @param {*} name          id маршрута (должен быть уникальным)
     * @param {*} [data]        любые закрепленные данные
     * @param {*} [opts]        опции для роута
     *
     * @returns {Route}
     * */
    addRoute: function (verb, expr, name, data, opts) {

        var i;
        var route;

        i = this.routes.length;

        while ( i ) {
            i -= 1;

            if ( name === this.routes[i].name ) {
                this.verbs[this.routes[i].verb] -= 1;
                this.routes.splice(i, 1);
            }
        }

        opts = _.extend(Object.create(null), this.params, opts);
        route = this._createRoute(expr, opts);

        route.data = data;
        route.name = name;
        route.verb = verb = verb.toUpperCase();

        if ( verb in this.verbs ) {
            this.verbs[verb] += 1;
        } else {

            this.verbs[verb] = 1;
        }

        this.routes.push(route);

        return route;
    },

    /**
     * @public
     * @memberOf {Router}
     * @method
     *
     * @param {Connect} track
     *
     * @returns {null|Object|Array<String>}
     * */
    find: function (track) {
        /*eslint complexity: [2,9]*/
        var i;
        var l;
        var match;
        var verb = track.method.toUpperCase();

        var verbs = [];
        var found = [];

        //  Нет ни одного маршрута такого типа
        if ( !(verb in this.verbs) ) {

            if ( !('HEAD' === verb && 'GET' in this.verbs ) ) {

                //  501
                return [];
            }
        }

        for ( i = 0, l = this.routes.length; i < l; i += 1 ) {
            match = this._match(this.routes[i], track);

            if ( null === match ) {

                continue;
            }

            if ( verb === this.routes[i].verb ) {

                //  Строгое соответствие method+pattern
                return {
                    match: match,
                    route: this.routes[i]
                };
            }

            //  временно сохраняем маршруты подходящие по матчу,
            // но не подходящие по методу
            found[found.length] = {
                match: match,
                route: this.routes[i]
            };

            verbs[verbs.length] = this.routes[i].verb;
        }

        //  ни одного совпадения
        if ( 0 === found.length ) {

            return null;
        }

        //  для HEAD метода сойдет GET
        if ( 'HEAD' === verb ) {
            i = verbs.indexOf('GET');

            if ( -1 !== i ) {

                return found[i];
            }
        }

        //  405
        return _.uniq(verbs);
    },

    /**
     * @public
     * @memberOf {Router}
     * @method
     *
     * @param {String} name
     *
     * @returns {Route}
     * */
    getRoute: function (name) {

        var routes = this.routes;
        var l = routes.length;

        while ( l ) {
            l -= 1;

            if ( routes[l].name === name ) {

                return routes[l];
            }
        }

        return null;
    },

    /**
     * @protected
     * @memberOf {Pathr}
     * @method
     *
     * @param {String} expr
     * @param {Object} [opts]
     *
     * @returns {Pathr}
     * */
    _createRoute: function (expr, opts) {

        return new Pathr(expr, opts);
    },

    /**
     * @protected
     * @memberOf {Track}
     * @method
     *
     * @param {Route} route
     * @param {Connect} track
     *
     *
     * @returns {*}
     * */
    _match: function (route, track) {

        return route.match(track.url.pathname);
    }

});

module.exports = Router;
