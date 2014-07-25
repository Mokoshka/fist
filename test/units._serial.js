/*global describe, it*/
'use strict';

var Skip = require('../core/skip/skip');
var assert = require('chai').assert;

describe('units/_serial', function () {

    var Track = require('../core/track/track');
    var Tracker = require('../core/tracker');
    var _serial = require('../plugins/units/_serial');

    it('Should be resolved after a and b steps', function (done) {
        var tracker = new Tracker();
        var track = new Track(tracker);
        var spy = [];

        tracker.plug(_serial);

        tracker.unit({
            base: '_serial',
            path: 'test',
            _steps: ['a', 'b'],
            _$a: function () {

                return 40;
            },
            _$b: function (context) {

                return context.data + 2;
            }
        });

        tracker.on('ctx:a', function () {
            spy.push('a');
        });

        tracker.on('ctx:b', function () {
            spy.push('b');
        });

        tracker.resolve(track, 'test').done(function (res) {
            assert.strictEqual(res, 42);
            assert.deepEqual(spy, ['a', 'b']);
            done();
        });
    });

    it('Should be rejected after "b" step', function (done) {
        var tracker = new Tracker();
        var track = new Track(tracker);
        var spy = [];

        tracker.plug(_serial);

        tracker.unit({
            base: '_serial',
            path: 'test',
            _steps: ['a', 'b'],
            _$a: function () {

                return 40;
            },
            _$b: function () {

                throw 'ERR';
            }
        });

        tracker.on('ctx:a', function () {
            spy.push('a');
        });

        tracker.on('ctx:b', function () {
            spy.push('b');
        });

        tracker.on('ctx:eb', function () {
            spy.push('eb');
        });

        tracker.resolve(track, 'test').fail(function (res) {
            assert.strictEqual(res, 'ERR');
            assert.deepEqual(spy, ['a', 'b', 'eb']);
            done();
        }).done();
    });

    it('Should be rejected', function (done) {
        var tracker = new Tracker();
        var track = new Track(tracker);
        var spy = [];

        tracker.plug(_serial);

        tracker.unit({
            base: '_serial',
            path: 'test',
            _steps: ['a', 'b'],
            _$a: function () {

                throw 51;
            },
            _$ea: function () {

                return 'RES';
            },
            _$b: function () {

                return 42;
            }
        });

        tracker.on('ctx:a', function () {
            spy.push('a');
        });

        tracker.on('ctx:ea', function () {
            spy.push('ea');
        });

        tracker.on('ctx:b', function () {
            spy.push('b');
        });

        tracker.resolve(track, 'test').done(function (res) {
            assert.strictEqual(res, 'RES');
            assert.deepEqual(spy, ['a', 'ea']);
            done();
        });
    });

    it('Should be resolved by Skip', function (done) {
        var tracker = new Tracker();
        var track = new Track(tracker);
        var spy = [];
        var skip = new Skip();

        tracker.plug(_serial);

        tracker.unit({
            base: '_serial',
            path: 'test',
            _steps: ['a', 'b'],
            _$a: function () {

                return skip;
            },
            _$b: function (context) {

                return context.data + 2;
            }
        });

        tracker.on('ctx:a', function () {
            spy.push('a');
        });

        tracker.on('ctx:b', function () {
            spy.push('b');
        });

        tracker.resolve(track, 'test').done(function (res) {
            assert.strictEqual(res, skip);
            assert.deepEqual(spy, ['a']);
            done();
        });
    });
});
