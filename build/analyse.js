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
    var BUCKLE_B = {
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
    var BUCKLE_GRAPHS = [BUCKLE_A, BUCKLE_B];
    function GetEffectiveArea(beam, beamCount) {
        return (3 * beam.size / 2 - HOLE_D) * beam.thickness * 0.9 * beamCount;
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
        var forceIn = [joint.externalForce[0], joint.externalForce[1]];
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
            if (joint.data.fixed)
                continue;
            var knownCount = math_util_1.Magnitude(joint.externalForce) == 0 ? 0 : 1;
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
            if (!joint.data.fixed)
                continue;
            var sumForces = SumForces(joint, analytical).forceIn;
            joint.externalForce = math_util_1.ScaleVector(sumForces, -analyticalMult);
        }
        return [];
    }
    function GetBucklingData(allMembers, mult) {
        for (var _i = 0, allMembers_2 = allMembers; _i < allMembers_2.length; _i++) {
            var member = allMembers_2[_i];
            if (member.tension * mult > 0)
                continue;
            var area = GetEffectiveArea(member.beamType, member.data.beamCount);
            var stress = Math.abs(member.tension / area);
            var buckleStress = GetBuckleStress(member, BUCKLE_GRAPHS[member.data.beamCount]);
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
            var area = GetEffectiveArea(member.beamType, member.data.beamCount);
            var stress = Math.abs(member.tension / area);
            member.fails = Math.abs(stress * mult) > TENSILE_STRENGTH;
            member.failsAtLoad = TENSILE_STRENGTH / stress;
            member.failsAtLocal = TENSILE_STRENGTH * area;
        }
    }
    function MemberMass(allMembers) {
        var total = 0;
        for (var _i = 0, allMembers_4 = allMembers; _i < allMembers_4.length; _i++) {
            var member = allMembers_4[_i];
            total += member.beamType.massPerLength * member.length * member.data.beamCount;
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
            if (joint.data.id in allJoints) {
                results.errors.push("Same joint added twice");
            }
            allJoints[joint.data.id] = {
                data: joint.data,
                externalForce: [joint.data.force[0], joint.data.force[1]],
                membersIn: [],
                membersOut: [],
            };
            if (math_util_1.Magnitude(joint.data.force) != 0)
                forcesCount++;
        }
        switch (forcesCount) {
            case 0:
                results.errors.push("No forces found, cannot perform analysis");
                break;
            case 1:
                var forceObj = Object.values(allJoints).filter(function (obj) { return math_util_1.Magnitude(obj.data.force) != 0; })[0];
                results.analyticalMult = math_util_1.Magnitude(forceObj.data.force);
                results.analytical = true;
                break;
            default:
                results.warnings.push("Too many forces to solve analytically");
        }
        for (var _b = 0, members_1 = members; _b < members_1.length; _b++) {
            var member = members_1[_b];
            var startPos = allJoints[member.data.startId].data.position;
            var endPos = allJoints[member.data.endId].data.position;
            var direction = math_util_1.SubVectors(endPos, startPos);
            var directionNorm = math_util_1.Normalize(direction);
            var memberInfo = {
                data: member.data,
                tensionKnown: false,
                failsAtLocal: 0,
                failsAtLoad: 0,
                fails: false,
                tension: 0,
                stress: 0,
                direction: directionNorm,
                length: math_util_1.Magnitude(direction),
                beamType: exports.BEAMS[member.data.beamType],
            };
            allJoints[member.data.startId].membersOut.push(memberInfo);
            allJoints[member.data.endId].membersIn.push(memberInfo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbmFseXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7SUEwREEsSUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUM7SUFDN0IsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBRU4sUUFBQSxLQUFLLEdBQVU7UUFDeEIsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3ZELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztRQUN4RCxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7UUFDeEQsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3RELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztRQUN0RCxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7S0FDekQsQ0FBQztJQUVGLElBQU0sUUFBUSxHQUFlO1FBQ3pCLEtBQUssRUFBRSxLQUFLO1FBQ1osS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztRQUNwQixZQUFZLEVBQUU7WUFDVixPQUFPO1lBQ1AsQ0FBQztZQUNELENBQUMsUUFBUTtZQUNULFFBQVE7WUFDUixDQUFDLFNBQVM7WUFDVixRQUFRO1NBQ1g7S0FDSixDQUFDO0lBRUYsSUFBTSxRQUFRLEdBQWU7UUFDekIsS0FBSyxFQUFFLEtBQUs7UUFDWixLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO1FBQ3BCLFlBQVksRUFBRTtZQUNWLE9BQU87WUFDUCxDQUFDO1lBQ0QsQ0FBQyxRQUFRO1lBQ1QsUUFBUTtZQUNSLENBQUMsU0FBUztZQUNWLFFBQVE7U0FDWDtLQUNKLENBQUM7SUFFRixJQUFNLGFBQWEsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUzQyxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFVLEVBQUUsU0FBaUI7UUFDMUQsT0FBTyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUM7SUFDdkUsQ0FBQztJQUZELDRDQUVDO0lBRUQsU0FBUyxlQUFlLENBQUMsTUFBaUIsRUFBRSxJQUEyQjtRQUEzQixxQkFBQSxFQUFBLGVBQTJCO1FBQ25FLElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDdEQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckYsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFDLE1BQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3hEO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLEtBQWdCLEVBQUUsVUFBa0I7UUFDbkQsSUFBSSxPQUFPLEdBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSxJQUFHLFVBQVUsSUFBSSxxQkFBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUV0QyxPQUFPLEdBQUcscUJBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNoQztRQUNELElBQUksUUFBUSxHQUFnQixFQUFFLENBQUM7UUFDL0IsSUFBSSxVQUFVLEdBQWEsRUFBRSxDQUFDO1FBQzlCLEtBQWtCLFVBQWUsRUFBZixLQUFBLEtBQUssQ0FBQyxTQUFTLEVBQWYsY0FBZSxFQUFmLElBQWUsRUFBRTtZQUEvQixJQUFJLE1BQU0sU0FBQTtZQUNWLElBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO2dCQUNyQixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0QixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixTQUFTO2FBQ1o7WUFDRCxJQUFNLEtBQUssR0FBRyx1QkFBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0QsT0FBTyxHQUFHLHNCQUFVLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3hDO1FBQ0QsS0FBa0IsVUFBZ0IsRUFBaEIsS0FBQSxLQUFLLENBQUMsVUFBVSxFQUFoQixjQUFnQixFQUFoQixJQUFnQixFQUFFO1lBQWhDLElBQUksTUFBTSxTQUFBO1lBQ1YsSUFBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7Z0JBQ3JCLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3RCLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEIsU0FBUzthQUNaO1lBQ0QsSUFBTSxLQUFLLEdBQUcsdUJBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1RCxPQUFPLEdBQUcsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDeEM7UUFDRCxPQUFPLEVBQUMsT0FBTyxFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBQyxVQUFVLEVBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUMsS0FBZ0IsRUFBRSxVQUFrQjtRQUN4RCxJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3RDLElBQUEsaUVBQXVFLEVBQXRFLFVBQUUsRUFBRSxVQUFrRSxDQUFDO1FBQzVFLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25HLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXZELE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUN2QyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7SUFDM0MsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLE1BQW9CLEVBQUUsVUFBa0IsRUFBRSxjQUFxQjtRQUNuRixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDMUIsS0FBaUIsVUFBa0MsRUFBbEMsS0FBYSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFsQyxjQUFrQyxFQUFsQyxJQUFrQyxFQUFFO1lBQWpELElBQUksS0FBSyxTQUFBO1lBQ1QsSUFBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUM5QixJQUFJLFVBQVUsR0FBRyxxQkFBUyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBRSxDQUFDLENBQUEsQ0FBQyxDQUFBLENBQUMsQ0FBQSxDQUFDLENBQUEsQ0FBQyxDQUFDO1lBQ3ZELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJLFVBQVUsa0JBQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RDLFVBQVUsQ0FBQyxJQUFJLE9BQWYsVUFBVSxFQUFTLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDckMsS0FBa0IsVUFBVSxFQUFWLHlCQUFVLEVBQVYsd0JBQVUsRUFBVixJQUFVLEVBQUU7Z0JBQTFCLElBQUksTUFBTSxtQkFBQTtnQkFDVixJQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUU7b0JBQ3BCLFVBQVUsRUFBRSxDQUFDO29CQUNiLFNBQVM7aUJBQ1o7Z0JBQ0QsWUFBWSxFQUFFLENBQUM7Z0JBQ2YsYUFBYSxHQUFHLElBQUksQ0FBQzthQUN4QjtZQUNELElBQUcsVUFBVSxHQUFHLENBQUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUU7Z0JBRXZELGNBQWMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ2xDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDN0Q7U0FDSjtRQUNELElBQUcsYUFBYSxFQUFFO1lBQ2QsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7U0FDakQ7UUFDRCxLQUFpQixVQUFrQyxFQUFsQyxLQUFhLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQWxDLGNBQWtDLEVBQWxDLElBQWtDLEVBQUU7WUFBakQsSUFBSSxLQUFLLFNBQUE7WUFDVCxJQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLO2dCQUFFLFNBQVM7WUFDL0IsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDckQsS0FBSyxDQUFDLGFBQWEsR0FBRyx1QkFBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQ2pFO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDZCxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsVUFBdUIsRUFBRSxJQUFXO1FBQ3pELEtBQWtCLFVBQVUsRUFBVix5QkFBVSxFQUFWLHdCQUFVLEVBQVYsSUFBVSxFQUFFO1lBQTFCLElBQUksTUFBTSxtQkFBQTtZQUNWLElBQUcsTUFBTSxDQUFDLE9BQU8sR0FBQyxJQUFJLEdBQUcsQ0FBQztnQkFBRSxTQUFTO1lBRXJDLElBQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0RSxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsSUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBRW5GLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxXQUFXLEdBQUcsWUFBWSxHQUFDLE1BQU0sQ0FBQztZQUN6QyxNQUFNLENBQUMsWUFBWSxHQUFHLFlBQVksR0FBQyxJQUFJLENBQUM7U0FDM0M7SUFDTCxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUMsVUFBdUIsRUFBRSxJQUFXO1FBQ3hELEtBQWtCLFVBQVUsRUFBVix5QkFBVSxFQUFWLHdCQUFVLEVBQVYsSUFBVSxFQUFFO1lBQTFCLElBQUksTUFBTSxtQkFBQTtZQUNWLElBQUcsTUFBTSxDQUFDLE9BQU8sR0FBQyxJQUFJLEdBQUcsQ0FBQztnQkFBRSxTQUFTO1lBRXJDLElBQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0RSxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUMsSUFBSSxDQUFDLENBQUM7WUFFN0MsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsR0FBQyxnQkFBZ0IsQ0FBQztZQUV0RCxNQUFNLENBQUMsV0FBVyxHQUFHLGdCQUFnQixHQUFDLE1BQU0sQ0FBQztZQUM3QyxNQUFNLENBQUMsWUFBWSxHQUFHLGdCQUFnQixHQUFDLElBQUksQ0FBQztTQUMvQztJQUNMLENBQUM7SUFFRCxTQUFTLFVBQVUsQ0FBQyxVQUF1QjtRQUN2QyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFrQixVQUFVLEVBQVYseUJBQVUsRUFBVix3QkFBVSxFQUFWLElBQVUsRUFBRTtZQUExQixJQUFJLE1BQU0sbUJBQUE7WUFDVixLQUFLLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztTQUNsRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxTQUFnQixhQUFhLENBQUMsTUFBbUIsRUFBRSxPQUFxQjs7UUFDcEUsSUFBSSxPQUFPLEdBQWlCO1lBQ3hCLE9BQU8sRUFBQyxFQUFFO1lBQ1YsTUFBTSxFQUFDLEVBQUU7WUFDVCxRQUFRLEVBQUMsRUFBRTtZQUNYLE1BQU0sRUFBQyxFQUFFO1lBQ1QsY0FBYyxFQUFFLENBQUM7WUFDakIsVUFBVSxFQUFFLEtBQUs7WUFDakIsSUFBSSxFQUFDLENBQUM7U0FDVCxDQUFBO1FBQ0QsSUFBSSxXQUFXLEdBQVUsQ0FBQyxDQUFDO1FBQzNCLElBQUksU0FBUyxHQUFnQixFQUFFLENBQUM7UUFDaEMsSUFBSSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUVqQyxLQUFpQixVQUFNLEVBQU4saUJBQU0sRUFBTixvQkFBTSxFQUFOLElBQU0sRUFBRTtZQUFyQixJQUFJLEtBQUssZUFBQTtZQUNULElBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksU0FBUyxFQUFFO2dCQUMzQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2FBQ2pEO1lBQ0QsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUc7Z0JBQ3ZCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtnQkFDaEIsYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELFNBQVMsRUFBRSxFQUFFO2dCQUNiLFVBQVUsRUFBRSxFQUFFO2FBQ2pCLENBQUM7WUFDRixJQUFHLHFCQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUFFLFdBQVcsRUFBRSxDQUFDO1NBQ3REO1FBRUQsUUFBTyxXQUFXLEVBQUU7WUFDaEIsS0FBSyxDQUFDO2dCQUNGLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLENBQUM7Z0JBQ2hFLE1BQU07WUFDVixLQUFLLENBQUM7Z0JBQ0YsSUFBTSxRQUFRLEdBQWMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBQyxHQUFHLElBQUksT0FBTyxxQkFBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hILE9BQU8sQ0FBQyxjQUFjLEdBQUcscUJBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4RCxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztnQkFDMUIsTUFBTTtZQUNWO2dCQUNJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7U0FDdEU7UUFFRCxLQUFrQixVQUFPLEVBQVAsbUJBQU8sRUFBUCxxQkFBTyxFQUFQLElBQU8sRUFBRTtZQUF2QixJQUFJLE1BQU0sZ0JBQUE7WUFDVixJQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzlELElBQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDMUQsSUFBTSxTQUFTLEdBQUcsc0JBQVUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDOUMsSUFBTSxhQUFhLEdBQUcscUJBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUUzQyxJQUFNLFVBQVUsR0FBYztnQkFDMUIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO2dCQUVqQixZQUFZLEVBQUUsS0FBSztnQkFDbkIsWUFBWSxFQUFFLENBQUM7Z0JBQ2YsV0FBVyxFQUFFLENBQUM7Z0JBRWQsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osT0FBTyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxFQUFDLENBQUM7Z0JBQ1IsU0FBUyxFQUFFLGFBQWE7Z0JBRXhCLE1BQU0sRUFBRSxxQkFBUyxDQUFDLFNBQVMsQ0FBQztnQkFDNUIsUUFBUSxFQUFFLGFBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUN4QyxDQUFDO1lBQ0YsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMzRCxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3hELFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDL0I7UUFDRCxPQUFPLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUMzQixPQUFPLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztRQUU3QixDQUFBLEtBQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQSxDQUFDLElBQUksV0FBSSxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNuRyxPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0QyxlQUFlLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRCxjQUFjLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxPQUFPLE9BQU8sQ0FBQztJQUNuQixDQUFDO0lBMUVELHNDQTBFQyJ9