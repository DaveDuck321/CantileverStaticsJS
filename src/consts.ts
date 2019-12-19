import { Beam, BuckleGraph } from "./definition_data";

export const BEAMS:Beam[] = [
    {id:0, size: 9.5, thickness: 0.7, massPerLength: 0.104},
    {id:1, size: 12.5, thickness: 0.7, massPerLength: 0.137},
    {id:2, size: 12.5, thickness: 0.9, massPerLength: 0.176},
    {id:3, size: 16, thickness: 0.9, massPerLength: 0.226},
    {id:4, size: 16, thickness: 1.1, massPerLength: 0.276},
    {id:5, size: 19, thickness: 1.1, massPerLength: 0.328},
];

export const BUCKLE_A:BuckleGraph = {
    range: [6.164, 59.8],
    coefficients: [
        262.049,
        -7.44737,
        -0.0381352,
        0.00328752,
        -0.00002839,
    ],
};

export const BUCKLE_B:BuckleGraph = {
    range: [9.88, 59.88],
    coefficients: [
        267.832792683,
        -5.41701346492,
        0.00764445890144,
        0.003336,
    ],
};

export const BUCKLE_GRAPHS = [BUCKLE_A, BUCKLE_B];