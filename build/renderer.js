define(["require", "exports", "./input", "./math_util"], function (require, exports, input_1, math_util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function Scale2Viewport(min, max, dimsPx) {
        var _a = [max[0] - min[0], max[1] - min[1]], rangeX = _a[0], rangeY = _a[1];
        var maxRange = Math.max(rangeX, rangeY) * 1.3;
        min = math_util_1.SubVectors(min, [(maxRange - rangeX) / 2, (maxRange - rangeY) / 2]);
        var scale = math_util_1.ScaleVector(dimsPx, 1 / maxRange);
        return function (vec) {
            var result = math_util_1.LinMultVectors(math_util_1.SubVectors(vec, min), scale);
            return [result[0], dimsPx[1] - result[1]];
        };
    }
    function DrawMember(context, member, startPos, endPos, maxTension) {
        context.strokeStyle = "rgb(" + Math.abs(member.tension / maxTension * 255) + ", 0, 0)";
        context.lineWidth = member.beamType.id + 1;
        context.beginPath();
        context.moveTo(startPos[0], startPos[1]);
        context.lineTo(endPos[0], endPos[1]);
        context.stroke();
        if (member.data.beamCount == 1)
            return;
        context.setLineDash([5, 2]);
        context.strokeStyle = "rgb(0, 0, 0)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(startPos[0], startPos[1]);
        context.lineTo(endPos[0], endPos[1]);
        context.stroke();
        context.setLineDash([]);
    }
    function DrawScene(context, dimsPx, results) {
        var outElement = document.getElementById("output");
        outElement.innerHTML = "Mass: " + math_util_1.Round(results.mass, 1) + " g";
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
            minX = Math.min(minX, joint.data.position[0]);
            minY = Math.min(minY, joint.data.position[1]);
            maxX = Math.max(maxX, joint.data.position[0]);
            maxY = Math.max(maxY, joint.data.position[1]);
        }
        var scale = Scale2Viewport([minX, minY], [maxX, maxY], dimsPx);
        var table = document.createElement('TABLE');
        table.classList.add("out_table", "data_table");
        var headingRow = document.createElement('TR');
        input_1.AddCell(headingRow, "Member");
        input_1.AddCell(headingRow, "Type of load");
        input_1.AddCell(headingRow, "Internal  force");
        input_1.AddCell(headingRow, "Force before failure");
        input_1.AddCell(headingRow, "Load before failure");
        input_1.AddCell(headingRow, "Fails under current load");
        table.appendChild(headingRow);
        for (var _f = 0, _g = results.members; _f < _g.length; _f++) {
            var member = _g[_f];
            var tension = member.tension * results.analyticalMult;
            context.fillStyle = 'white';
            var startPos = scale(results.joints[member.data.startId].data.position);
            var endPos = scale(results.joints[member.data.endId].data.position);
            DrawMember(context, member, startPos, endPos, maxTension);
            context.fillStyle = 'black';
            var rowClasses = member.fails ? ["error_out"] : [tension > 0 ? "tension_out" : "compression_out"];
            var centerPos = math_util_1.AddVectors(startPos, math_util_1.LinMultVectors(math_util_1.SubVectors(endPos, startPos), [0.5, 0.5]));
            context.fillText(member.data.name, centerPos[0], centerPos[1]);
            var rowOut = document.createElement('TR');
            input_1.AddCell.apply(void 0, [rowOut, member.data.name, "tab_header"].concat(rowClasses));
            if (tension > 0) {
                input_1.AddCell.apply(void 0, [rowOut, "Tensive"].concat(rowClasses));
            }
            else {
                input_1.AddCell.apply(void 0, [rowOut, "Compressive"].concat(rowClasses));
            }
            input_1.AddCell.apply(void 0, [rowOut, math_util_1.Round(tension / 1000, 1) + " kN"].concat(rowClasses));
            input_1.AddCell.apply(void 0, [rowOut, math_util_1.Round(member.failsAtLocal / 1000, 1) + " kN"].concat(rowClasses));
            input_1.AddCell.apply(void 0, [rowOut, math_util_1.Round(member.failsAtLoad / 1000, 1) + " kN"].concat(rowClasses));
            input_1.AddCell.apply(void 0, [rowOut, "" + member.fails].concat(rowClasses));
            table.appendChild(rowOut);
        }
        outElement.appendChild(table);
        context.lineWidth = 1;
        context.strokeStyle = 'black';
        context.textBaseline = "middle";
        context.textAlign = "center";
        context.font = "15px Arial";
        for (var _h = 0, _j = Object.values(results.joints); _h < _j.length; _h++) {
            var joint = _j[_h];
            var jointData = joint.data;
            context.fillStyle = 'white';
            var pos = scale(jointData.position);
            if (jointData.fixed) {
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
            if (math_util_1.Magnitude(joint.externalForce) != 0) {
                var direction = math_util_1.ScaleVector(math_util_1.Normalize(joint.externalForce), 60);
                context.beginPath();
                context.moveTo(pos[0], pos[1]);
                context.lineTo(pos[0] + direction[0], pos[1] - direction[1]);
                context.stroke();
                var textVec = math_util_1.ScaleVector(direction, 0.5);
                context.fillText(math_util_1.Round(math_util_1.Magnitude(joint.externalForce) / 1000, 1) + "N", pos[0] + textVec[0], pos[1] - textVec[1]);
            }
            context.fillText(jointData.name, pos[0], pos[1]);
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
