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
        range: [6.164, 59.8],
        coefficients: [
            262.049,
            -7.44737,
            -0.0381352,
            0.00328752,
            -0.00002839,
        ],
    };
    var BUCKLE_B = {
        range: [9.88, 59.88],
        coefficients: [
            267.832792683,
            -5.41701346492,
            0.00764445890144,
            0.003336,
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
        var graphX = Math.min(Math.max(lengthPerB, type.range[0]), type.range[1]);
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
            var allMembers = joint.membersIn.slice();
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
                try {
                    SolveFreeJoint(joint, analytical);
                    return SolveNextJoint(joints, analytical, analyticalMult);
                }
                catch (e) {
                    return ["Could not complete analysis -- system could be statically indeterminate"];
                }
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
            var buckleStress = GetBuckleStress(member, BUCKLE_GRAPHS[member.data.beamCount - 1]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbmFseXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztJQXlEQSxJQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQztJQUM3QixJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUM7SUFFTixRQUFBLEtBQUssR0FBVTtRQUN4QixFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7UUFDdkQsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3hELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztRQUN4RCxFQUFDLEVBQUUsRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUM7UUFDdEQsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFDO1FBQ3RELEVBQUMsRUFBRSxFQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBQztLQUN6RCxDQUFDO0lBRUYsSUFBTSxRQUFRLEdBQWU7UUFDekIsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQztRQUNwQixZQUFZLEVBQUU7WUFDVixPQUFPO1lBQ1AsQ0FBQyxPQUFPO1lBQ1IsQ0FBQyxTQUFTO1lBQ1YsVUFBVTtZQUNWLENBQUMsVUFBVTtTQUNkO0tBQ0os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