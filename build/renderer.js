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
        table.classList.add("out_table", "data_table");
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
            var rowClasses = member.fails ? ["error_out"] : [tension > 0 ? "tension_out" : "compression_out"];
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
                var direction = math_util_1.ScaleVector(math_util_1.Normalize(joint.force), 60);
                context.beginPath();
                context.moveTo(pos[0], pos[1]);
                context.lineTo(pos[0] + direction[0], pos[1] - direction[1]);
                context.stroke();
                var textVec = math_util_1.ScaleVector(direction, 0.5);
                context.fillText(math_util_1.Round(math_util_1.Magnitude(joint.force) / 1000, 1) + "N", pos[0] + textVec[0], pos[1] - textVec[1]);
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