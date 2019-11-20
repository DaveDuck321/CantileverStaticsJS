var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
define(["require", "exports", "./math_util"], function (require, exports, math_util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TENSILE_STRENGTH = 260;
    var HOLE_D = 3.2;
    exports.BEAMS = [
        { id: 0, size: 9.5, thickness: 0.7, massPerLength: 0.104 },
        { id: 1, size: 12.5, thickness: 0.7, massPerLength: 0.137 },
        { id: 2, size: 12.5, thickness: 0.9, massPerLength: 0.176 },
        { id: 3, size: 16, thickness: 0.9, massPerLength: 0.226 },
        { id: 4, size: 16, thickness: 1.1, massPerLength: 0.276 },
        { id: 5, size: 19, thickness: 1.1, massPerLength: 0.328 },
    ];
    var BUCKLE_A = {
        scale: 1.938,
        range: [12.2, 116.3],
        coefficients: [
            232.506,
            0,
            -0.170192,
            0.003336,
            -0.0000254,
            7.014e-8,
        ],
    };
    function GetEffectiveArea(beam) {
        return (3 * beam.size / 2 - HOLE_D) * beam.thickness * 0.9;
    }
    exports.GetEffectiveArea = GetEffectiveArea;
    function GetBuckleStress(member, type) {
        if (type === void 0) { type = BUCKLE_A; }
        var lengthPerB = member.length / member.beamType.size;
        var graphX = Math.min(Math.max(lengthPerB * type.scale, type.range[0]), type.range[1]);
        var stress = 0;
        for (var i = 0; i < type.coefficients.length; i++) {
            stress += type.coefficients[i] * Math.pow(graphX, i);
        }
        return stress;
    }
    function SumForces(joint, analytical) {
        var forceIn = [joint.force[0], joint.force[1]];
        if (analytical && math_util_1.Magnitude(forceIn) != 0) {
            forceIn = math_util_1.Normalize(forceIn);
        }
        var unknowns = [];
        var directions = [];
        for (var _i = 0, _a = joint.membersIn; _i < _a.length; _i++) {
            var member = _a[_i];
            if (!member.tensionKnown) {
                unknowns.push(member);
                directions.push(1);
                continue;
            }
            var force = math_util_1.ScaleVector(member.direction, -member.tension);
            forceIn = math_util_1.AddVectors(forceIn, force);
        }
        for (var _b = 0, _c = joint.membersOut; _b < _c.length; _b++) {
            var member = _c[_b];
            if (!member.tensionKnown) {
                unknowns.push(member);
                directions.push(-1);
                continue;
            }
            var force = math_util_1.ScaleVector(member.direction, member.tension);
            forceIn = math_util_1.AddVectors(forceIn, force);
        }
        return { forceIn: forceIn, unknowns: unknowns, directions: directions };
    }
    function SolveFreeJoint(joint, analytical) {
        var forces = SumForces(joint, analytical);
        var _a = [forces.unknowns[0].direction, forces.unknowns[1].direction], d1 = _a[0], d2 = _a[1];
        var N2 = (d1[0] * forces.forceIn[1] - forces.forceIn[0] * d1[1]) / (d2[1] * d1[0] - d2[0] * d1[1]);
        var N1 = (forces.forceIn[0] - N2 * d2[0]) / d1[0];
        forces.unknowns[0].tension = N1 * forces.directions[0];
        forces.unknowns[1].tension = N2 * forces.directions[1];
        forces.unknowns[0].tensionKnown = true;
        forces.unknowns[1].tensionKnown = true;
    }
    function SolveNextJoint(joints, analytical, analyticalMult) {
        var unknownMember = false;
        for (var _i = 0, _a = Object.values(joints); _i < _a.length; _i++) {
            var joint = _a[_i];
            if (joint.fixed)
                continue;
            var knownCount = math_util_1.Magnitude(joint.force) == 0 ? 0 : 1;
            var unknownCount = 0;
            var allMembers = __spreadArrays(joint.membersIn);
            allMembers.push.apply(allMembers, joint.membersOut);
            for (var _b = 0, allMembers_1 = allMembers; _b < allMembers_1.length; _b++) {
                var member = allMembers_1[_b];
                if (member.tensionKnown) {
                    knownCount++;
                    continue;
                }
                unknownCount++;
                unknownMember = true;
            }
            if (knownCount > 0 && unknownCount > 0 && unknownCount < 3) {
                SolveFreeJoint(joint, analytical);
                return SolveNextJoint(joints, analytical, analyticalMult);
            }
        }
        if (unknownMember) {
            return ["System is statically indeterminate"];
        }
        for (var _c = 0, _d = Object.values(joints); _c < _d.length; _c++) {
            var joint = _d[_c];
            if (!joint.fixed)
                continue;
            var sumForces = SumForces(joint, analytical).forceIn;
            joint.force = math_util_1.ScaleVector(sumForces, -analyticalMult);
        }
        return [];
    }
    function GetBucklingData(allMembers, mult) {
        for (var _i = 0, allMembers_2 = allMembers; _i < allMembers_2.length; _i++) {
            var member = allMembers_2[_i];
            if (member.tension * mult > 0)
                continue;
            var area = GetEffectiveArea(member.beamType);
            var stress = Math.abs(member.tension / area);
            var buckleStress = GetBuckleStress(member, BUCKLE_A);
            member.fails = Math.abs(stress * mult) > buckleStress;
            member.failsAtLoad = buckleStress / stress;
            member.failsAtLocal = buckleStress * area;
        }
    }
    function GetTensionData(allMembers, mult) {
        for (var _i = 0, allMembers_3 = allMembers; _i < allMembers_3.length; _i++) {
            var member = allMembers_3[_i];
            if (member.tension * mult < 0)
                continue;
            var area = GetEffectiveArea(member.beamType);
            var stress = Math.abs(member.tension / area);
            if (member.name == "d") {
                console.log(member.tension);
                console.log(stress);
            }
            member.fails = Math.abs(stress * mult) > TENSILE_STRENGTH;
            member.failsAtLoad = TENSILE_STRENGTH / stress;
            member.failsAtLocal = TENSILE_STRENGTH * area;
        }
    }
    function MemberMass(allMembers) {
        var total = 0;
        for (var _i = 0, allMembers_4 = allMembers; _i < allMembers_4.length; _i++) {
            var member = allMembers_4[_i];
            total += member.beamType.massPerLength * member.length;
        }
        return total;
    }
    function RunSimulation(joints, members) {
        var _a;
        var results = {
            members: [],
            joints: {},
            warnings: [],
            errors: [],
            analyticalMult: 1,
            analytical: false,
            mass: 0,
        };
        var forcesCount = 0;
        var allJoints = {};
        var allMembers = [];
        for (var _i = 0, joints_1 = joints; _i < joints_1.length; _i++) {
            var joint = joints_1[_i];
            if (joint.id in allJoints) {
                results.errors.push("Same joint added twice");
            }
            allJoints[joint.id] = {
                id: joint.id,
                name: joint.name,
                fixed: joint.fixed,
                force: joint.force,
                position: joint.position,
                membersIn: [],
                membersOut: [],
            };
            if (math_util_1.Magnitude(joint.force) != 0)
                forcesCount++;
        }
        switch (forcesCount) {
            case 0:
                results.errors.push("No forces found, cannot perform analysis");
                break;
            case 1:
                var forceObj = Object.values(allJoints).filter(function (obj) { return math_util_1.Magnitude(obj.force) != 0; })[0];
                results.analyticalMult = math_util_1.Magnitude(forceObj.force);
                results.analytical = true;
                break;
            default:
                results.warnings.push("Too many forces to solve analytically");
        }
        for (var _b = 0, members_1 = members; _b < members_1.length; _b++) {
            var member = members_1[_b];
            var startPos = allJoints[member.start].position;
            var endPos = allJoints[member.end].position;
            var direction = math_util_1.SubVectors(endPos, startPos);
            var directionNorm = math_util_1.Normalize(direction);
            var memberInfo = {
                name: member.name,
                tensionKnown: false,
                failsAtLocal: 0,
                failsAtLoad: 0,
                fails: false,
                tension: 0,
                stress: 0,
                direction: directionNorm,
                startId: member.start,
                endId: member.end,
                length: math_util_1.Magnitude(direction),
                beamType: exports.BEAMS[member.type],
            };
            allJoints[member.start].membersOut.push(memberInfo);
            allJoints[member.end].membersIn.push(memberInfo);
            allMembers.push(memberInfo);
        }
        results.joints = allJoints;
        results.members = allMembers;
        (_a = results.errors).push.apply(_a, SolveNextJoint(results.joints, results.analytical, results.analyticalMult));
        results.mass = MemberMass(allMembers);
        GetBucklingData(allMembers, results.analyticalMult);
        GetTensionData(allMembers, results.analyticalMult);
        return results;
    }
    exports.RunSimulation = RunSimulation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbmFseXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7SUE4REEsSUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUM7SUFDN0IsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBRU4sUUFBQSxLQUFLLEdBQVU7UUFDeEIsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3ZELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztRQUN4RCxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7UUFDeEQsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3RELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztRQUN0RCxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7S0FDekQsQ0FBQztJQUVGLElBQU0sUUFBUSxHQUFlO1FBQ3pCLEtBQUssRUFBRSxLQUFLO1FBQ1osS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztRQUNwQixZQUFZLEVBQUU7WUFDVixPQUFPO1lBQ1AsQ0FBQztZQUNELENBQUMsUUFBUTtZQUNULFFBQVE7WUFDUixDQUFDLFNBQVM7WUFDVixRQUFRO1NBQ1g7S0FDSixDQUFDO0lBRUYsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBVTtRQUN2QyxPQUFPLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO0lBQzNELENBQUM7SUFGRCw0Q0FFQztJQUVELFNBQVMsZUFBZSxDQUFDLE1BQWlCLEVBQUUsSUFBMkI7UUFBM0IscUJBQUEsRUFBQSxlQUEyQjtRQUNuRSxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ3RELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNmLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsR0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQyxNQUFNLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN4RDtRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxTQUFTLFNBQVMsQ0FBQyxLQUFnQixFQUFFLFVBQWtCO1FBQ25ELElBQUksT0FBTyxHQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBRyxVQUFVLElBQUkscUJBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFFdEMsT0FBTyxHQUFHLHFCQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDaEM7UUFDRCxJQUFJLFFBQVEsR0FBZ0IsRUFBRSxDQUFDO1FBQy9CLElBQUksVUFBVSxHQUFhLEVBQUUsQ0FBQztRQUM5QixLQUFrQixVQUFlLEVBQWYsS0FBQSxLQUFLLENBQUMsU0FBUyxFQUFmLGNBQWUsRUFBZixJQUFlLEVBQUU7WUFBL0IsSUFBSSxNQUFNLFNBQUE7WUFDVixJQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtnQkFDckIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEIsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkIsU0FBUzthQUNaO1lBQ0QsSUFBTSxLQUFLLEdBQUcsdUJBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdELE9BQU8sR0FBRyxzQkFBVSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN4QztRQUNELEtBQWtCLFVBQWdCLEVBQWhCLEtBQUEsS0FBSyxDQUFDLFVBQVUsRUFBaEIsY0FBZ0IsRUFBaEIsSUFBZ0IsRUFBRTtZQUFoQyxJQUFJLE1BQU0sU0FBQTtZQUNWLElBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO2dCQUNyQixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0QixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLFNBQVM7YUFDWjtZQUNELElBQU0sS0FBSyxHQUFHLHVCQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUQsT0FBTyxHQUFHLHNCQUFVLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3hDO1FBQ0QsT0FBTyxFQUFDLE9BQU8sRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUMsVUFBVSxFQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLEtBQWdCLEVBQUUsVUFBa0I7UUFDeEQsSUFBSSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN0QyxJQUFBLGlFQUF1RSxFQUF0RSxVQUFFLEVBQUUsVUFBa0UsQ0FBQztRQUM1RSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRyxJQUFJLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5QyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUt2RCxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDdkMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0lBQzNDLENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FBQyxNQUFvQixFQUFFLFVBQWtCLEVBQUUsY0FBcUI7UUFDbkYsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1FBQzFCLEtBQWlCLFVBQXFCLEVBQXJCLEtBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBckIsY0FBcUIsRUFBckIsSUFBcUIsRUFBRTtZQUFwQyxJQUFJLEtBQUssU0FBQTtZQUNULElBQUcsS0FBSyxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUN6QixJQUFJLFVBQVUsR0FBRyxxQkFBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBRSxDQUFDLENBQUEsQ0FBQyxDQUFBLENBQUMsQ0FBQSxDQUFDLENBQUEsQ0FBQyxDQUFDO1lBQy9DLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJLFVBQVUsa0JBQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RDLFVBQVUsQ0FBQyxJQUFJLE9BQWYsVUFBVSxFQUFTLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDckMsS0FBa0IsVUFBVSxFQUFWLHlCQUFVLEVBQVYsd0JBQVUsRUFBVixJQUFVLEVBQUU7Z0JBQTFCLElBQUksTUFBTSxtQkFBQTtnQkFDVixJQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUU7b0JBQ3BCLFVBQVUsRUFBRSxDQUFDO29CQUNiLFNBQVM7aUJBQ1o7Z0JBQ0QsWUFBWSxFQUFFLENBQUM7Z0JBQ2YsYUFBYSxHQUFHLElBQUksQ0FBQzthQUN4QjtZQUNELElBQUcsVUFBVSxHQUFHLENBQUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUU7Z0JBRXZELGNBQWMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ2xDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDN0Q7U0FDSjtRQUNELElBQUcsYUFBYSxFQUFFO1lBQ2QsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7U0FDakQ7UUFDRCxLQUFpQixVQUFxQixFQUFyQixLQUFBLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQXJCLGNBQXFCLEVBQXJCLElBQXFCLEVBQUU7WUFBcEMsSUFBSSxLQUFLLFNBQUE7WUFDVCxJQUFHLENBQUMsS0FBSyxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUMxQixJQUFJLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNyRCxLQUFLLENBQUMsS0FBSyxHQUFHLHVCQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDekQ7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBQyxVQUF1QixFQUFFLElBQVc7UUFDekQsS0FBa0IsVUFBVSxFQUFWLHlCQUFVLEVBQVYsd0JBQVUsRUFBVixJQUFVLEVBQUU7WUFBMUIsSUFBSSxNQUFNLG1CQUFBO1lBQ1YsSUFBRyxNQUFNLENBQUMsT0FBTyxHQUFDLElBQUksR0FBRyxDQUFDO2dCQUFFLFNBQVM7WUFFckMsSUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQy9DLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxJQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRXZELE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxXQUFXLEdBQUcsWUFBWSxHQUFDLE1BQU0sQ0FBQztZQUN6QyxNQUFNLENBQUMsWUFBWSxHQUFHLFlBQVksR0FBQyxJQUFJLENBQUM7U0FDM0M7SUFDTCxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUMsVUFBdUIsRUFBRSxJQUFXO1FBQ3hELEtBQWtCLFVBQVUsRUFBVix5QkFBVSxFQUFWLHdCQUFVLEVBQVYsSUFBVSxFQUFFO1lBQTFCLElBQUksTUFBTSxtQkFBQTtZQUNWLElBQUcsTUFBTSxDQUFDLE9BQU8sR0FBQyxJQUFJLEdBQUcsQ0FBQztnQkFBRSxTQUFTO1lBRXJDLElBQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvQyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsSUFBRyxNQUFNLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRTtnQkFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDdkI7WUFFRCxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxHQUFDLGdCQUFnQixDQUFDO1lBRXRELE1BQU0sQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLEdBQUMsTUFBTSxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLEdBQUMsSUFBSSxDQUFDO1NBQy9DO0lBQ0wsQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFDLFVBQXVCO1FBQ3ZDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLEtBQWtCLFVBQVUsRUFBVix5QkFBVSxFQUFWLHdCQUFVLEVBQVYsSUFBVSxFQUFFO1lBQTFCLElBQUksTUFBTSxtQkFBQTtZQUNWLEtBQUssSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1NBQzFEO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVELFNBQWdCLGFBQWEsQ0FBQyxNQUFtQixFQUFFLE9BQXFCOztRQUNwRSxJQUFJLE9BQU8sR0FBaUI7WUFDeEIsT0FBTyxFQUFDLEVBQUU7WUFDVixNQUFNLEVBQUMsRUFBRTtZQUNULFFBQVEsRUFBQyxFQUFFO1lBQ1gsTUFBTSxFQUFDLEVBQUU7WUFDVCxjQUFjLEVBQUUsQ0FBQztZQUNqQixVQUFVLEVBQUUsS0FBSztZQUNqQixJQUFJLEVBQUMsQ0FBQztTQUNULENBQUE7UUFDRCxJQUFJLFdBQVcsR0FBVSxDQUFDLENBQUM7UUFDM0IsSUFBSSxTQUFTLEdBQWdCLEVBQUUsQ0FBQztRQUNoQyxJQUFJLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRWpDLEtBQWlCLFVBQU0sRUFBTixpQkFBTSxFQUFOLG9CQUFNLEVBQU4sSUFBTSxFQUFFO1lBQXJCLElBQUksS0FBSyxlQUFBO1lBQ1QsSUFBRyxLQUFLLENBQUMsRUFBRSxJQUFJLFNBQVMsRUFBRTtnQkFDdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQzthQUNqRDtZQUNELFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUc7Z0JBQ2xCLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDWixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7Z0JBRWhCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztnQkFDbEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO2dCQUNsQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7Z0JBQ3hCLFNBQVMsRUFBRSxFQUFFO2dCQUNiLFVBQVUsRUFBRSxFQUFFO2FBQ2pCLENBQUM7WUFDRixJQUFHLHFCQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQUUsV0FBVyxFQUFFLENBQUM7U0FDakQ7UUFFRCxRQUFPLFdBQVcsRUFBRTtZQUNoQixLQUFLLENBQUM7Z0JBQ0YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsMENBQTBDLENBQUMsQ0FBQztnQkFDaEUsTUFBTTtZQUNWLEtBQUssQ0FBQztnQkFDRixJQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFDLEdBQUcsSUFBSSxPQUFPLHFCQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRyxPQUFPLENBQUMsY0FBYyxHQUFHLHFCQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuRCxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztnQkFDMUIsTUFBTTtZQUNWO2dCQUNJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7U0FDdEU7UUFFRCxLQUFrQixVQUFPLEVBQVAsbUJBQU8sRUFBUCxxQkFBTyxFQUFQLElBQU8sRUFBRTtZQUF2QixJQUFJLE1BQU0sZ0JBQUE7WUFDVixJQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUNsRCxJQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUM5QyxJQUFNLFNBQVMsR0FBRyxzQkFBVSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM5QyxJQUFNLGFBQWEsR0FBRyxxQkFBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTNDLElBQU0sVUFBVSxHQUFjO2dCQUMxQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7Z0JBQ2pCLFlBQVksRUFBRSxLQUFLO2dCQUNuQixZQUFZLEVBQUUsQ0FBQztnQkFDZixXQUFXLEVBQUUsQ0FBQztnQkFFZCxLQUFLLEVBQUUsS0FBSztnQkFDWixPQUFPLEVBQUUsQ0FBQztnQkFDVixNQUFNLEVBQUMsQ0FBQztnQkFDUixTQUFTLEVBQUUsYUFBYTtnQkFFeEIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxLQUFLO2dCQUNyQixLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUc7Z0JBRWpCLE1BQU0sRUFBRSxxQkFBUyxDQUFDLFNBQVMsQ0FBQztnQkFDNUIsUUFBUSxFQUFFLGFBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO2FBQy9CLENBQUM7WUFDRixTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEQsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pELFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDL0I7UUFDRCxPQUFPLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUMzQixPQUFPLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztRQUU3QixDQUFBLEtBQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQSxDQUFDLElBQUksV0FBSSxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNuRyxPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0QyxlQUFlLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRCxjQUFjLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxPQUFPLE9BQU8sQ0FBQztJQUNuQixDQUFDO0lBaEZELHNDQWdGQyJ9