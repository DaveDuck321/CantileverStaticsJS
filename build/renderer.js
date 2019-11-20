var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
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
            minX = Math.min(minX, joint.position[0]);
            minY = Math.min(minY, joint.position[1]);
            maxX = Math.max(maxX, joint.position[0]);
            maxY = Math.max(maxY, joint.position[1]);
        }
        var scale = Scale2Viewport([minX, minY], [maxX, maxY], dimsPx);
        var table = document.createElement('TABLE');
        table.classList.add("out_table");
        var headingRow = document.createElement('TR');
        input_1.AddCell(headingRow, "Member");
        input_1.AddCell(headingRow, "Type of load");
        input_1.AddCell(headingRow, "Tension");
        input_1.AddCell(headingRow, "Tension before failure");
        input_1.AddCell(headingRow, "Load before failure");
        input_1.AddCell(headingRow, "Fails under current load");
        table.appendChild(headingRow);
        for (var _f = 0, _g = results.members; _f < _g.length; _f++) {
            var member = _g[_f];
            var tension = member.tension * results.analyticalMult;
            context.fillStyle = 'white';
            context.strokeStyle = "rgb(" + Math.abs(member.tension / maxTension * 255) + ", 0, 0)";
            context.lineWidth = member.beamType.id + 1;
            var startPos = scale(results.joints[member.startId].position);
            var endPos = scale(results.joints[member.endId].position);
            context.beginPath();
            context.moveTo(startPos[0], startPos[1]);
            context.lineTo(endPos[0], endPos[1]);
            context.stroke();
            context.fillStyle = 'black';
            var rowClasses = member.fails ? ["error_out"] : [];
            var centerPos = math_util_1.AddVectors(startPos, math_util_1.LinMultVectors(math_util_1.SubVectors(endPos, startPos), [0.5, 0.5]));
            context.fillText(member.name, centerPos[0], centerPos[1]);
            var rowOut = document.createElement('TR');
            input_1.AddCell.apply(void 0, __spreadArrays([rowOut, member.name, "tab_header"], rowClasses));
            if (tension > 0) {
                input_1.AddCell.apply(void 0, __spreadArrays([rowOut, "Tensive"], rowClasses));
            }
            else {
                input_1.AddCell.apply(void 0, __spreadArrays([rowOut, "Compressive"], rowClasses));
            }
            input_1.AddCell.apply(void 0, __spreadArrays([rowOut, math_util_1.Round(tension / 1000, 1) + " kN"], rowClasses));
            input_1.AddCell.apply(void 0, __spreadArrays([rowOut, math_util_1.Round(member.failsAtLocal / 1000, 1) + " kN"], rowClasses));
            input_1.AddCell.apply(void 0, __spreadArrays([rowOut, math_util_1.Round(member.failsAtLoad / 1000, 1) + " kN"], rowClasses));
            input_1.AddCell.apply(void 0, __spreadArrays([rowOut, "" + member.fails], rowClasses));
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
            if (math_util_1.Magnitude(joint.force) != 0) {
                var direction = math_util_1.ScaleVector(math_util_1.Normalize(joint.force), 50);
                context.beginPath();
                context.moveTo(pos[0], pos[1]);
                context.lineTo(pos[0] + direction[0], pos[1] - direction[1]);
                context.stroke();
                var textVec = math_util_1.ScaleVector(direction, 0.5);
                context.fillText(Math.round(math_util_1.Magnitude(joint.force)) + "N", pos[0] + textVec[0], pos[1] - textVec[1]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztJQUlBLFNBQVMsY0FBYyxDQUFDLEdBQVEsRUFBRSxHQUFRLEVBQUUsTUFBVztRQUMvQyxJQUFBLHVDQUFxRCxFQUFwRCxjQUFNLEVBQUUsY0FBNEMsQ0FBQztRQUMxRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBQyxHQUFHLENBQUM7UUFDNUMsR0FBRyxHQUFHLHNCQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEUsSUFBTSxLQUFLLEdBQUcsdUJBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sVUFBUyxHQUFRO1lBQ3BCLElBQU0sTUFBTSxHQUFHLDBCQUFjLENBQUMsc0JBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFBO0lBQ0wsQ0FBQztJQUVELFNBQWdCLFNBQVMsQ0FBQyxPQUFnQyxFQUFFLE1BQVcsRUFBRSxPQUFxQjtRQUMxRixJQUFNLFVBQVUsR0FBa0IsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRSxVQUFVLENBQUMsU0FBUyxHQUFHLFdBQVMsaUJBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFJLENBQUM7UUFFM0Qs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