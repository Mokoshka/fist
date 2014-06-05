'use strict';

var Tracker = require('../../Tracker');
var Context = require('../../context/Context');
var Track = require('../../track/Track');
var vow = require('vow');

module.exports = {

    'Tracker.prototype.resolve': [
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function (track, ctx) {

                    setTimeout(function () {
                        ctx.resolve(42);
                    }, 0);

                    return ctx.promise();
                }
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 42);
                test.done();
            });
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function (track, ctx) {
                    ctx.resolve(42);
                }
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 42);
                test.done();
            });
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function () {

                    return vow.resolve(42);
                }
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 42);
                test.done();
            });
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: 42
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 42);
                test.done();
            });
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function () {

                    return 42;
                }
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 42);
                test.done();
            });
        },
        //  REJECTS
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function (track, ctx) {

                    setTimeout(function () {
                        ctx.reject(42);
                    }, 0);

                    return ctx.promise();
                }
            });

            tracker.resolve(track, 'a').fail(function (res) {
                test.strictEqual(res, 42);
                test.done();
            }).done();
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function (track, ctx) {

                    setTimeout(function () {
                        ctx.resolve(vow.reject(42));
                    }, 0);

                    return ctx.promise();
                }
            });

            tracker.resolve(track, 'a').fail(function (res) {
                test.strictEqual(res, 42);
                test.done();
            }).done();
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function (track, ctx) {

                    setTimeout(function () {
                        ctx.resolve(vow.reject(vow.resolve(42)));
                    }, 0);

                    return ctx.promise();
                }
            });

            tracker.resolve(track, 'a').fail(function (res) {
                test.strictEqual(res, 42);
                test.done();
            }).done();
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: vow.reject(42)
            });

            tracker.resolve(track, 'a').fail(function (res) {
                test.strictEqual(res, 42);
                test.done();
            }).done();
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function () {

                    throw 42;
                }
            });

            tracker.resolve(track, 'a').fail(function (res) {
                test.strictEqual(res, 42);
                test.done();
            }).done();
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.resolve(track, 'a').fail(function (res) {
                test.strictEqual(res, void 0);
                test.done();
            });
        },
        //  DEPS
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                deps: ['b'],
                data: function (track, ctx) {
                    test.strictEqual(ctx.res.b, 'b');

                    return 'a';
                }
            });

            tracker.unit({
                path: 'b',
                data: 'b'
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 'a');
                test.done();
            });
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                deps: ['b'],
                data: function (track, ctx) {
                    test.strictEqual(ctx.ers.b, 'b');

                    return 'a';
                }
            });

            tracker.unit({
                path: 'b',
                data: vow.reject('b')
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 'a');
                test.done();
            });
        },
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);
            var spy = [];

            tracker.unit({
                path: 'a',
                deps: ['b', 'c'],
                data: function (track, ctx) {
                    test.strictEqual(ctx.res.b, 'b');
                    test.strictEqual(ctx.ers.c, 'c');

                    return 'a';
                }
            });

            tracker.unit({
                path: 'b',
                deps: 'c',
                data: function (track, ctx) {
                    test.strictEqual(ctx.ers.c, 'c');

                    return 'b';
                }
            });

            tracker.unit({
                path: 'c',
                data: function () {
                    spy.push(1);

                    return vow.reject('c');
                }
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 'a');
                test.deepEqual(spy, [1]);
                test.done();
            });
        },
        function (test) {
            var tracker = new Tracker();

            tracker.unit({
                path: 'a',
                deps: 'b'
            });

            test.throws(function () {
                tracker.unit({
                    path: 'b',
                    deps: 'a'
                });
            }, ReferenceError);

            test.done();
        },
        //  EVENTS
        function (test) {

            var tracker = new Tracker();
            var track = new Track(tracker);
            var spy = [];

            tracker.on('ctx:notify', function (e) {
                spy.push([-1, e.data]);
            });

            tracker.on('ctx:accept', function (e) {
                spy.push([0, e.data]);
            });

            tracker.on('ctx:reject', function (e) {
                spy.push([1, e.data]);
            });

            tracker.unit({
                path: 'a',
                deps: ['b', 'c'],
                data: function (track, ctx) {
                    ctx.notify('a');

                    return 'a';
                }
            });

            tracker.unit({
                path: 'b',
                deps: ['c'],
                data: function (track, ctx) {
                    ctx.notify('b');

                    throw 'b';
                }
            });

            tracker.unit({
                path: 'c',
                data: function (track, ctx) {
                    ctx.notify('c');

                    return 'c';
                }
            });

            tracker.resolve(track, 'a').done(function (res) {
                test.strictEqual(res, 'a');
                test.deepEqual(spy, [
                    [-1, 'c'],
                    [0, 'c'],
                    [-1, 'b'],
                    [1, 'b'],
                    [-1, 'a'],
                    [0, 'a']
                ]);
                test.done();
            });
        }
    ]

};
