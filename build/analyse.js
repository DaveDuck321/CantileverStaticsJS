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
