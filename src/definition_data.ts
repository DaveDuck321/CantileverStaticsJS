import { vec2 } from "./math_util";

export interface MemberData {
    id: number,
    name: string,

    startId:number,
    endId:number,

    beamType: number,
    beamCount: number,
}

export interface JointData {
    id: number,
    name: string,

    position: vec2,
    force: vec2,

    fixed: boolean,
}

export interface StructureData {
    joints:JointData[],
    members:MemberData[],
}