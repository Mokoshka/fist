/*global describe, it*/
'use strict';

var Track = require('../core/track/track');
var Tracker = require('../core/tracker');

var _ = require('lodash-node');
var assert = require('chai').assert;

describe('core/deps/deps', function () {
    /*eslint max-nested-callbacks: [2, 5]*/
    var Deps = require('../core/deps/deps');
    var tracker = new Tracker();
    var track = new Track(tracker);

    describe('new Deps()', function () {
        var ctx = new Deps(track);

        var props = [
            'result',
            'errors'
        ];

        _.forEach(props, function (prop) {
            it('Should have a "' + prop + '" property', function () {
                assert.property(ctx, prop);
                assert.isObject(ctx[prop]);
            });
        });

        it('Should be an instance of Deps', function () {
            assert.instanceOf(ctx, Deps);
        });

    });

    describe('new Deps(track, path, params)', function () {
        var params = {a: 42};
        var ctx = new Deps(null, null, params);

        it('Should have a "params" property', function () {
            assert.property(ctx, 'params');
            assert.isObject(ctx.params);
            assert.deepEqual(ctx.params, params);
            assert.strictEqual(ctx.params, params);
        });
    });

    describe('.setRes(path, data)', function () {
        it('Should set data to .res object', function () {
            var ctx = new Deps(track);

            ctx.setRes('a.b.c', 42);
            assert.deepProperty(ctx.result, 'a.b.c');
            assert.deepPropertyVal(ctx.result, 'a.b.c', 42);
        });
    });

    describe('.setErr(path, data)', function () {
        it('Should set data to .ers object', function () {
            var ctx = new Deps(track);

            ctx.setErr('a.b.c', 42);
            assert.deepProperty(ctx.errors, 'a.b.c');
            assert.deepPropertyVal(ctx.errors, 'a.b.c', 42);
        });
    });

    describe('.getRes', function () {
        it('Should get data from .res object', function () {
            var ctx = new Deps(track);

            ctx.setRes('a.b.c', 42);
            assert.strictEqual(ctx.getRes('a.b.c'), 42);
        });

        it('Should support default value', function () {
            var ctx = new Deps(track);

            assert.strictEqual(ctx.getRes('a.b.c', 42), 42);
        });

        it('Should support no arguments', function () {
            var ctx = new Deps(track);

            ctx.setRes('a.b.c', 42);

            assert.deepEqual(ctx.getRes(), {
                a: {
                    b: {
                        c: 42
                    }
                }
            });
        });
    });

    describe('.getErr', function () {
        it('Should get data from .ers object', function () {
            var ctx = new Deps(track);

            ctx.setErr('a.b.c', 42);
            assert.strictEqual(ctx.getErr('a.b.c'), 42);
        });

        it('Should support default value', function () {
            var ctx = new Deps(track);

            assert.strictEqual(ctx.getErr('a.b.c', 42), 42);
        });

        it('Should support no arguments', function () {
            var ctx = new Deps(track);

            ctx.setErr('a.b.c', 42);

            assert.deepEqual(ctx.getErr(), {
                a: {
                    b: {
                        c: 42
                    }
                }
            });
        });
    });

    describe('.hasRes', function () {
        it('Should check if result exists', function () {
            var ctx = new Deps(track);

            ctx.setRes('a.b.c', 42);
            assert.ok(ctx.hasRes('a'));
            assert.ok(ctx.hasRes('a.b'));
            assert.ok(ctx.hasRes('a.b.c'));
            assert.ok(!ctx.hasRes('a.b.c.d'));
        });
    });

    describe('.hasErr', function () {
        it('Should check if error exists', function () {
            var ctx = new Deps(track);

            ctx.setErr('a.b.c', 42);
            assert.ok(ctx.hasErr('a'));
            assert.ok(ctx.hasErr('a.b'));
            assert.ok(ctx.hasErr('a.b.c'));
            assert.ok(!ctx.hasErr('a.b.c.d'));
        });
    });

    describe('.append', function () {
        it('Should append deps', function (done) {
            var ctx = new Deps(track, 'c');

            tracker.unit({
                path: 'a',
                data: 42
            });

            tracker.ready().done(function () {
                ctx.append(['a']).done(function () {
                    assert.deepEqual(ctx.result, {
                        a: 42
                    });

                    done();
                });
            });

        });
    });

    describe('.trigger', function () {
        it('Should trigger the event', function (done) {
            var ctx = new Deps(track, 'c');

            tracker.channel('ctx').on('my-event', function (e) {
                assert.strictEqual(e.trackId, track.id);
                assert.strictEqual(e.path, 'c');
                assert.strictEqual(e.data, 42);
                done();
            });

            ctx.trigger('my-event', 42);
        });
    });

    describe('.args', function () {

        it('Should return args', function () {
            var ctx = new Deps(track, 'c', {
                a: 42
            });
            var args = ctx.args();

            assert.deepEqual(args, {
                a: 42
            });

            assert.strictEqual(args, ctx.args());
        });
    });

    describe('.arg', function () {
        it('Should return parameter', function () {
            var ctx = new Deps(track, 'c', {
                a: 42
            });

            assert.strictEqual(ctx.arg('a'), 42);
        });

        it('Should support paths', function () {
            var ctx = new Deps(track, 'c', {
                a: {
                    b: 42
                }
            });

            assert.strictEqual(ctx.arg('a.b'), 42);
        });

        it('Should not fail if no params', function () {
            var ctx = new Deps(track, 'c');

            assert.strictEqual(ctx.arg('a.b'), void 0);
        });

        it('Should support default value', function () {
            var ctx = new Deps(track, 'c');
            var def = {};

            assert.strictEqual(ctx.arg('a.b', def), def);
        });
    });

    describe('.toJSON', function () {
        it('Should serialize to JSON', function () {
            var context = new Deps();
            assert.deepEqual(context.toJSON(), {
                params: {},
                result: {},
                errors: {}
            });
        });
    });
});
