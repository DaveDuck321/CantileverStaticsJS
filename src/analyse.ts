import { JointInput, MemberInput } from "./input";
import { SubVectors, Normalize, Magnitude, vec2, ScaleVector, AddVectors } from "./vecMaths";

export interface SimulationOut {
    members:MemberInfo[];
    joints:JointsObject;
    warnings:string[];
    errors:string[];

    mass:number;
}

interface MemberInfo {
    name: string,

    tensionKnown: boolean,
    tension: number,
    buckles: boolean,
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
    range:vec2,
    coefficients:number[],
}

interface Beam {
    id: number,
    size: number,
    thickness: number,
    massPerLength: number,
}

const HOLE_D = 3.2;

export const BEAMS:Beam[] = [
    {id:0, size: 9.5, thickness: 0.7, massPerLength: 0.104},
    {id:1, size: 12.5, thickness: 0.7, massPerLength: 0.137},
    {id:2, size: 12.5, thickness: 0.9, massPerLength: 0.176},
    {id:3, size: 16, thickness: 0.9, massPerLength: 0.226},
    {id:4, size: 16, thickness: 1.1, massPerLength: 0.276},
    {id:5, size: 19, thickness: 1.1, massPerLength: 0.328},
];

const BUCKLE_A:BuckleGraph = {
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

function GetEffectiveArea(beam: Beam) {
    return ((3*beam.size*beam.thickness)/2 - HOLE_D) * 0.9;
}

function GetBuckleStress(member:MemberInfo, type:BuckleGraph = BUCKLE_A):number {
    const lengthPerB = member.length/member.beamType.size;
    let graphX = Math.min(Math.max(lengthPerB*type.scale, type.range[0]), type.range[1]);
    let stress = 0;
    for(let i=0; i<type.coefficients.length; i++) {
        stress += type.coefficients[i] * Math.pow(graphX, i);
    }
    return stress;
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

function GetBucklingData(allMembers:MemberInfo[]) {
    for(let member of allMembers) {
        if(member.tension > 0) continue;

        const area = GetEffectiveArea(member.beamType);
        const stress = Math.abs(member.tension/area);
        const buckleStress = GetBuckleStress(member, BUCKLE_A);
        if(stress > buckleStress) {
            console.log({buckleStress:buckleStress, stress:stress});
            member.buckles = true;
        }
    }
}

function MemberMass(allMembers:MemberInfo[]) {
    let total = 0;
    for(let member of allMembers) {
        total += member.beamType.massPerLength * member.length;
    }
    return total;
}

export function RunSimulation(joints:JointInput[], members:MemberInput[]):SimulationOut {
    let results:SimulationOut = {
        members:[],
        joints:[],
        warnings:[],
        errors:[],
        mass:0,
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
            buckles: false,
            tension: 0,
            direction: directionNorm,

            startId: member.start,
            endId: member.end,

            length: Magnitude(direction),
            beamType: BEAMS[member.type],
        };
        allJoints[member.start].membersOut.push(memberInfo);
        allJoints[member.end].membersIn.push(memberInfo);
        allMembers.push(memberInfo);
    }
    results.joints = allJoints;
    results.members = allMembers;

    results.errors.push(...SolveNextJoint(results.joints));
    results.mass = MemberMass(allMembers);
    GetBucklingData(allMembers);

    return results;
}