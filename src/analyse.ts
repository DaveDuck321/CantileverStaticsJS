import { JointInput, MemberInput } from "./input";
import { SubVectors, Normalize, Magnitude, vec2, ScaleVector, AddVectors } from "./vecMaths";

export interface SimulationOut {
    members:MemberInfo[];
    joints:JointsObject;
    warnings:string[];
    errors:string[];
}

interface MemberInfo {
    name: string,

    tensionKnown: boolean,
    tension: number,
    direction: vec2,

    startId:number,
    endId:number,

    length: number,
    beamType: Beam,
}

interface JointInfo {
    id: number,
    name: string,

    fixed: boolean,
    position: vec2,
    force:vec2,
    membersIn: MemberInfo[],
    membersOut: MemberInfo[],
}

interface JointsObject {
    [key: number]: JointInfo
}

interface BuckleGraph {
    scale:number,
    constant:number,
    range:vec2,
    powers:number[],
    coefficients:number[],
}

interface Beam {
    size: number,
    thickness: number,
    massPerLength: number,
}

const HOLE_D = 3.2;

export const BEAMS:Beam[] = [
    {size: 9.5, thickness: 0.7, massPerLength: 104},
    {size: 12.5, thickness: 0.7, massPerLength: 137},
    {size: 12.5, thickness: 0.9, massPerLength: 176},
    {size: 16, thickness: 0.9, massPerLength: 226},
    {size: 16, thickness: 1.1, massPerLength: 276},
    {size: 19, thickness: 1.1, massPerLength: 328},
];

const BUCKLE_A:BuckleGraph = {
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

function effectiveArea(beam: Beam) {
    return ((3*beam.size*beam.thickness)/2 - HOLE_D) * 0.9;
}

function buckleStress(lengthPerB:number, type:BuckleGraph = BUCKLE_A):number {
    let measureAt = Math.min(Math.max(lengthPerB/type.scale, type.range[0]), type.range[1]);
    let point = type.constant;
    for(let i=0; i<type.powers.length; i++) {
        point += type.coefficients[i] * Math.pow(measureAt, type.powers[i]);
    }
    return point;
}

function SumForces(joint: JointInfo): {forceIn:vec2, unknowns:MemberInfo[], directions:number[]} {
    let forceIn:vec2 = [joint.force[0], joint.force[1]];
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
    console.log(joint);
    console.log(forceIn);
    return {forceIn:forceIn, unknowns:unknowns, directions:directions};
}

function SolveFreeJoint(joint: JointInfo) {
    let forces = SumForces(joint);
    let [d1, d2] = [forces.unknowns[0].direction, forces.unknowns[1].direction];
    let N2 = (d1[0] * forces.forceIn[1] - forces.forceIn[0] * d1[1]) / (d2[1] * d1[0] - d2[0] * d1[1]);
    let N1 = (forces.forceIn[0] - N2*d2[0])/d1[0];

    forces.unknowns[0].tension = N1 * forces.directions[0];
    forces.unknowns[1].tension = N2 * forces.directions[1];

    forces.unknowns[0].tensionKnown = true;
    forces.unknowns[1].tensionKnown = true;
}

function SolveNextJoint(joints: JointsObject):string[] {
    let unknownMember = false;
    for(let joint of Object.values(joints)) {
        if(joint.fixed) continue;
        let knownCount = Magnitude(joint.force)==0?0:1;
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
            SolveFreeJoint(joint);
            return SolveNextJoint(joints);
        }
    }
    if(unknownMember) {
        return ["System is statically indeterminate"];
    }
    for(let joint of Object.values(joints)) {
        if(!joint.fixed) continue;
        let sumForces = SumForces(joint).forceIn;
        joint.force = ScaleVector(sumForces, -1);
    }
    return [];
}

export function RunSimulation(joints:JointInput[], members:MemberInput[]):SimulationOut {
    let results:SimulationOut = {
        members:[],
        joints:[],
        warnings:[],
        errors:[],
    }
    let allJoints:JointsObject = {};
    let allMembers:MemberInfo[] = [];

    for(let joint of joints) {
        if(joint.id in allJoints) {
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

    for(let member of members) {
        const startPos = allJoints[member.start].position;
        const endPos = allJoints[member.end].position;
        const direction = SubVectors(endPos, startPos)
        const directionNorm = Normalize(direction);

        const memberInfo:MemberInfo = {
            name: member.name,
            tensionKnown: false,
            tension: 0,
            direction: directionNorm,

            startId: member.start,
            endId: member.end,

            length: Magnitude(direction),
            beamType: BEAMS[member.type],
        };
        console.log(member.type);
        allJoints[member.start].membersOut.push(memberInfo);
        allJoints[member.end].membersIn.push(memberInfo);
        allMembers.push(memberInfo);
    }
    results.joints = allJoints;
    results.members = allMembers;

    results.errors.push(...SolveNextJoint(results.joints));

    return results;
}