import { MemberData, JointData, StructureData, Result } from "./definition_data";
import { BEAMS } from "./consts";
import { RunSimulation } from "./analyse";

export function Optimise(joints:JointData[], currentMembers:MemberData[]): Result<StructureData> {
    let structure = {members:CloneMembers(currentMembers), joints:joints};
    for(let i = 0; i < structure.members.length; i++) {
        const result = OptimiseBeamType(joints, structure.members, i);
        if(!result.success) {
            return {result: structure, success: false};
        }
        structure.members[i] = result.result;
    }
    return {result: structure, success: true};
}

function OptimiseBeamType(joints:JointData[], members:MemberData[], index:number): Result<MemberData> {
    let mass = Number.POSITIVE_INFINITY;
    let bestConfig:MemberData = {...members[index]};

    //Try single beams
    for(let i = 0; i < BEAMS.length; i++) {
        members[index].beamCount = 1;
        members[index].beamType = i;
        const analysis = RunSimulation(joints, members); //Force calc is rerun -- this is suboptimal
        if(!analysis.members[index].fails) {
            mass = analysis.mass;
            bestConfig = {...members[index]};
            break;
        }
    }
    for(let i=0; i < BEAMS.length; i++) {
        members[index].beamCount = 2;
        members[index].beamType = i;
        const analysis = RunSimulation(joints, members);
        if(analysis.mass > mass) break;
        if(!analysis.members[index].fails) {
            return {result: members[index], success: true};
        }
    }
    return {result: bestConfig, success: mass !== Number.POSITIVE_INFINITY}
}

function CloneMembers(members:MemberData[]) {
    let result:MemberData[] = [];
    for(let member of members) {
        result.push({...member});
    }
    return result;
}