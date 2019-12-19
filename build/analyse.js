define(["require", "exports", "./math_util", "./consts"], function (require, exports, math_util_1, consts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TENSILE_STRENGTH = 260;
    var HOLE_D = 3.2;
    function GetEffectiveArea(beam, beamCount) {
        return (3 * beam.size / 2 - HOLE_D) * beam.thickness * 0.9 * beamCount;
    }
    exports.GetEffectiveArea = GetEffectiveArea;
    function GetBuckleStress(member, type) {
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
            var buckleStress = GetBuckleStress(member, consts_1.BUCKLE_GRAPHS[member.data.beamCount - 1]);
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
            if (joint.id in allJoints) {
                results.errors.push("Same joint added twice");
            }
            allJoints[joint.id] = {
                data: joint,
                externalForce: [joint.force[0], joint.force[1]],
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
                var forceObj = Object.values(allJoints).filter(function (obj) { return math_util_1.Magnitude(obj.data.force) != 0; })[0];
                results.analyticalMult = math_util_1.Magnitude(forceObj.data.force);
                results.analytical = true;
                break;
            default:
                results.warnings.push("Too many forces to solve analytically");
        }
        for (var _b = 0, members_1 = members; _b < members_1.length; _b++) {
            var member = members_1[_b];
            var startPos = allJoints[member.startId].data.position;
            var endPos = allJoints[member.endId].data.position;
            var direction = math_util_1.SubVectors(endPos, startPos);
            var directionNorm = math_util_1.Normalize(direction);
            var memberInfo = {
                data: member,
                tensionKnown: false,
                failsAtLocal: 0,
                failsAtLoad: 0,
                fails: false,
                tension: 0,
                stress: 0,
                direction: directionNorm,
                length: math_util_1.Magnitude(direction),
                beamType: consts_1.BEAMS[member.beamType],
            };
            allJoints[member.startId].membersOut.push(memberInfo);
            allJoints[member.endId].membersIn.push(memberInfo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbmFseXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztJQThDQSxJQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQztJQUM3QixJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUM7SUFFbkIsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBVSxFQUFFLFNBQWlCO1FBQzFELE9BQU8sQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDO0lBQ3ZFLENBQUM7SUFGRCw0Q0FFQztJQUVELFNBQVMsZUFBZSxDQUFDLE1BQWlCLEVBQUUsSUFBZ0I7UUFDeEQsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUN0RCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFDLE1BQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3hEO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLEtBQWdCLEVBQUUsVUFBa0I7UUFDbkQs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