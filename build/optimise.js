var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
define(["require", "exports", "./consts", "./analyse"], function (require, exports, consts_1, analyse_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function Optimise(joints, currentMembers) {
        var structure = { members: CloneMembers(currentMembers), joints: joints };
        for (var i = 0; i < structure.members.length; i++) {
            var result = OptimiseBeamType(joints, structure.members, i);
            if (!result.success) {
                return { result: structure, success: false };
            }
            structure.members[i] = result.result;
        }
        return { result: structure, success: true };
    }
    exports.Optimise = Optimise;
    function OptimiseBeamType(joints, members, index) {
        var mass = Number.POSITIVE_INFINITY;
        var bestConfig = __assign({}, members[index]);
        for (var i = 0; i < consts_1.BEAMS.length; i++) {
            members[index].beamCount = 1;
            members[index].beamType = i;
            var analysis = analyse_1.RunSimulation(joints, members);
            if (!analysis.members[index].fails) {
                mass = analysis.mass;
                bestConfig = __assign({}, members[index]);
                break;
            }
        }
        for (var i = 0; i < consts_1.BEAMS.length; i++) {
            members[index].beamCount = 2;
            members[index].beamType = i;
            var analysis = analyse_1.RunSimulation(joints, members);
            if (analysis.mass > mass)
                break;
            if (!analysis.members[index].fails) {
                return { result: members[index], success: true };
            }
        }
        return { result: bestConfig, success: mass !== Number.POSITIVE_INFINITY };
    }
    function CloneMembers(members) {
        var result = [];
        for (var _i = 0, members_1 = members; _i < members_1.length; _i++) {
            var member = members_1[_i];
            result.push(__assign({}, member));
        }
        return result;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW1pc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvb3B0aW1pc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7SUFJQSxTQUFnQixRQUFRLENBQUMsTUFBa0IsRUFBRSxjQUEyQjtRQUNwRSxJQUFJLFNBQVMsR0FBRyxFQUFDLE9BQU8sRUFBQyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFDLE1BQU0sRUFBQyxDQUFDO1FBQ3RFLEtBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM5QyxJQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM5RCxJQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtnQkFDaEIsT0FBTyxFQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBQyxDQUFDO2FBQzlDO1lBQ0QsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1NBQ3hDO1FBQ0QsT0FBTyxFQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDO0lBQzlDLENBQUM7SUFWRCw0QkFVQztJQUVELFNBQVMsZ0JBQWdCLENBQUMsTUFBa0IsRUFBRSxPQUFvQixFQUFFLEtBQVk7UUFDNUUsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDO1FBQ3BDLElBQUksVUFBVSxnQkFBa0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFHaEQsS0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7WUFDN0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7WUFDNUIsSUFBTSxRQUFRLEdBQUcsdUJBQWEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDaEQsSUFBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFO2dCQUMvQixJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDckIsVUFBVSxnQkFBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDakMsTUFBTTthQUNUO1NBQ0o7UUFDRCxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNoQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztZQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztZQUM1QixJQUFNLFFBQVEsR0FBRyx1QkFBYSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNoRCxJQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsSUFBSTtnQkFBRSxNQUFNO1lBQy9CLElBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRTtnQkFDL0IsT0FBTyxFQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDO2FBQ2xEO1NBQ0o7UUFDRCxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxLQUFLLE1BQU0sQ0FBQyxpQkFBaUIsRUFBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxPQUFvQjtRQUN0QyxJQUFJLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO1FBQzdCLEtBQWtCLFVBQU8sRUFBUCxtQkFBTyxFQUFQLHFCQUFPLEVBQVAsSUFBTyxFQUFFO1lBQXZCLElBQUksTUFBTSxnQkFBQTtZQUNWLE1BQU0sQ0FBQyxJQUFJLGNBQUssTUFBTSxFQUFFLENBQUM7U0FDNUI7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDIn0=