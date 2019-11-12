var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
define(["require", "exports", "./vecMaths"], function (require, exports, vecMaths_1) {
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
        return ((3 * beam.size * beam.thickness) / 2 - HOLE_D) * 0.9;
    }
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
        if (analytical && vecMaths_1.Magnitude(forceIn) != 0) {
            forceIn = vecMaths_1.Normalize(forceIn);
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
            var force = vecMaths_1.ScaleVector(member.direction, -member.tension);
            forceIn = vecMaths_1.AddVectors(forceIn, force);
        }
        for (var _b = 0, _c = joint.membersOut; _b < _c.length; _b++) {
            var member = _c[_b];
            if (!member.tensionKnown) {
                unknowns.push(member);
                directions.push(-1);
                continue;
            }
            var force = vecMaths_1.ScaleVector(member.direction, member.tension);
            forceIn = vecMaths_1.AddVectors(forceIn, force);
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
            var knownCount = vecMaths_1.Magnitude(joint.force) == 0 ? 0 : 1;
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
            joint.force = vecMaths_1.ScaleVector(sumForces, -analyticalMult);
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
            member.failsAt = buckleStress / stress;
        }
    }
    function GetTensionData(allMembers, mult) {
        for (var _i = 0, allMembers_3 = allMembers; _i < allMembers_3.length; _i++) {
            var member = allMembers_3[_i];
            if (member.tension * mult < 0)
                continue;
            var area = GetEffectiveArea(member.beamType);
            var stress = Math.abs(member.tension / area);
            member.fails = Math.abs(stress * mult) > TENSILE_STRENGTH;
            member.failsAt = TENSILE_STRENGTH / stress;
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
            if (vecMaths_1.Magnitude(joint.force) != 0)
                forcesCount++;
        }
        switch (forcesCount) {
            case 0:
                results.errors.push("No forces found, cannot perform analysis");
                break;
            case 1:
                var forceObj = Object.values(allJoints).filter(function (obj) { return vecMaths_1.Magnitude(obj.force) != 0; })[0];
                results.analyticalMult = vecMaths_1.Magnitude(forceObj.force);
                results.analytical = true;
                break;
            default:
                results.warnings.push("Too many forces to solve analytically");
        }
        for (var _b = 0, members_1 = members; _b < members_1.length; _b++) {
            var member = members_1[_b];
            var startPos = allJoints[member.start].position;
            var endPos = allJoints[member.end].position;
            var direction = vecMaths_1.SubVectors(endPos, startPos);
            var directionNorm = vecMaths_1.Normalize(direction);
            var memberInfo = {
                name: member.name,
                tensionKnown: false,
                failsAt: 0,
                fails: false,
                tension: 0,
                direction: directionNorm,
                startId: member.start,
                endId: member.end,
                length: vecMaths_1.Magnitude(direction),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbmFseXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7SUE0REEsSUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUM7SUFDN0IsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBRU4sUUFBQSxLQUFLLEdBQVU7UUFDeEIsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3ZELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztRQUN4RCxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7UUFDeEQsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3RELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztRQUN0RCxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7S0FDekQsQ0FBQztJQUVGLElBQU0sUUFBUSxHQUFlO1FBQ3pCLEtBQUssRUFBRSxLQUFLO1FBQ1osS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztRQUNwQixZQUFZLEVBQUU7WUFDVixPQUFPO1lBQ1AsQ0FBQztZQUNELENBQUMsUUFBUTtZQUNULFFBQVE7WUFD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QUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxRQUFRLEVBQUUsVUFBVSxFQUFDLFVBQVUsRUFBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FBQyxLQUFnQixFQUFFLFVBQWtCO1FBQ3hELElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEMsSUFBQSxpRUFBdUUsRUFBdEUsVUFBRSxFQUFFLFVBQWtFLENBQUM7UUFDNUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkcsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLElB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