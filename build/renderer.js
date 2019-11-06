define(["require", "exports", "./vecMaths"], function (require, exports, vecMaths_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function Scale2Viewport(min, max, dimsPx) {
        var _a = [max[0] - min[0], max[1] - min[1]], rangeX = _a[0], rangeY = _a[1];
        var maxRange = Math.max(rangeX, rangeY) * 1.3;
        min = vecMaths_1.SubVectors(min, [(maxRange - rangeX) / 2, (maxRange - rangeY) / 2]);
        var scale = vecMaths_1.ScaleVector(dimsPx, 1 / maxRange);
        return function (vec) {
            var result = vecMaths_1.LinMultVectors(vecMaths_1.SubVectors(vec, min), scale);
            return [result[0], dimsPx[1] - result[1]];
        };
    }
    function DrawScene(context, dimsPx, results) {
        var outElement = document.getElementById("output");
        outElement.innerHTML = "Mass: " + Math.round(results.mass * 10) / 10 + " g";
        context.font = "12px Arial";
        context.fillStyle = 'white';
        context.fillRect(0, 0, dimsPx[0], dimsPx[1]);
        var _a = [Infinity, Infinity], minX = _a[0], minY = _a[1];
        var _b = [-Infinity, -Infinity], maxX = _b[0], maxY = _b[1];
        var maxTension = -Infinity;
        for (var _i = 0, _c = results.members; _i < _c.length; _i++) {
            var member = _c[_i];
            maxTension = Math.max(maxTension, Math.abs(member.tension));
        }
        for (var _d = 0, _e = Object.values(results.joints); _d < _e.length; _d++) {
            var joint = _e[_d];
            minX = Math.min(minX, joint.position[0]);
            minY = Math.min(minY, joint.position[1]);
            maxX = Math.max(maxX, joint.position[0]);
            maxY = Math.max(maxY, joint.position[1]);
        }
        var scale = Scale2Viewport([minX, minY], [maxX, maxY], dimsPx);
        for (var _f = 0, _g = results.members; _f < _g.length; _f++) {
            var member = _g[_f];
            context.fillStyle = 'white';
            context.strokeStyle = "rgb(" + Math.abs(member.tension / maxTension * 255) + ", 0, 0)";
            var startPos = scale(results.joints[member.startId].position);
            var endPos = scale(results.joints[member.endId].position);
            context.beginPath();
            context.moveTo(startPos[0], startPos[1]);
            context.lineTo(endPos[0], endPos[1]);
            context.stroke();
            context.fillStyle = 'black';
            var centerPos = vecMaths_1.AddVectors(startPos, vecMaths_1.LinMultVectors(vecMaths_1.SubVectors(endPos, startPos), [0.5, 0.5]));
            context.fillText(member.name, centerPos[0], centerPos[1]);
            var memberOut = document.createElement("DIV");
            if (member.tension > 0) {
                memberOut.classList.add("tension_out");
                memberOut.innerHTML = member.name + ": Tension " + member.tension;
            }
            else if (member.buckles) {
                memberOut.classList.add("buckles_out");
                memberOut.innerHTML = member.name + ": Compression " + member.tension + " Buckes at force!";
            }
            else {
                memberOut.classList.add("compression_out");
                memberOut.innerHTML = member.name + ": Compression " + member.tension;
            }
            outElement.appendChild(memberOut);
        }
        context.strokeStyle = 'black';
        context.textBaseline = "middle";
        context.textAlign = "center";
        context.font = "15px Arial";
        for (var _h = 0, _j = Object.values(results.joints); _h < _j.length; _h++) {
            var joint = _j[_h];
            context.fillStyle = 'white';
            var pos = scale(joint.position);
            if (joint.fixed) {
                context.fillRect(pos[0] - 8, pos[1] - 8, 16, 16);
                context.strokeRect(pos[0] - 8, pos[1] - 8, 16, 16);
            }
            else {
                context.beginPath();
                context.arc(pos[0], pos[1], 8, 0, Math.PI * 2);
                context.fill();
                context.stroke();
            }
            context.fillStyle = 'black';
            if (vecMaths_1.Magnitude(joint.force) != 0) {
                var direction = vecMaths_1.ScaleVector(vecMaths_1.Normalize(joint.force), 50);
                context.beginPath();
                context.moveTo(pos[0], pos[1]);
                context.lineTo(pos[0] + direction[0], pos[1] - direction[1]);
                context.stroke();
                var textVec = vecMaths_1.ScaleVector(direction, 0.5);
                context.fillText(Math.round(vecMaths_1.Magnitude(joint.force)) + "N", pos[0] + textVec[0], pos[1] - textVec[1]);
            }
            context.fillText(joint.name, pos[0], pos[1]);
        }
        for (var _k = 0, _l = results.errors; _k < _l.length; _k++) {
            var error = _l[_k];
            var errorOut = document.createElement("DIV");
            errorOut.classList.add("error_out");
            errorOut.innerHTML = "Error: " + error;
            outElement.appendChild(errorOut);
        }
        for (var _m = 0, _o = results.warnings; _m < _o.length; _m++) {
            var warning = _o[_m];
            var warningOut = document.createElement("DIV");
            warningOut.classList.add("warning_out");
            warningOut.innerHTML = "Warning: " + warning;
            outElement.appendChild(warningOut);
        }
    }
    exports.DrawScene = DrawScene;
});
