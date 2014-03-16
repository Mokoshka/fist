'use strict';

var Loader = /** @type Loader */ require('../parser/Loader');

exports.callYield = function (value, done) {
    /*eslint no-fallthrough: 0*/
    if ( exports.callRet(value, done) ) {

        return;
    }

    exports.callObj(value, done);
};

exports.callRet = function (val, done) {

    if ( Object(val) === val ) {

        if ( 'function' === typeof val ) {
            exports.callFunc(val, [], done);

            return true;
        }

        if ( 'function' === typeof val.next &&
             'function' === typeof val.throw ) {
            exports.callGen(val, void 0, false, done);

            return true;
        }

        if ( 'function' === typeof val.pipe ) {
            exports.callStream(val, done);

            return true;
        }

        try {

            if ( 'function' === typeof val.then ) {
                exports.callPromise(val, done);

                return true;
            }

        } catch (err) {
            done(err);

            return true;
        }

        return false;
    }

    done.call(this, null, val);

    return true;
};

exports.callFunc = function (func, args, done) {

    var called = false;

    args = args.concat(function () {

        if ( called ) {

            return;
        }

        called = true;
        done.apply(this, arguments);
    });

    if ( 'GeneratorFunction' === func.constructor.name ) {
        exports.callGenFn(func, args, done);

        return;
    }

    func = func.apply(this, args);

    if ( called || void 0 === func ) {

        return;
    }

    called = true;

    exports.callRet(func, done);
};

exports.callGenFn = function (func, args, done) {
    func = func.apply(this, args);
    exports.callGen(func, void 0, false, done);
};

exports.callGen = function (gen, result, isError, done) {

    try {
        result = isError ? gen.throw(result) : gen.next(result);
    } catch (err) {
        done(err);

        return;
    }

    if ( result.done ) {
        exports.callYield(result.value, done);

        return;
    }

    exports.callYield(result.value, function (err, res) {

        if ( 2 > arguments.length ) {
            exports.callGen(gen, err, true, done);

            return;
        }

        exports.callGen(gen, res, false, done);
    });
};

exports.callObj = function (obj, done) {

    var isError;
    var keys = Object.keys(obj);
    var klen = keys.length;
    var result = Array.isArray(obj) ? [] : {};

    if ( 0 === klen ) {
        done(null, result);

        return;
    }

    isError = false;

    keys.forEach(function (i) {

        function onReturned (err, res) {

            if ( isError ) {

                return;
            }

            if ( 2 > arguments.length ) {
                isError = true;
                done(err);

                return;
            }

            result[i] = res;
            klen -= 1;

            if ( 0 === klen ) {
                done(null, result);
            }
        }

        exports.callRet(obj[i], onReturned);
    }, this);
};

exports.callPromise = function (promise, done) {

    try {
        promise.then(function (res) {
            done(null, res);
        }, done);

    } catch (err) {
        done(err);
    }

};

exports.callStream = function (readable, done) {
    new Loader(readable, null).parse(done, this);
};
