export type vec2 = [number, number];

export function AddVectors(a:vec2, b:vec2):vec2 {
    return [a[0]+b[0], a[1]+b[1]];
}
export function SubVectors(a:vec2, b:vec2):vec2 {
    return [a[0]-b[0], a[1]-b[1]];
}
export function LinMultVectors(a:vec2, b:vec2):vec2 {
    return [a[0]*b[0], a[1]*b[1]];
}
export function LinDivVectors(a:vec2, b:vec2):vec2 {
    return [a[0]/b[0], a[1]/b[1]];
}
export function ScaleVector(a:vec2, s:number):vec2 {
    return [a[0]*s, a[1]*s];
}

export function Magnitude(a:vec2):number {
    return Math.sqrt(a[0]*a[0] + a[1]*a[1]);
}

export function Normalize(a:vec2):vec2 {
    const length = Magnitude(a);
    return ScaleVector(a, 1/length);
}