'use strict';

var BaseUnit = /** @type Unit */ require('./unit/_unit');
var Cache = /** @type Cache */ require('./util/Cache');
var Channel = /** @type Channel */ require('./util/channel');

var _ = require('lodash-node');
var inherit = require('inherit');
var vow = require('vow');

/**
 * @class Agent
 * @extends Channel
 * */
var Agent = inherit(Channel, /** @lends Agent.prototype */ {

    /**
     * @private
     * @memberOf {Agent}
     * @method
     *
     * @constructs
     *
     * @param {Object} [params]
     * */
    __constructor: function (params) {
        this.__base();

        /**
         * @public
         * @memberOf {Agent}
         * @property
         * @type {Object}
         * */
        this.params = _.extend({
            cwd: process.cwd()
        }, this.params, params);

        /**
         * @public
         * @memberOf {Agent}
         * @property
         * @type {Cache}
         * */
        this.cache = this._createCache(this.params.cache);

        /**
         * @public
         * @memberOf {Agent}
         * @property
         * @type {Object}
         * */
        this.units = {};

        /**
         * @private
         * @memberOf {Agent}
         * @property
         * @type {Array}
         * */
        this.__decls = [];
    },

    /**
     * @public
     * @memberOf {Agent}
     * @method
     *
     * @param {String} path
     *
     * @returns {Unit}
     * */
    getUnit: function (path) {

        return (this.units[path] || [])[1];
    },

    /**
     * @public
     * @memberOf {Agent}
     * @method
     *
     * @param {Object} members
     * @param {Object} [statics]
     *
     * @returns {Agent}
     * */
    unit: function (members, statics) {
        this.__decls.push([Object(members), statics]);

        return this;
    },

    /**
     * @public
     * @memberOf {Agent}
     * @method
     *
     * @param {Boolean} [force]
     *
     * @returns {vow.Promise}
     * */
    ready: function (force) {

        if ( this._fistReady && !force ) {

            return this._fistReady;
        }

        this.emit('sys:pending');

        this._fistReady = this._getReady();

        this._fistReady.then(function () {
            this.emit('sys:ready');
        }, function (err) {
            this.emit('sys:eready', err);
        }, this);

        return this._fistReady;
    },

    /**
     * @protected
     * @memberOf {Agent}
     * @method
     *
     * @param {Object} params
     *
     * @returns {Cache}
     * */
    _createCache: function (params) {

        return new Cache(params);
    },

    /**
     * @protected
     * @memberOf {Agent}
     * @method
     *
     * @returns {vow.Promise}
     * */
    _getReady: function () {

        var defer = vow.defer();
        var self = this;

        defer.resolve(vow.invoke(function () {

            return self.__createUnits(self.__decls);
        }));

        defer.promise().then(function (units) {
            this.units = units;
        }, this);

        return defer.promise();
    },

    /**
     * @private
     * @memberOf {Agent}
     * @method
     *
     * @param {Array} decls
     *
     * @returns {Object}
     * */
    __createUnits: function (decls) {

        var conflicts;
        var remaining = decls.length;
        var units = {
            _unit: BaseUnit
        };

        while ( _.size(decls) ) {
            decls = this.__addUnits(decls, units);

            if ( _.size(decls) < remaining ) {
                remaining = decls.length;

                continue;
            }

            throw new ReferenceError('no base unit for: ' +
                _.map(decls, formatBaseConflictDetails).join(', '));
        }

        units = _.reduce(units, function (units, Unit, path) {

            if ( /^[a-z]/i.test(path) ) {
                units[path] = [Unit, new Unit(this.params)];
            }

            return units;
        }, {}, this);

        conflicts = findAllConflicts(units);

        if ( !_.size(conflicts) ) {

            return units;
        }

        throw new ReferenceError(
                'unit dependencies conflict: ' +
                _.map(conflicts, formatDepsConflictDetails).join(', '));
    },

    /**
     * @private
     * @memberOf {Agent}
     * @method
     *
     * @param {Array} decls
     * @param {Object} units
     *
     * @returns {Array}
     * */
    __addUnits: function (decls, units) {

        return _.reduce(decls, function (decls, decl) {

            var Unit;
            var base;
            var members = decl[0];
            var unit;

            //  Если не передали base, то сами добьем
            if ( _.has(members, 'base') ) {
                base = members.base;

            } else {
                base = '_unit';
            }

            if ( !_.isArray(base) ) {
                base = [base];
            }

            unit = base[0];

            if ( _.has(units, unit) ) {
                base = [units[unit]].concat(_.rest(base, 1));
                Unit = /** @type Unit */ inherit(base, members, decl[1]);
                units[members.path] = Unit;

                return decls;
            }

            decls.push(decl);

            return decls;
        }, [], this);
    }

});

/**
 * @private
 * @static
 * @memberOf Agent
 * @method
 *
 * Находит конфликты зависимостей в готовом комплекте
 * проинстанцированных узлов
 *
 * @param {Object} units
 *
 * @returns {Array}
 * */
function findAllConflicts (units) {

    var found4 = {};

    return _.reduce(units, function (conflicts, unit, path) {

        return conflicts.concat(findConflicts(path, units, [], found4));
    }, []);
}

/**
 * @private
 * @static
 * @memberOf Agent
 * @method
 *
 * Находит конфликты зависимостей для одного узла
 *
 * @param {String} part
 * @param {Object} units
 * @param {Array} path
 * @param {Object} found4
 *
 * @returns {Array}
 * */
function findConflicts (part, units, path, found4) {

    var decl = units[part];
    var deps;
    var paths = [];

    if ( _.has(found4, part) ) {

        return paths;
    }

    if ( _.isUndefined(decl) ) {

        return paths;
    }

    deps = decl[1].deps;

    if ( !_.size(deps) ) {

        return paths;
    }

    _.forEach(deps, function (dep) {
        var branch = _.clone(path);

        branch.push(dep);

        if ( _.contains(path, dep) ) {
            paths.push(branch);

            return;
        }

        paths = paths.concat(findConflicts(dep, units, branch, found4));
    });

    found4[part] = true;

    return paths;
}

/**
 * @private
 * @static
 * @memberOf Agent
 * @method
 *
 * @param {Array} decl
 *
 * @returns {String}
 * */
function formatBaseConflictDetails (decl) {

    return decl[0].path + ' (needs ' + decl[0].base + ')';
}

/**
 * @private
 * @static
 * @memberOf Agent
 * @method
 *
 * @param {Array<String>} path
 *
 * @returns {String}
 * */
function formatDepsConflictDetails (path) {

    return path.join(' < ');
}

module.exports = Agent;
