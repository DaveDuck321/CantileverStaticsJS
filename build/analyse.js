define(["require", "exports", "./vecMaths"], function (require, exports, vecMaths_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        scale: 0.4714,
        constant: -449,
        range: [14.4, 127.28],
        coefficients: [
            43.7698,
            -3.27768,
            0.11777,
            -0.002437,
            0.0000302,
            -2.2165e-7,
            8.8383e-10,
            -1.4779e-12,
        ],
    };
    function GetEffectiveArea(beam) {
        return ((3 * beam.size * beam.thickness) / 2 - HOLE_D) * 0.9;
    }
    function GetBuckleStress(member, type) {
        if (type === void 0) { type = BUCKLE_A; }
        var lengthPerB = member.length / member.beamType.size;
        var graphX = Math.min(Math.max(lengthPerB / type.scale, type.range[0]), type.range[1]);
        var stress = type.constant;
        for (var i = 0; i < type.coefficients.length; i++) {
            stress += type.coefficients[i] * Math.pow(graphX, i);
        }
        return stress;
    }
    function SumForces(joint) {
        var forceIn = [joint.force[0], joint.force[1]];
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
    function SolveFreeJoint(joint) {
        var forces = SumForces(joint);
        var _a = [forces.unknowns[0].direction, forces.unknowns[1].direction], d1 = _a[0], d2 = _a[1];
        var N2 = (d1[0] * forces.forceIn[1] - forces.forceIn[0] * d1[1]) / (d2[1] * d1[0] - d2[0] * d1[1]);
        var N1 = (forces.forceIn[0] - N2 * d2[0]) / d1[0];
        forces.unknowns[0].tension = N1 * forces.directions[0];
        forces.unknowns[1].tension = N2 * forces.directions[1];
        forces.unknowns[0].tensionKnown = true;
        forces.unknowns[1].tensionKnown = true;
    }
    function SolveNextJoint(joints) {
        var unknownMember = false;
        for (var _i = 0, _a = Object.values(joints); _i < _a.length; _i++) {
            var joint = _a[_i];
            if (joint.fixed)
                continue;
            var knownCount = vecMaths_1.Magnitude(joint.force) == 0 ? 0 : 1;
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
                SolveFreeJoint(joint);
                return SolveNextJoint(joints);
            }
        }
        if (unknownMember) {
            return ["System is statically indeterminate"];
        }
        for (var _c = 0, _d = Object.values(joints); _c < _d.length; _c++) {
            var joint = _d[_c];
            if (!joint.fixed)
                continue;
            var sumForces = SumForces(joint).forceIn;
            joint.force = vecMaths_1.ScaleVector(sumForces, -1);
        }
        return [];
    }
    function GetBucklingData(allMembers) {
        for (var _i = 0, allMembers_2 = allMembers; _i < allMembers_2.length; _i++) {
            var member = allMembers_2[_i];
            if (member.tension > 0)
                continue;
            var area = GetEffectiveArea(member.beamType);
            var stress = Math.abs(member.tension / area);
            var buckleStress = GetBuckleStress(member, BUCKLE_A);
            if (stress > buckleStress) {
                console.log({ buckleStress: buckleStress, stress: stress });
                member.buckles = true;
            }
        }
    }
    function MemberMass(allMembers) {
        var total = 0;
        for (var _i = 0, allMembers_3 = allMembers; _i < allMembers_3.length; _i++) {
            var member = allMembers_3[_i];
            total += member.beamType.massPerLength * member.length;
        }
        return total;
    }
    function RunSimulation(joints, members) {
        var _a;
        var results = {
            members: [],
            joints: [],
            warnings: [],
            errors: [],
            mass: 0,
        };
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
                buckles: false,
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
        (_a = results.errors).push.apply(_a, SolveNextJoint(results.joints));
        results.mass = MemberMass(allMembers);
        GetBucklingData(allMembers);
        return results;
    }
    exports.RunSimulation = RunSimulation;
});
