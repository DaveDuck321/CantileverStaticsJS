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
    var BUCKLE_A = {
        scale: 0.4714,
        constant: 217.878,
        range: [14.16, 127.28],
        powers: [
            3.10697,
            -500,
            -2.59809,
            3.12095,
            3.0868,
            3.08013,
        ],
        coefficients: [
            -180.56,
            -0.0081,
            13360.1,
            65.2226,
            330.267,
            -214.963,
        ],
    };
    function buckleStress(lengthPerB, type) {
        if (type === void 0) { type = BUCKLE_A; }
        var measureAt = Math.min(Math.max(lengthPerB / type.scale, type.range[0]), type.range[1]);
        var point = type.constant;
        for (var i = 0; i < type.powers.length; i++) {
            point += type.coefficients[i] * Math.pow(measureAt, type.powers[i]);
        }
        return point;
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
        console.log(joint);
        console.log(forceIn);
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
    function RunSimulation(joints, members) {
        var _a;
        var results = {
            members: [],
            joints: [],
            warnings: [],
            errors: [],
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
                tension: 0,
                direction: directionNorm,
                startId: member.start,
                endId: member.end,
                length: vecMaths_1.Magnitude(direction),
                size: 16,
                thickness: 1.6,
            };
            allJoints[member.start].membersOut.push(memberInfo);
            allJoints[member.end].membersIn.push(memberInfo);
            allMembers.push(memberInfo);
        }
        results.joints = allJoints;
        results.members = allMembers;
        (_a = results.errors).push.apply(_a, SolveNextJoint(results.joints));
        console.log(results.members);
        return results;
    }
    exports.RunSimulation = RunSimulation;
});
