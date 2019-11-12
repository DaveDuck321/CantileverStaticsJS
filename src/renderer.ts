import { JointInput, MemberInput, AddCell } from "./input";
import {SubVectors, AddVectors, LinMultVectors, ScaleVector, vec2, Magnitude, Normalize} from "./vecMaths";
import { SimulationOut } from "./analyse";

function Round(n:number, points:number) {
    return Math.round(n*(10**points))/(10**points);
}

function Scale2Viewport(min:vec2, max:vec2, dimsPx:vec2) {
    let [rangeX, rangeY] = [max[0] - min[0], max[1] - min[1]];
    let maxRange = Math.max(rangeX, rangeY)*1.3;
    min = SubVectors(min, [(maxRange - rangeX)/2, (maxRange - rangeY)/2]);

    const scale = ScaleVector(dimsPx, 1/maxRange);
    return function(vec:vec2):vec2 {
        const result = LinMultVectors(SubVectors(vec, min), scale);
        return [result[0], dimsPx[1] - result[1]];
    }
}

export function DrawScene(context:CanvasRenderingContext2D, dimsPx:vec2, results:SimulationOut) {
    const outElement = <HTMLLIElement>document.getElementById("output");
    outElement.innerHTML = `Mass: ${Round(results.mass, 1)} g`;

    context.font = "12px Arial";
    context.fillStyle = 'white';
    context.fillRect(0, 0, dimsPx[0], dimsPx[1])
    
    let [minX, minY] = [Infinity, Infinity];
    let [maxX, maxY] = [-Infinity, -Infinity];
    let maxTension = -Infinity;
    for(let member of results.members) {
        maxTension = Math.max(maxTension, Math.abs(member.tension));
    }
    for(let joint of Object.values(results.joints)) {
        minX = Math.min(minX, joint.position[0]);
        minY = Math.min(minY, joint.position[1]);

        maxX = Math.max(maxX, joint.position[0]);
        maxY = Math.max(maxY, joint.position[1]);
    }
    let scale = Scale2Viewport([minX, minY], [maxX, maxY], dimsPx);
    let table = document.createElement('TABLE');
    for(let member of results.members) {
        const tension = member.tension*results.analyticalMult;
        context.fillStyle = 'white';
        context.strokeStyle = `rgb(${Math.abs(member.tension/maxTension * 255)}, 0, 0)`;
        context.lineWidth = member.beamType.id + 1;
        const startPos = scale(results.joints[member.startId].position);
        const endPos = scale(results.joints[member.endId].position);
        context.beginPath();
        context.moveTo(startPos[0], startPos[1]);
        context.lineTo(endPos[0], endPos[1]);
        context.stroke();

        context.fillStyle = 'black';
        let centerPos = AddVectors(startPos, LinMultVectors(SubVectors(endPos, startPos), [0.5, 0.5]));
        context.fillText(member.name, centerPos[0], centerPos[1]);

        let rowOut = document.createElement('TR');
        AddCell(rowOut, member.name);
        if(tension > 0) {
            AddCell(rowOut, "Tension");
        } else {
            AddCell(rowOut, "Compression");
        }
        AddCell(rowOut, `${Round(tension/1000, 1)} kN`);
        AddCell(rowOut, `${Round(member.failsAt/1000, 1)} kN`);
        AddCell(rowOut, ""+member.fails);
        table.appendChild(rowOut);
    }
    outElement.appendChild(table);

    context.lineWidth = 1;
    context.strokeStyle = 'black';
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.font = "15px Arial";
    for(let joint of Object.values(results.joints)) {
        context.fillStyle = 'white';
        const pos = scale(joint.position);
        if(joint.fixed) {
            context.fillRect(pos[0]-8, pos[1]-8, 16, 16)
            context.strokeRect(pos[0]-8, pos[1]-8, 16, 16);
        } else {
            context.beginPath();
            context.arc(pos[0], pos[1], 8, 0, Math.PI*2);
            context.fill();
            context.stroke();
        }
        context.fillStyle = 'black';
        if(Magnitude(joint.force) != 0) {
            const direction = ScaleVector(Normalize(joint.force), 50); //30px force line
            context.beginPath();
            context.moveTo(pos[0], pos[1]);
            context.lineTo(pos[0] + direction[0], pos[1]-direction[1]);
            context.stroke();

            const textVec = ScaleVector(direction, 0.5);
            context.fillText(`${Math.round(Magnitude(joint.force))}N`, pos[0] + textVec[0], pos[1] - textVec[1]);
        }
        context.fillText(joint.name, pos[0], pos[1]);
    }
    for(let error of results.errors) {
        let errorOut = document.createElement("DIV");
        errorOut.classList.add("error_out");
        errorOut.innerHTML = "Error: " + error;
        outElement.appendChild(errorOut);
    }
    for(let warning of results.warnings) {
        let warningOut = document.createElement("DIV");
        warningOut.classList.add("warning_out");
        warningOut.innerHTML = "Warning: " + warning;
        outElement.appendChild(warningOut);
    }
}