/*global describe, it*/
'use strict';

var fs = require('fs');
var assert = require('chai').assert;

describe('core/tracker', function () {
    /*eslint max-nested-callbacks: [2, 5]*/
    var Tracker = require('../core/tracker');
    var Track = require('../core/track/track');

    it('Should be an instance of core/tracker', function () {
        var tracker = new Tracker();
        assert.instanceOf(tracker, Tracker);
        assert.isObject(tracker.tasks);
    });

    describe('.plug', function () {
        it('Should be ready when plugins resolved', function (done) {
            var spy = [];
            var tracker = new Tracker();

            tracker.plug(function (done) {
                setTimeout(function () {
                    spy.push(1);
                    done();
                }, 0);
            });

            tracker.plug(function (done) {
                setTimeout(function () {
                    spy.push(2);
                    done();
                }, 10);
            });

            tracker.ready().done(function () {
                assert.deepEqual(spy, [1, 2]);
                done();
            });
        });

        it('Should be failed coz plugin rejected', function (done) {

            var tracker = new Tracker();

            tracker.plug(function (done) {
                setTimeout(function () {
                    done();
                }, 0);
            });

            tracker.plug(function (done) {
                setTimeout(function () {
                    done('ERR');
                }, 10);
            });

            tracker.ready().fail(function (err) {
                assert.strictEqual(err, 'ERR');
                done();
            });
        });

        it('Should catch plugin exception', function (done) {
            var tracker = new Tracker();

            tracker.plug(function (done) {
                setTimeout(function () {
                    done();
                }, 0);
            });

            tracker.plug(function () {

                throw 'ERR';
            });

            tracker.ready().fail(function (err) {
                assert.strictEqual(err, 'ERR');
                done();
            }).done();
        });

        it('Should trigger a lot of events', function (done) {
            var tracker = new Tracker();
            var track = new Track(tracker);
            var spy = [];

            tracker.on('ctx:pending', function (e) {
                assert.strictEqual(e.trackId, track.id);
                spy.push([-1, e.path]);
            });

            tracker.on('ctx:notify', function (e) {
                assert.strictEqual(e.trackId, track.id);
                spy.push([2, e.path]);
            });

            tracker.on('ctx:accept', function (e) {
                assert.strictEqual(e.trackId, track.id);
                spy.push([0, e.path]);
            });

            tracker.on('ctx:reject', function (e) {
                assert.strictEqual(e.trackId, track.id);
                spy.push([1, e.path]);
            });

            tracker.unit({
                path: 'a',
                deps: ['b', 'c'],
                data: function (track, context) {
                    context.trigger('ctx:notify', 'a');

                    return 'a';
                }
            });

            tracker.unit({
                path: 'b',
                deps: ['c'],
                data: function (track, context) {
                    context.trigger('ctx:notify', 'b');

                    throw 'b';
                }
            });

            tracker.unit({
                path: 'c',
                data: function (track, context) {
                    context.trigger('ctx:notify', 'c');

                    return 'c';
                }
            });

            tracker.ready().always(function () {
                track.invoke('a').done(function (res) {
                    assert.strictEqual(res, 'a');
                    assert.deepEqual(spy, [
                        [-1, 'a'],
                        [-1, 'b'],
                        [-1, 'c'],
                        [2, 'c'],
                        [0, 'c'],
                        [2, 'b'],
                        [1, 'b'],
                        [2, 'a'],
                        [0, 'a']
                    ]);

                    done();
                });
            });
        });

        it('Should fail on init', function (done) {

            var tracker = new Tracker();

            tracker.plug('test/fixtures/globs/sub/**/*.js');

            fs.mkdirSync('test/fixtures/globs/sub');
            fs.symlinkSync('.', 'test/fixtures/globs/sub/sub');
            fs.chmodSync('test/fixtures/globs/sub/sub', 438);

            tracker.ready().fail(function (err) {
                assert.ok(err);

                fs.chmodSync('test/fixtures/globs/sub', 511);
                fs.unlinkSync('test/fixtures/globs/sub/sub');
                fs.rmdirSync('test/fixtures/globs/sub');

                done();
            });
        });
    });

    describe('skip resolving', function () {

        var Skip = require('../core/skip/skip');

        it('Should skip resolving by returning ' +
            '{Skip}', function (done) {

            var tracker = new Tracker();
            var track = new Track(tracker);
            var skip = new Skip();

            tracker.unit({
                path: 'a',
                data: function () {

                    return skip;
                }
            });

            tracker.unit({
                path: 'b',
                deps: ['a'],
                data: 'b'
            });

            tracker.unit({
                path: 'c',
                data: 'c'
            });

            tracker.unit({
                path: 'd',
                deps: ['b', 'c'],
                data: 'd'
            });

            tracker.ready().always(function () {
                track.invoke('d').done(function (res) {
                    assert.strictEqual(res, skip);
                    done();
                });
            });

        });

    });

});
