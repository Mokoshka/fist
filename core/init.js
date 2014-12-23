'use strict';

var Context = /** @type Context */ require('./context');
var FistError = /** @type FistError */ require('./fist-error');
var LRUDictTtlAsync = /** @type LRUDictTtlAsync */ require('lru-dict/core/lru-dict-ttl-async');
var Obus = /** @type Obus */ require('obus');

var _ = require('lodash-node');
var f = require('util').format;
var hasProperty = Object.prototype.hasOwnProperty;
var inherit = require('inherit');
var vow = require('vow');

function init(agent) {
    /*eslint max-params: 0*/

    /**
     * @public
     * @memberOf agent
     * @property
     * @type {Object}
     * */
    agent.caches = {

        /**
         * default cache interface "local"
         *
         * @public
         * @memberOf agent.caches
         * @property
         * @type {LRUDictTtlAsync}
         * */
        local: new LRUDictTtlAsync(0xffff)
    };

    /**
     * Common Fist Unit interface
     * @class Unit
     * */
    function Unit() {
        //  check dependencies issues
        assertDepsOk(agent.getUnitClass(this.name), []);

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Object}
         * */
        this.params = _.extend({}, this.params);

        if (!_.has(agent.caches, this.cache)) {
            throw new FistError('UNKNOWN_CACHE', f('You should define app.caches[%j] interface', this.cache));
        }

        /**
         * @protected
         * @memberOf {Unit}
         * @method
         * @property
         * */
        this._cache = agent.caches[this.cache];

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Object}
         * */
        this.deps = _.uniq(this.deps);

        Object.freeze(this.deps);

        /**
         * @this {Unit}
         * */
        this.depsMap = _.reduce(this.deps, function (depsMap, name) {
            if (_.has(this.depsMap, name)) {
                depsMap[name] = this.depsMap[name];
            } else {
                depsMap[name] = name;
            }

            return depsMap;
        }, {}, this);

        Object.freeze(this.depsMap);

        /**
         * @this {Unit}
         * */
        this.depsArgs = _.reduce(this.deps, function (depsArgs, name) {
            var args = this.depsArgs[name];
            if (_.isFunction(args)) {
                depsArgs[name] = args.bind(this);
            } else {
                depsArgs[name] = function () {
                    return args;
                };
            }
            return depsArgs;
        }, {}, this);

        Object.freeze(this.depsArgs);
    }

    Unit.prototype = {

        /**
         * @public
         * @memberOf {Unit}
         * @method
         *
         * @constructs
         * */
        constructor: Unit,

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * */
        name: 0,

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {String}
         * */
        cache: 'local',

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Number}
         * */
        maxAge: 0,

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Object}
         * */
        params: {},

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Object}
         * */
        depsArgs: {},

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Object}
         * */
        depsMap: {},

        /**
         * @public
         * @memberOf {Unit}
         * @property
         * @type {Array}
         * */
        deps: [],

        /**
         * @public
         * @memberOf {Unit}
         * @method
         *
         * @param {Object} track
         * @param {Object} context
         * @param {Function} done
         *
         * @returns {*}
         * */
        call: function (track, context, done) {
            var dStartExec = new Date();
            var result;

            context.logger.debug('Pending...');

            fetch(this, track, context, function (err, val) {
                var execTime = new Date() - dStartExec;

                if (err) {
                    if (track.isFlushed()) {
                        context.logger.warn('Skip error in %dms', execTime, err);
                    } else {
                        context.logger.error('Rejected in %dms', execTime, err);
                    }

                    done(err);

                    return;
                }

                if (val) {
                    context.logger.debug('Accepted in %dms', execTime);
                } else {
                    context.logger.debug('Skip result in %dms', execTime);
                }

                done(null, val);
            });
        },

        /**
         * @public
         * @memberOf {Unit}
         * @method
         *
         * @param {Object} track
         * @param {Object} args
         *
         * @returns {*}
         * */
        identify: function (track, args) {
            /*eslint no-unused-vars: 0*/
            return 'static';
        },

        /**
         * @public
         * @memberOf {Unit}
         * @method
         *
         * @param {Object} track
         * @param {*} [args]
         *
         * @returns {Object}
         * */
        createContext: function (track, args) {
            /*eslint complexity: 0*/
            var context = new Context(track.logger.bind(/** @type {String} */ this.name));
            var k;

            for (k in this.params) {
                if (hasProperty.call(this.params, k)) {
                    context.params[k] = this.params[k];
                }
            }

            for (k in track.params) {
                if (hasProperty.call(track.params, k)) {
                    context.params[k] = track.params[k];
                }
            }

            for (k in args) {
                if (hasProperty.call(args, k)) {
                    context.params[k] = args[k];
                }
            }

            return context;
        },

        /**
         * @public
         * @memberOf {Unit}
         * @method
         *
         * @param {Object} track
         * @param {Object} context
         *
         * @returns {*}
         * */
        main: /* istanbul ignore next */ function (track, context) {
            /*eslint no-unused-vars: 0*/
        }

    };

    /**
     * @public
     * @static
     * @memberOf {Unit}
     * @method
     *
     * @param {Object} [members]
     * @param {Object} [statics]
     *
     * @returns {Function}
     * */
    Unit.inherit = function (members, statics) {
        var deps = this.prototype.deps;
        var mixins = [];

        members = Object(members);

        if (members.deps) {
            deps = deps.concat(members.deps);
        }

        if (members.mixins) {
            mixins = mixins.concat(members.mixins);
        }

        members.deps = _.reduce(mixins, function (deps, Mixin) {
            if (_.isFunction(Mixin) && Mixin.prototype.deps) {
                deps = deps.concat(Mixin.prototype.deps);
            }

            return deps;
        }, deps);

        return inherit([this].concat(mixins), members, statics);
    };

    var checked = {};

    function assertDepsOk(Unit, trunk) {

        if (/^[^a-z]/i.test(Unit.prototype.name) || _.has(checked, Unit.prototype.name)) {
            return;
        }

        _.forEach(Unit.prototype.deps, function (name) {
            var Dependency = agent.getUnitClass(name);
            var branch = trunk.concat(name);

            if (!Dependency) {
                throw new FistError(FistError.NO_SUCH_UNIT,
                    f('There is no dependency %j for unit %j', name, Unit.prototype.name));
            }

            if (_.contains(trunk, name)) {
                throw new FistError(FistError.DEPS_CONFLICT,
                    f('Recursive dependencies found: "%s"', branch.join('" < "')));
            }

            assertDepsOk(Dependency, branch);
        });

        checked[Unit.prototype.name] = true;
    }

    function fetch(self, track, context, done) {
        var dDepsStart;
        var deps = self.deps;
        var i;
        var l = deps.length;
        var remaining = l;

        context.keys = new Array(l);
        context.skipCache = false;
        context.needUpdate = false;

        if (remaining === 0) {
            cache(self, track, context, done);
            return;
        }

        dDepsStart = new Date();

        function fetchDep(i) {
            var name = deps[i];
            var args = self.depsArgs[name](track, context);
            var path = self.depsMap[name];

            agent.callUnit(track, name, args, function (err, val) {

                if (track.isFlushed()) {
                    context.logger.debug('The track was flushed by deps, skip invocation');
                    done(null, null);
                    return;
                }

                if (err) {
                    context.skipCache = true;
                    Obus.add(context.errors, path, err);
                } else {
                    if (val.updated) {
                        context.needUpdate = true;
                    }
                    context.keys[i] = val.identity;
                    Obus.add(context.result, path, val.result);
                }

                remaining -= 1;

                if (remaining === 0) {
                    context.logger.debug('Deps %j resolved in %dms', deps, new Date() - dDepsStart);
                    cache(self, track, context, done);
                }
            });
        }

        for (i = 0; i < l; i += 1) {
            fetchDep(i);
        }
    }

    /**
     * @public
     * @memberOf {Agent}
     * @property
     * @type {Function}
     * */
    agent.Unit = Unit;
}

function cache(self, track, context, done) {
    var identity = context.identity;
    var cacheKey;

    if (!(self.maxAge > 0) || context.skipCache) {
        main(self, track, context, identity, done);
        return;
    }

    cacheKey = self.name + '-' + identity + '-' + context.keys.join('-');

    if (context.needUpdate) {
        update(self, track, context, identity, cacheKey, done);
        return;
    }

    self._cache.get(cacheKey, function (err, val) {
        if (!err && val) {
            context.logger.debug('Found in cache');

            val = {
                result: val.result,
                updated: false,
                identity: val.identity
            };

            done(null, val);
            return;
        }

        if (err) {
            context.logger.warn('Failed to load cache', err);
        } else {
            context.logger.note('Outdated');
        }

        update(self, track, context, identity, cacheKey, done);
    });
}

function main(self, track, context, identity, done) {
    var res;

    try {
        res = self.main(track, context);
    } catch (err) {
        if (vow.isPromise(err)) {
            vow.reject(err).fail(done);
        } else {
            done(err);
        }
        return;
    }

    function makeVal(res) {
        if (track.isFlushed()) {
            context.logger.debug('The track was flushed during execution');
            return null;
        }

        return {
            updated: true,
            result: res,
            identity: identity
        };
    }

    if (vow.isPromise(res)) {
        vow.resolve(res).then(function (res) {
            done(null, makeVal(res));
        }, done);
        return;
    }

    done(null, makeVal(res));
}

function update(self, track, context, identity, cacheKey,  done) {
    main(self, track, context, identity, function (err, val) {
        if (err) {
            done(err);
            return;
        }

        if (val) {
            self._cache.set(cacheKey, val, self.maxAge, function (err) {
                if (err) {
                    context.logger.warn('Failed to set cache', err);
                } else {
                    context.logger.note('Updated');
                }
            });
        }

        done(null, val);
    });
}

module.exports = init;
