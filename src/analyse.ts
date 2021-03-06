import { JointInput, MemberInput } from "./input";
import { SubVectors, Normalize, Magnitude, vec2, ScaleVector, AddVectors } from "./math_util";
import { MemberData, JointData, Beam, BuckleGraph } from "./definition_data";
import { BEAMS, BUCKLE_GRAPHS } from "./consts";

export interface SimulationOut {
    members:MemberInfo[];
    joints:JointsObject;
    warnings:string[];
    errors:string[];

    mass:number;
    analytical:boolean;
    analyticalMult: number;
}

export interface MemberInfo {
    data: MemberData,

    tensionKnown: boolean,
    tension: number,
    stress: number,

    failsAtLocal: number,
    failsAtLoad: number,
    fails: boolean,

    direction: vec2,

    length: number,
    beamType: Beam,
}

export interface JointInfo {
    data:JointData,
    
    externalForce:vec2,

    membersIn: MemberInfo[],
    membersOut: MemberInfo[],
}

interface JointsObject {
    [key: number]: JointInfo
}

const TENSILE_STRENGTH = 260;
const HOLE_D = 3.2;

export function GetEffectiveArea(beam: Beam, beamCount: number) {
    return (3*beam.size/2 - HOLE_D) * beam.thickness * 0.9 * beamCount;
}

function GetBuckleStress(member:MemberInfo, type:BuckleGraph):number {
    const lengthPerB = member.length/member.beamType.size;
    let graphX = Math.min(Math.max(lengthPerB, type.range[0]), type.range[1]);
    let stress = 0;
    for(let i=0; i<type.coefficients.length; i++) {
        stress += type.coefficients[i] * Math.pow(graphX, i);
    }
    return stress;
}

function SumForces(joint: JointInfo, analytical:boolean): {forceIn:vec2, unknowns:MemberInfo[], directions:number[]} {
    let forceIn:vec2 = [joint.externalForce[0], joint.externalForce[1]];
    if(analytical && Magnitude(forceIn) != 0) {
        //If an analytical solution can be found use normal vectors
        forceIn = Normalize(forceIn);
    }
    let unknowns:MemberInfo[] = [];
    let directions: number[] = [];
    for(let member of joint.membersIn) {
        if(!member.tensionKnown) {
            unknowns.push(member);
            directions.push(1);
            continue;
        }
        const force = ScaleVector(member.direction, -member.tension);
        forceIn = AddVectors(forceIn, force);
    }
    for(let member of joint.membersOut) {
        if(!member.tensionKnown) {
            unknowns.push(member);
            directions.push(-1);
            continue;
        }
        const force = ScaleVector(member.direction, member.tension);
        forceIn = AddVectors(forceIn, force);
    }
    return {forceIn:forceIn, unknowns:unknowns, directions:directions};
}

function SolveFreeJoint(joint: JointInfo, analytical:boolean) {
    let forces = SumForces(joint, analytical);
    let [d1, d2] = [forces.unknowns[0].direction, forces.unknowns[1].direction];
    let N2 = (d1[0] * forces.forceIn[1] - forces.forceIn[0] * d1[1]) / (d2[1] * d1[0] - d2[0] * d1[1]);
    let N1 = (forces.forceIn[0] - N2*d2[0])/d1[0];

    forces.unknowns[0].tension = N1 * forces.directions[0];
    forces.unknowns[1].tension = N2 * forces.directions[1];

    forces.unknowns[0].tensionKnown = true;
    forces.unknowns[1].tensionKnown = true;
}

function SolveNextJoint(joints: JointsObject, analytical:boolean, analyticalMult:number):string[] {
    let unknownMember = false;
    for(let joint of <JointInfo[]>Object.values(joints)) {
        if(joint.data.fixed) continue;
        let knownCount = Magnitude(joint.externalForce)==0?0:1;
        let unknownCount = 0;
        let allMembers = [...joint.membersIn];
        allMembers.push(...joint.membersOut);
        for(let member of allMembers) {
            if(member.tensionKnown) {
                knownCount++;
                continue;
            }
            unknownCount++;
            unknownMember = true;
        }
        if(knownCount > 0 && unknownCount > 0 && unknownCount < 3) {
            //Can solve via static analysis
            try {
                SolveFreeJoint(joint, analytical);
                return SolveNextJoint(joints, analytical, analyticalMult);
            } catch(e) {
                return ["Could not complete analysis -- system could be statically indeterminate"];
            }
        }
    }
    if(unknownMember) {
        return ["System is statically indeterminate"];
    }
    for(let joint of <JointInfo[]>Object.values(joints)) {
        if(!joint.data.fixed) continue;
        let sumForces = SumForces(joint, analytical).forceIn;
        joint.externalForce = ScaleVector(sumForces, -analyticalMult);
    }
    return [];
}

function GetBucklingData(allMembers:MemberInfo[], mult:number) {
    for(let member of allMembers) {
        if(member.tension*mult > 0) continue;

        const area = GetEffectiveArea(member.beamType, member.data.beamCount);
        const stress = Math.abs(member.tension/area);
        const buckleStress = GetBuckleStress(member, BUCKLE_GRAPHS[member.data.beamCount-1]);

        member.fails = Math.abs(stress*mult) > buckleStress;
        member.failsAtLoad = buckleStress/stress;
        member.failsAtLocal = buckleStress*area;
    }
}

function GetTensionData(allMembers:MemberInfo[], mult:number) {
    for(let member of allMembers) {
        if(member.tension*mult < 0) continue;

        const area = GetEffectiveArea(member.beamType, member.data.beamCount);
        const stress = Math.abs(member.tension/area);

        member.fails = Math.abs(stress*mult)>TENSILE_STRENGTH;

        member.failsAtLoad = TENSILE_STRENGTH/stress;
        member.failsAtLocal = TENSILE_STRENGTH*area;
    }
}

function MemberMass(allMembers:MemberInfo[]) {
    let total = 0;
    for(let member of allMembers) {
        total += member.beamType.massPerLength * member.length * member.data.beamCount;
    }
    return total;
}

export function RunSimulation(joints:JointData[], members:MemberData[]):SimulationOut {
    let results:SimulationOut = {
        members:[],
        joints:{},
        warnings:[],
        errors:[],
        analyticalMult: 1,
        analytical: false,
        mass:0,
    }
    let forcesCount:number = 0;
    let allJoints:JointsObject = {};
    let allMembers:MemberInfo[] = [];

    for(let joint of joints) {
        if(joint.id in allJoints) {
            results.errors.push("Same joint added twice");
        }
        allJoints[joint.id] = {
            data: joint,
            externalForce: [joint.force[0], joint.force[1]],
            membersIn: [],
            membersOut: [],
        };
        if(Magnitude(joint.force) != 0) forcesCount++;
    }

    switch(forcesCount) {
        case 0:
            results.errors.push("No forces found, cannot perform analysis");
            break;
        case 1:
            const forceObj = <JointInfo>Object.values(allJoints).filter((obj)=>{return Magnitude(obj.data.force) != 0;})[0];
            results.analyticalMult = Magnitude(forceObj.data.force);
            results.analytical = true;
            break;
        default:
            results.warnings.push("Too many forces to solve analytically");
    }

    for(let member of members) {
        const startPos = allJoints[member.startId].data.position;
        const endPos = allJoints[member.endId].data.position;
        const direction = SubVectors(endPos, startPos)
        const directionNorm = Normalize(direction);

        const memberInfo:MemberInfo = {
            data: member,

            tensionKnown: false,
            failsAtLocal: 0,
            failsAtLoad: 0,

            fails: false,
            tension: 0,
            stress:0,
            direction: directionNorm,

            length: Magnitude(direction),
            beamType: BEAMS[member.beamType],
        };
        allJoints[member.startId].membersOut.push(memberInfo);
        allJoints[member.endId].membersIn.push(memberInfo);
        allMembers.push(memberInfo);
    }
    results.joints = allJoints;
    results.members = allMembers;

    results.errors.push(...SolveNextJoint(results.joints, results.analytical, results.analyticalMult));
    results.mass = MemberMass(allMembers);
    GetBucklingData(allMembers, results.analyticalMult);
    GetTensionData(allMembers, results.analyticalMult);

    return results;
}