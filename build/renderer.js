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
            var startPos = scale(results.joints[member.data.startId].data.position);
            var endPos = scale(results.joints[member.data.endId].data.position);
            context.beginPath();
            context.moveTo(startPos[0], startPos[1]);
            context.lineTo(endPos[0], endPos[1]);
            context.stroke();
            context.fillStyle = 'black';
            var rowClasses = member.fails ? ["error_out"] : [tension > 0 ? "tension_out" : "compression_out"];
            var centerPos = math_util_1.AddVectors(startPos, math_util_1.LinMultVectors(math_util_1.SubVectors(endPos, startPos), [0.5, 0.5]));
            context.fillText(member.data.name, centerPos[0], centerPos[1]);
            var rowOut = document.createElement('TR');
            input_1.AddCell.apply(void 0, __spreadArrays([rowOut, member.data.name, "tab_header"], rowClasses));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztJQUlBLFNBQVMsY0FBYyxDQUFDLEdBQVEsRUFBRSxHQUFRLEVBQUUsTUFBVztRQUMvQyxJQUFBLHVDQUFxRCxFQUFwRCxjQUFNLEVBQUUsY0FBNEMsQ0FBQztRQUMxRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBQyxHQUFHLENBQUM7UUFDNUMsR0FBRyxHQUFHLHNCQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEUsSUFBTSxLQUFLLEdBQUcsdUJBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sVUFBUyxHQUFRO1lBQ3BCLElBQU0sTUFBTSxHQUFHLDBCQUFjLENBQUMsc0JBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFBO0lBQ0wsQ0FBQztJQUVELFNBQWdCLFNBQVMsQ0FBQyxPQUFnQyxFQUFFLE1BQVcsRUFBRSxPQUFxQjtRQUMxRixJQUFNLFVBQVUsR0FBa0IsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRSxVQUFVLENBQUMsU0FBUyxHQUFHLFdBQVMsaUJBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFJLENBQUM7UUFFM0QsT0FBTyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7UUFDNUIsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDNUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV4QyxJQUFBLHlCQUFtQyxFQUFsQyxZQUFJLEVBQUUsWUFBNEIsQ0FBQztRQUNwQyxJQUFBLDJCQUFxQyxFQUFwQyxZQUFJLEVBQUUsWUFBOEIsQ0FBQztRQUMxQyxJQUFJLFVBQVUsR0FBRyxDQUFDLFFBQVEsQ0FBQztRQUMzQixLQUFrQixVQUFlLEVBQWYsS0FBQSxPQUFPLENBQUMsT0FBTyxFQUFmLGNBQWUsRUFBZixJQUFlLEVBQUU7WUFBL0IsSUFBSSxNQUFNLFNBQUE7WUFDVixVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMvRDtRQUNELEtBQWlCLFVBQTBDLEVBQTFDLEtBQWEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQTFDLGNBQTBDLEVBQTFDLElBQTBDLEVBQUU7WUFBekQsSUFBSSxLQUFLLFNBQUE7WUFDVCxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqRDtRQUNELElBQUksS0FBSyxHQUFHLGNBQWMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvRCxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMvQyxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlDLGVBQU8sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUIsZUFBTyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNwQyxlQUFPLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9CLGVBQU8sQ0FBQyxVQUFVLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUM5QyxlQUFPLENBQUMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDM0MsZUFBTyxDQUFDLFVBQVUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ2hELEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFOUIsS0FBa0IsVUFBZSxFQUFmLEtBQUEsT0FBTyxDQUFDLE9BQU8sRUFBZixjQUFlLEVBQWYsSUFBZSxFQUFFO1lBQS9CLElBQUksTUFBTSxTQUFBO1lBQ1YsSUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sR0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsU0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxZQUFTLENBQUM7WUFDaEYsT0FBTyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDM0MsSUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUUsSUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEUsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUVqQixPQUFPLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztZQUM1QixJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFBLENBQUMsQ0FBQSxDQUFDLFdBQVcsQ0FBQyxDQUFBLENBQUMsQ0FBQSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUEsQ0FBQyxDQUFBLGFBQWEsQ0FBQSxDQUFDLENBQUEsaUJBQWlCLENBQUMsQ0FBQztZQUM1RixJQUFJLFNBQVMsR0FBRyxzQkFBVSxDQUFDLFFBQVEsRUFBRSwwQkFBYyxDQUFDLHNCQUFVLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRixPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUvRCxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLGVBQU8sK0JBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksR0FBSyxVQUFVLEdBQUU7WUFDL0QsSUFBRyxPQUFPLEdBQUcsQ0FBQyxFQUFFO2dCQUNaLGVBQU8sK0JBQUMsTUFBTSxFQUFFLFNBQVMsR0FBSyxVQUFVLEdBQUU7YUFDN0M7aUJBQU07Z0JBQ0gsZUFBTywrQkFBQyxNQUFNLEVBQUUsYUFBYSxHQUFLLFVBQVUsR0FBRTthQUNqRDtZQUNELGVBQU8sK0JBQUMsTUFBTSxFQUFLLGlCQUFLLENBQUMsT0FBTyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsUUFBSyxHQUFLLFVBQVUsR0FBRTtZQUMvRCxlQUFPLCtCQUFDLE1BQU0sRUFBSyxpQkFBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEdBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFLLEdBQUssVUFBVSxHQUFFO1lBQzNFLGVBQU8sK0JBQUMsTUFBTSxFQUFLLGlCQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQUssR0FBSyxVQUFVLEdBQUU7WUFDMUUsZUFBTywrQkFBQyxNQUFNLEVBQUUsRUFBRSxHQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUssVUFBVSxHQUFFO1lBQ2hELEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDN0I7UUFDRCxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTlCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDO1FBQ2hDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDO1FBQzVCLEtBQWlCLFVBQTBDLEVBQTFDLEtBQWEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQTFDLGNBQTBDLEVBQTFDLElBQTBDLEVBQUU7WUFBekQsSUFBSSxLQUFLLFNBQUE7WUFDVCxJQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO1lBQzVCLElBQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEMsSUFBRyxTQUFTLENBQUMsS0FBSyxFQUFFO2dCQUNoQixPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQzVDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNsRDtpQkFBTTtnQkFDSCxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDZixPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDcEI7WUFDRCxPQUFPLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztZQUM1QixJQUFHLHFCQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEMsSUFBTSxTQUFTLEdBQUcsdUJBQVcsQ0FBQyxxQkFBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEUsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUVqQixJQUFNLE9BQU8sR0FBRyx1QkFBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDNUMsT0FBTyxDQUFDLFFBQVEsQ0FBSSxpQkFBSyxDQUFDLHFCQUFTLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ25IO1lBQ0QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNwRDtRQUNELEtBQWlCLFVBQWMsRUFBZCxLQUFBLE9BQU8sQ0FBQyxNQUFNLEVBQWQsY0FBYyxFQUFkLElBQWMsRUFBRTtZQUE3QixJQUFJLEtBQUssU0FBQTtZQUNULElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0MsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEMsUUFBUSxDQUFDLFNBQVMsR0FBRyxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3ZDLFVBQVUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDcEM7UUFDRCxLQUFtQixVQUFnQixFQUFoQixLQUFBLE9BQU8sQ0FBQyxRQUFRLEVBQWhCLGNBQWdCLEVBQWhCLElBQWdCLEVBQUU7WUFBakMsSUFBSSxPQUFPLFNBQUE7WUFDWCxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9DLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3hDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsV0FBVyxHQUFHLE9BQU8sQ0FBQztZQUM3QyxVQUFVLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3RDO0lBQ0wsQ0FBQztJQTVHRCw4QkE0R0MifQ==