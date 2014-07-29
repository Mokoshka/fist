/*global describe, it*/
'use strict';

var assert = require('chai').assert;

describe('core/track/track', function () {
    /*eslint max-nested-callbacks: [2, 4]*/
    var Tracker = require('../core/tracker');
    var Track = require('../core/track/track');

    describe('.invoke', function () {
        it('Should resolve unit', function (done) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                data: function () {

                    return 42;
                }
            });

            tracker.ready().always(function () {
                track.invoke('a').done(function (res) {
                    assert.strictEqual(res, 42);
                    done();
                });
            });

        });

        it('Should reject undefined unit', function (done) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.ready().always(function () {
                track.invoke('a').fail(function (err) {
                    assert.isUndefined(err);
                    done();
                }).done();
            });
        });

        it('Should resolve unit deps before call (0)', function (done) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                deps: ['b'],
                data: function (track, context) {
                    assert.strictEqual(context.getRes('b'), 'b');

                    return 'a';
                }
            });

            tracker.unit({
                path: 'b',
                data: 'b'
            });

            tracker.ready().always(function () {
                track.invoke('a').done(function (res) {
                    assert.strictEqual(res, 'a');
                    done();
                });
            });
        });

        it('Should resolve unit deps before call (1)', function (done) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                deps: ['b'],
                data: function (track, context) {
                    assert.isUndefined(context.getErr('b'));

                    return 'a';
                }
            });

            tracker.ready().always(function () {
                track.invoke('a').done(function (res) {
                    assert.strictEqual(res, 'a');
                    done();
                });
            });
        });

        it('Should not resolve unit a twice', function (done) {

            var tracker = new Tracker();
            var track = new Track(tracker);

            tracker.unit({
                path: 'a',
                deps: ['c'],
                data: function (track, context) {
                    assert.strictEqual(context.getRes('c'), 'c');

                    return 'a';
                }
            });

            tracker.unit({
                path: 'b',
                deps: ['c'],
                data: function (track, context) {
                    assert.strictEqual(context.getRes('c'), 'c');

                    return 'b';
                }
            });

            tracker.unit({
                path: 'c',
                i: 0,
                data: function () {
                    assert.strictEqual(this.i, 0);
                    this.i += 1;

                    return 'c';
                }
            });

            tracker.unit({
                path: 'x',
                deps: ['a', 'b'],
                data: function (track, context) {
                    assert.strictEqual(context.getRes('a'), 'a');
                    assert.strictEqual(context.getRes('b'), 'b');

                    return 'x';
                }
            });

            tracker.ready().always(function () {
                track.invoke('x').done(function (res) {
                    assert.strictEqual(res, 'x');
                    assert.strictEqual(this.getUnit('c').i, 1);
                    done();
                }, tracker);
            });
        });
        it('Should invoke unit', function (done) {
            var tracker = new Tracker();
            var track = new Track(tracker);
            var spy = [];

            tracker.unit({
                path: 'a',
                data: function () {
                    spy.push(1);
                }
            });

            tracker.unit({
                path: 'b',
                deps: ['a']
            });

            tracker.unit({
                path: 'c',
                deps: ['a']
            });

            tracker.unit({
                path: 'd',
                deps: ['b', 'c']
            });

            tracker.ready().done(function () {
                track.invoke('d').done(function () {
                    assert.deepEqual(spy, [1]);
                    done();
                });
            });

        });

        it('Should not cache calling', function (done) {
            var tracker = new Tracker();
            var track = new Track(tracker);
            var spy = [];

            tracker.unit({
                path: 'a',
                data: function (track, context) {
                    assert.deepEqual(context.params, {
                        x: 42
                    });
                    spy.push(1);
                }
            });

            tracker.unit({
                path: 'b',
                deps: ['a']
            });

            tracker.unit({
                path: 'c',
                deps: ['a']
            });

            tracker.unit({
                path: 'd',
                deps: ['b', 'c']
            });

            tracker.ready().done(function () {
                track.invoke('d', {
                    x: 42
                }).done(function () {
                    assert.deepEqual(spy, [1, 1]);
                    done();
                });
            });

        });

    });

});
