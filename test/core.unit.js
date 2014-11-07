/*global describe, it*/
'use strict';

var Control = require('../core/control/control');
var Track = require('../core/track/track');
var Tracker = require('../core/tracker');

var assert = require('chai').assert;
var inherit = require('inherit');

describe('core/unit', function () {
    /*eslint max-nested-callbacks: [2, 4]*/
    var Unit = require('../core/unit');

    it('Should be an instance of core/unit', function () {

        var unit = new Unit({
            a: 42
        });

        assert.instanceOf(unit, Unit);

        assert.deepEqual(unit.params, {
            a: 42
        });
    });

    it('Should coerce ._maxAge to not NaN number', function () {

        var Unit0 = inherit(Unit, {

            _maxAge: NaN,

            getMaxAge: function () {

                return this._maxAge;
            }
        });

        var unit = new Unit0();

        assert.isNumber(unit.getMaxAge());
        assert.strictEqual(unit.getMaxAge(), 0);

        var Unit1 = inherit(Unit0, {
            _maxAge: 1
        });

        unit = new Unit1();

        assert.isNumber(unit.getMaxAge());
        assert.strictEqual(unit.getMaxAge(), 1);
    });

    it('Should unique deps', function () {

        var Unit0 = inherit(Unit, {
            deps: [1, 1, 1, 2, 2, 3, 3]
        });

        assert.deepEqual(new Unit0().deps, [1, 2, 3]);
    });

    describe('.addDeps', function () {
        it('Should add unique deps', function () {
            var unit = new Unit();

            unit.addDeps([1, 2, 3]);
            assert.deepEqual(unit.deps, [1, 2, 3]);
            unit.addDeps(1, 2, 3, 4, [5, 6]);
            assert.deepEqual(unit.deps, [1, 2, 3, 4, 5, 6]);
        });
    });

    describe('.delDeps', function () {
        it('Should del deps', function () {
            var unit = new Unit();

            unit.addDeps(1, 2, 3, 4, 5, 6);
            assert.deepEqual(unit.deps, [1, 2, 3, 4, 5, 6]);
            unit.delDeps(1, 2, [3, 4]);
            assert.deepEqual(unit.deps, [5, 6]);
        });
    });

    describe('.data', function () {
        it('Should resolve data if it is not a function', function (done) {
            var tracker = new Tracker();

            tracker.unit({
                name: 'x',
                data: 42
            });

            tracker.ready().always(function () {
                new Track(tracker).invoke('x').done(function (res) {
                    assert.strictEqual(res, 42);
                    done();
                });
            });
        });
    });

    describe('test caching', function () {
        var AsyncCache = require('./util/AsyncCache');

        it('Should not cache result', function (done) {
            var tracker = new Tracker();

            tracker.unit({
                name: 'test',
                spy: [],
                _maxAge: 0,
                data: function () {
                    this.spy.push(1);

                    return this.spy;
                }
            });

            tracker.ready().always(function () {
                new Track(tracker).invoke('test').
                    then(function (spy) {
                        assert.deepEqual(spy, [1]);
                    }).always(function () {
                        new Track(tracker).invoke('test').
                            done(function (spy) {
                                assert.deepEqual(spy, [1, 1]);
                                done();
                            });
                    });
            });
        });

        it('Should cache result', function (done) {
            var tracker = new Tracker();

            tracker.unit({
                name: 'test',
                spy: [],
                _maxAge: 10000,
                data: function () {
                    this.spy.push(1);

                    throw this.spy;
                }
            });

            tracker.ready().always(function () {
                new Track(tracker).invoke('test').
                    fail(function (spy) {
                        assert.deepEqual(spy, [1]);
                    }).always(function () {
                        new Track(tracker).invoke('test').
                            fail(function (spy) {
                                assert.deepEqual(spy, [1, 1]);
                                done();
                            }).done();
                    });
            });
        });

        it('Should use separate keys for cache', function (done) {
            var tracker = new Tracker();

            tracker.unit({
                name: 'test-42',
                _maxAge: 10000,
                data: function () {

                    return 42;
                },
                _getCacheKeyParts: function () {

                    return [];
                }
            });

            tracker.unit({
                name: 'test-43',
                base: 'test-42',
                data: function () {

                    return 43;
                }
            });

            tracker.ready().done(function () {
                new Track(tracker).invoke('test-42').done(function (res) {
                    assert.strictEqual(res, 42);

                    new Track(tracker).invoke('test-43').done(function (res) {
                        assert.strictEqual(res, 43);
                        done();
                    });
                });
            });
        });

        it('Should not cache coz of error', function (done) {
            var e = [];
            var SlyTracker = inherit(Tracker, {
                _createCache: function (p) {

                    return new (inherit(AsyncCache, {
                        broken: 42
                    }))(p);
                }
            });

            var tracker = new SlyTracker();

            tracker.channel('ctx').on('ecache', function (event) {
                e.push(event.data);
            });

            tracker.unit({
                name: 'test',
                spy: [],
                _maxAge: 10000,
                data: function () {
                    this.spy.push(1);

                    return this.spy;
                }
            });

            tracker.ready().always(function () {
                new Track(tracker).invoke('test').
                    then(function (spy) {
                        assert.deepEqual(spy, [1]);
                        assert.deepEqual(e, [42, 42]);
                    }).always(function () {
                        new Track(tracker).invoke('test').
                            then(function (spy) {
                                assert.deepEqual(spy, [1, 1]);
                                assert.deepEqual(e, [42, 42, 42, 42]);

                                done();
                            }).done();
                    }).done();
            });
        });

        it('Should not cache Control', function (done) {
            var tracker = new Tracker();
            var spy = [];

            tracker.unit({
                name: 'test',
                _maxAge: 10000,
                data: function () {
                    spy.push(1);

                    return new Control();
                }
            });

            tracker.ready().always(function () {
                new Track(tracker).invoke('test').then(function () {
                    assert.deepEqual(spy, [1]);
                }).always(function () {
                    new Track(tracker).invoke('test').
                        then(function () {
                            assert.deepEqual(spy, [1, 1]);
                            done();
                        }).done();
                }).done();
            });
        });

        it('Should cache result', function (done) {
            var tracker = new Tracker();
            var spy = [];

            tracker.unit({
                name: 'test',
                _maxAge: 10000,
                data: function () {
                    spy.push(1);
                }
            });

            tracker.ready().always(function () {
                new Track(tracker).invoke('test').then(function () {
                    assert.deepEqual(spy, [1]);
                }).always(function () {
                    new Track(tracker).invoke('test').
                        then(function () {
                            assert.deepEqual(spy, [1]);
                            done();
                        }).done();
                }).done();
            });
        });

        it('Should emit ctx@cache', function (done) {
            var tracker = new Tracker();
            var spy = [];

            tracker.unit({
                name: 'test',
                _maxAge: 10000,
                data: 42
            });

            tracker.channel('ctx').on('cache', function (e) {
                assert.strictEqual(e.unit, 'test');
                assert.isNumber(e.time);
                assert.strictEqual(e.data, 42);
                spy.push(1);
            });

            tracker.ready().always(function () {
                new Track(tracker).invoke('test').always(function () {
                    new Track(tracker).invoke('test').
                        then(function () {
                            assert.deepEqual(spy, [1]);
                            done();
                        }).done();
                }).done();
            });
        });
    });
});
