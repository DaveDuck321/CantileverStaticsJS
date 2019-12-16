define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function AddVectors(a, b) {
        return [a[0] + b[0], a[1] + b[1]];
    }
    exports.AddVectors = AddVectors;
    function SubVectors(a, b) {
        return [a[0] - b[0], a[1] - b[1]];
    }
    exports.SubVectors = SubVectors;
    function LinMultVectors(a, b) {
        return [a[0] * b[0], a[1] * b[1]];
    }
    exports.LinMultVectors = LinMultVectors;
    function LinDivVectors(a, b) {
        return [a[0] / b[0], a[1] / b[1]];
    }
    exports.LinDivVectors = LinDivVectors;
    function ScaleVector(a, s) {
        return [a[0] * s, a[1] * s];
    }
    exports.ScaleVector = ScaleVector;
    function Magnitude(a) {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
    }
    exports.Magnitude = Magnitude;
    function Normalize(a) {
        var length = Magnitude(a);
        return ScaleVector(a, 1 / length);
    }
    exports.Normalize = Normalize;
    function Round(n, points) {
        return Math.round(n * (Math.pow(10, points))) / (Math.pow(10, points));
    }
    exports.Round = Round;
});
