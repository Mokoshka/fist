'use strict';

var UnitsReady = require('../../../task/UnitsReady');
var Path = require('path');

module.exports = {

    ready0: function (test) {

        var ready = new UnitsReady({
            action: [
                null,
                Path.resolve('test/stuff/action/data0/*.js')
            ]
        });

        ready.done(function (err) {
            test.ok(err);
            test.done();
        });
    },

    ready1: function (test) {

        var ready = new UnitsReady({
            action: Path.resolve('test/stuff/action/data0/error/*.js')
        });

        ready.done(function (err) {
            test.strictEqual(err, 0);
            test.done();
        });
    },

    ready2: function (test) {

        var ready = new UnitsReady({
            action: Path.resolve('test/stuff/action/data0/*.js')
        });

        ready.done(function (err, res) {

            test.deepEqual(res.map(function (args) {
                test.strictEqual(args.length, 3);
                test.ok(Array.isArray(args));
                test.ok('string' === typeof args[0]);

                return args[0];
            }), ['knot', 'data', 'error', 'index']);

            test.done();
        });
    },

    'UnitsReady.isCap': function (test) {

        var samples;

        samples = ['t', 'tE', 'TEs', 'TeST'];

        samples.forEach(function (s) {
            test.ok( !UnitsReady.isCap(s) );
        });

        samples = ['T', 'AS', 'ASD', 'TEST'];

        samples.forEach(function (s) {
            test.ok(UnitsReady.isCap(s));
        });

        test.done();
    },

    'UnitsReady.undash': function (test) {

        var samples = [
            ['a-b-c', 'aBC'],
            ['foo--bar baz', 'fooBarBaz'],
            ['--harmony', 'Harmony']
        ];

        samples.forEach(function (s) {
            test.strictEqual(UnitsReady.undash(s[0]), s[1]);
        });

        test.done();
    },

    'UnitsReady.toCamel': function (test) {

        var samples = [
            ['data', 'data'],
            ['DATA', 'data'],
            ['Data', 'data'],
            ['HttpData', 'httpData'],
            ['HTTPData', 'httpData'],
            ['http-data', 'httpData'],
            ['http data', 'httpData']
        ];

        samples.forEach(function (s) {
            test.strictEqual(UnitsReady.toCamel(s[0]), s[1]);
        });

        test.done();
    },

    'UnitsReady.glob-0': function (test) {
        UnitsReady.glob(null, function (err) {
            test.ok(err);
            test.done();
        });
    },

    'UnitsReady.glob-1': function (test) {
        UnitsReady.glob('1231230123012', function (err, res) {
            test.deepEqual(res, []);
            test.done();
        });
    },

    'UnitsReady.glob-2': function (test) {
        UnitsReady.glob('test/stuff/action/data1/*.js', function (err, list) {
            test.deepEqual(list, [
                'test/stuff/action/data1/ABBR.js',
                'test/stuff/action/data1/ClassName.js',
                'test/stuff/action/data1/data.js'
            ]);
            test.done();
        });
    },

    'UnitsReady.multiglob-0': function (test) {

        UnitsReady.multiglob.call(42, [], function (err, res) {
            test.deepEqual(res, []);
        });

        UnitsReady.multiglob.call(42, [
            'test/stuff/action/data0/*.js',
            'test/stuff/action/data1/*.js'
        ], function (err, result) {

            test.strictEqual(this, 42);
            test.deepEqual(result, [
                'test/stuff/action/data0/Knot.js',
                'test/stuff/action/data0/data.js',
                'test/stuff/action/data0/error.js',
                'test/stuff/action/data0/index.js',
                'test/stuff/action/data1/ABBR.js',
                'test/stuff/action/data1/ClassName.js',
                'test/stuff/action/data1/data.js'
            ]);

            test.done();
        });

    },

    'UnitsReady.multiglob-1': function (test) {
        UnitsReady.multiglob.call(42, [
            'test/data1'
        ], function (err, res) {
            test.strictEqual(this, 42);
            test.deepEqual(res, []);
            test.done();
        });
    }

};
