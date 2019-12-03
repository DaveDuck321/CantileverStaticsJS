import { JointInput, MemberInput } from "./input";
import { SubVectors, Normalize, Magnitude, vec2, ScaleVector, AddVectors } from "./math_util";

export interface SimulationOut {
    members:MemberInfo[];
    joints:JointsObject;
    warnings:string[];
    errors:string[];

    mass:number;
    analytical:boolean;
    analyticalMult: number;
}

interface MemberInfo {
    name: string,

    tensionKnown: boolean,
    tension: number,
    stress: number,

    failsAtLocal: number,
    failsAtLoad: number,
    fails: boolean,

    direction: vec2,

    startId:number,
    endId:number,

    length: number,
    beamType: Beam,
    beamCount: number,
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

const TENSILE_STRENGTH = 260;
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

const BUCKLE_B:BuckleGraph = {
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

const BUCKLE_GRAPHS = [BUCKLE_A, BUCKLE_B];

export function GetEffectiveArea(beam: Beam, beamCount: number) {
    return (3*beam.size/2 - HOLE_D) * beam.thickness * 0.9 * beamCount;
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

function SumForces(joint: JointInfo, analytical:boolean): {forceIn:vec2, unknowns:MemberInfo[], directions:number[]} {
    let forceIn:vec2 = [joint.force[0], joint.force[1]];
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

    //forces.unknowns[0].stress = forces.unknowns[0].tension / GetEffectiveArea(forces.unknowns[0].beamType);
    //forces.unknowns[1].stress = forces.unknowns[1].tension / GetEffectiveArea(forces.unknowns[1].beamType);

    forces.unknowns[0].tensionKnown = true;
    forces.unknowns[1].tensionKnown = true;
}

function SolveNextJoint(joints: JointsObject, analytical:boolean, analyticalMult:number):string[] {
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
            SolveFreeJoint(joint, analytical);
            return SolveNextJoint(joints, analytical, analyticalMult);
        }
    }
    if(unknownMember) {
        return ["System is statically indeterminate"];
    }
    for(let joint of Object.values(joints)) {
        if(!joint.fixed) continue;
        let sumForces = SumForces(joint, analytical).forceIn;
        joint.force = ScaleVector(sumForces, -analyticalMult);
    }
    return [];
}

function GetBucklingData(allMembers:MemberInfo[], mult:number) {
    for(let member of allMembers) {
        if(member.tension*mult > 0) continue;

        const area = GetEffectiveArea(member.beamType, member.beamCount);
        const stress = Math.abs(member.tension/area);
        const buckleStress = GetBuckleStress(member, BUCKLE_GRAPHS[member.beamCount]);

        member.fails = Math.abs(stress*mult) > buckleStress;
        member.failsAtLoad = buckleStress/stress;
        member.failsAtLocal = buckleStress*area;
    }
}

function GetTensionData(allMembers:MemberInfo[], mult:number) {
    for(let member of allMembers) {
        if(member.tension*mult < 0) continue;

        const area = GetEffectiveArea(member.beamType, member.beamCount);
        const stress = Math.abs(member.tension/area);
        if(member.name == "d") {
            console.log(member.tension);
            console.log(stress);
        }

        member.fails = Math.abs(stress*mult)>TENSILE_STRENGTH;

        member.failsAtLoad = TENSILE_STRENGTH/stress;
        member.failsAtLocal = TENSILE_STRENGTH*area;
    }
}

function MemberMass(allMembers:MemberInfo[]) {
    let total = 0;
    for(let member of allMembers) {
        total += member.beamType.massPerLength * member.length * member.beamCount;
    }
    return total;
}

export function RunSimulation(joints:JointInput[], members:MemberInput[]):SimulationOut {
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
            id: joint.id,
            name: joint.name,

            fixed: joint.fixed,
            force: joint.force,
            position: joint.position,
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
            const forceObj = Object.values(allJoints).filter((obj)=>{return Magnitude(obj.force) != 0;})[0];
            results.analyticalMult = Magnitude(forceObj.force);
            results.analytical = true;
            break;
        default:
            results.warnings.push("Too many forces to solve analytically");
    }

    for(let member of members) {
        const startPos = allJoints[member.start].position;
        const endPos = allJoints[member.end].position;
        const direction = SubVectors(endPos, startPos)
        const directionNorm = Normalize(direction);

        const memberInfo:MemberInfo = {
            name: member.name,
            beamCount: member.double?2:1,
            tensionKnown: false,
            failsAtLocal: 0,
            failsAtLoad: 0,

            fails: false,
            tension: 0,
            stress:0,
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

    results.errors.push(...SolveNextJoint(results.joints, results.analytical, results.analyticalMult));
    results.mass = MemberMass(allMembers);
    GetBucklingData(allMembers, results.analyticalMult);
    GetTensionData(allMembers, results.analyticalMult);

    return results;
}