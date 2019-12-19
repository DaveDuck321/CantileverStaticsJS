import { DrawScene } from "./renderer";
import {vec2, Magnitude, Round} from "./math_util";
import { RunSimulation, BEAMS, GetEffectiveArea, JointInfo } from "./analyse";
import { MemberData, JointData } from "./definition_data";

let jointCount = 0;
let memberCount = 0;
let jointInputs:JointInput[] = [];
let memberInputs:MemberInput[] = [];

export class MemberInput {
    data: MemberData;
    alive: boolean;

    memberSpan: HTMLElement;
    nameInput: HTMLInputElement;
    typeSelectElement: HTMLSelectElement;
    startSelectElement: HTMLSelectElement;
    endSelectElement: HTMLSelectElement;
    doubleInput: HTMLInputElement;
    removeInput: HTMLInputElement;

    constructor(membersIn: HTMLElement, name:string, start:number, end:number, type:number=0) {
        this.alive = true;
        this.data = {
            id: ++memberCount,
            name: name,
            startId: start,
            endId: end,
            beamType: type,
            beamCount: 1,
        };

        this.memberSpan = <HTMLElement>document.createElement("DIV");
        this.nameInput = <HTMLInputElement>document.createElement("INPUT");
        this.doubleInput = <HTMLInputElement>document.createElement("INPUT");
        this.removeInput = <HTMLInputElement>document.createElement("INPUT");
        this.removeInput.type = "button";
        this.removeInput.value = "Remove";
        this.doubleInput.type = "checkbox";

        this.nameInput.onchange = ()=>{this.updateName(this)};
        this.doubleInput.onchange = ()=>{this.updateDouble(this)};

        this.startSelectElement = <HTMLSelectElement>document.createElement("SELECT");
        this.endSelectElement = <HTMLSelectElement>document.createElement("SELECT");
        this.typeSelectElement = <HTMLSelectElement>document.createElement("SELECT");
        for(let i=0; i<BEAMS.length; i++) {
            const option = new Option(""+i, ""+i);
            this.typeSelectElement.options.add(option);
        }

        this.startSelectElement.onchange = ()=>{this.updateStart(this)};
        this.endSelectElement.onchange = ()=>{this.updateEnd(this)};
        this.typeSelectElement.onchange = ()=>{this.updateType(this)};
        this.removeInput.onclick = ()=>{this.destroy(this)};

        this.memberSpan.append("Name: ");
        this.memberSpan.appendChild(this.nameInput);
        this.memberSpan.append(" Starts at: ");
        this.memberSpan.appendChild(this.startSelectElement);
        this.memberSpan.append(" Ends at: ");
        this.memberSpan.appendChild(this.endSelectElement);
        this.memberSpan.append(" Type: ");
        this.memberSpan.appendChild(this.typeSelectElement);
        this.memberSpan.append(" Double Beam: ");
        this.memberSpan.appendChild(this.doubleInput);
        this.memberSpan.appendChild(this.removeInput);

        membersIn.appendChild(this.memberSpan);

        this.updateAllOptions();
        this.matchInternalState();
    }
    matchInternalState() {
        this.nameInput.value = this.data.name;
        this.startSelectElement.value = ""+this.data.startId;
        this.endSelectElement.value = ""+this.data.endId;
        this.typeSelectElement.value = ""+this.data.beamType;
        this.doubleInput.checked = this.data.beamCount>1;
    }
    destroy(obj:MemberInput) {
        obj.alive = false;
        obj.memberSpan.remove();
        DrawChanges();
    }
    updateDouble(obj:MemberInput) {
        obj.data.beamCount = obj.doubleInput.checked?2:1;
        DrawChanges();
    }
    updateStart(obj:MemberInput) {
        obj.data.startId = parseInt(obj.startSelectElement.value);
        DrawChanges();
    }
    updateEnd(obj:MemberInput) {
        const selected = obj.endSelectElement.selectedOptions[0];
        obj.data.endId = parseInt(selected.value);
        DrawChanges();
    }
    updateType(obj:MemberInput) {
        const selected = obj.typeSelectElement.selectedOptions[0];
        obj.data.beamType = parseInt(selected.value);
        DrawChanges();
    }
    updateAllOptions() {
        this.updateOptions(this.startSelectElement, this.data.startId);
        this.updateOptions(this.endSelectElement, this.data.endId);
    }
    updateOptions(selectElement:HTMLSelectElement, id:number): void {
        while(selectElement.options.length > 0) {
            selectElement.options.remove(0);
        }
        for(let joint of jointInputs) {
            let selected = joint.data.id == id;
            let option = new Option(joint.data.name, joint.data.id+"", selected, selected);
            selectElement.options.add(option);
        }
    }
    updateName(obj:MemberInput) {
        obj.data.name = obj.nameInput.value;
        DrawChanges();
    }
}

export class JointInput {
    data: JointData;
    alive: boolean;

    jointSpan: HTMLElement;
    nameInput: HTMLInputElement;
    positionInput: HTMLInputElement;
    fixedInput: HTMLInputElement;
    forceInput: HTMLInputElement;
    removeInput: HTMLInputElement;

    constructor(jointsIn: HTMLElement, name: string, position:vec2 = [0, 0], force:vec2|number = 0, fixed:boolean = false) {
        this.alive = true;
        if(typeof force === "number") {
            force = [0, force];
        }
        this.data = {
            id: ++jointCount,
            name: name,
            position: position,
            fixed: fixed,
            force: force,
        };

        this.jointSpan = document.createElement("DIV");
        this.jointSpan.classList.add("joint_in");

        this.nameInput = <HTMLInputElement>document.createElement("INPUT");
        this.positionInput = <HTMLInputElement>document.createElement("INPUT");
        this.forceInput = <HTMLInputElement>document.createElement("INPUT");
        this.fixedInput = <HTMLInputElement>document.createElement("INPUT");
        this.removeInput = <HTMLInputElement>document.createElement("INPUT");
        this.removeInput.type = "button";
        this.removeInput.value = "Remove";
        this.fixedInput.type = "checkbox";
        
        this.nameInput.onchange = (ev)=>{this.updateName(ev, this)};
        this.positionInput.onchange = (ev)=>{this.updatePosition(ev, this)};
        this.forceInput.onchange = (ev)=>{this.updateForce(ev, this)};
        this.fixedInput.onchange = (ev)=>(this.updateFixed(ev, this));
        this.removeInput.onclick = ()=>{this.destroy(this)};

        this.jointSpan.append("Name: ");
        this.jointSpan.appendChild(this.nameInput);
        this.jointSpan.append(" Position (x, y) in mm: ");
        this.jointSpan.appendChild(this.positionInput);
        this.jointSpan.append(" Force(x, y): ");
        this.jointSpan.appendChild(this.forceInput);
        this.jointSpan.append(" Fixed: ");
        this.jointSpan.appendChild(this.fixedInput);
        this.jointSpan.appendChild(this.removeInput);

        jointsIn.appendChild(this.jointSpan);

        this.matchInternalState();
    }
    matchInternalState() {
        const state = this.data;
        this.nameInput.value = state.name;
        this.positionInput.value = `${state.position[0]}, ${state.position[1]}`;
        this.fixedInput.checked = state.fixed;
        if(state.force[0] === 0) {
            this.forceInput.value = `${state.force[1]}`;
        } else {
            this.forceInput.value = `${state.force[0]}, ${state.force[1]}`;
        }
    }
    destroy(obj:JointInput) {
        if(!canDestroyJoint(obj.data.id)) {
            alert("Cannot remove joint, there are connecting members!");
            return;
        }
        obj.alive = false;
        obj.jointSpan.remove();
        DrawChanges();
    }
    updateName(ev: Event, obj:JointInput):void {
        const input = <HTMLInputElement>ev.srcElement;
        if(input.value !== "" && canUpdateName(obj.data.id, input.value)) {
            obj.data.name = input.value;
            refeshSelectInputs();
        } else {
            alert("Invalid/ reused joint name");
        }
        DrawChanges();
    }
    updatePosition(ev: Event, obj:JointInput):void {
        const input = <HTMLInputElement>ev.srcElement;
        let posString = input.value.trim();
        if(!posString.match(/^-?\d+ ?, ?-?\d+$/)) {
            console.log("Position does not match regex");
            return;
        }
        let [x, y] = posString.split(',');
        obj.data.position = [parseFloat(x), parseFloat(y)];
        DrawChanges();
    }
    updateForce(ev: Event, obj:JointInput) {
        const input = <HTMLInputElement>ev.srcElement;
        let forceString = input.value.trim();
        if(forceString.match(/^-?\d+$/)) {
            obj.data.force = [0, parseFloat(forceString)];
        } else if(forceString.match(/^-?\d+ ?, ?-?\d+$/)) {
            let [x, y] = forceString.split(',');
            obj.data.force = [parseFloat(x), parseFloat(y)];
        } else {
            console.log("Position does not match regex");
            return;
        }
        DrawChanges();
    }
    updateFixed(ev: Event, obj:JointInput) {
        const input = <HTMLInputElement>ev.srcElement;
        obj.data.fixed = input.checked;
        DrawChanges();
    }
}

function canDestroyJoint(id:number):boolean {
    for(let member of memberInputs) {
        if(member.data.startId == id || member.data.endId == id) {
            return false;
        }
    }
    return true;
}

function canUpdateName(id:number, newName:string):boolean {
    for(let joint of jointInputs) {
        if(id === joint.data.id) continue;
        if(newName === joint.data.name) return false;
    }
    return true;
}

function refeshSelectInputs() {
    for(let member of memberInputs) {
        member.updateAllOptions();
    }
    return true;
}

function addNewJoint() {
    const jointsIn = <HTMLElement>document.getElementById("joints_in");
    jointInputs.push(new JointInput(jointsIn, `${jointCount}`));
    refeshSelectInputs();
    DrawChanges();
}

function addNewMember() {
    const membersIn = <HTMLElement>document.getElementById("members_in");
    memberInputs.push(new MemberInput(membersIn, `m${memberCount}`, jointInputs[0].data.id, jointInputs[1].data.id));
    DrawChanges();
}

function initialCantilever() {
    const jointsIn = <HTMLElement>document.getElementById("joints_in");
    const membersIn = <HTMLElement>document.getElementById("members_in");

   jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [0 ,0], 0, true));
   jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [272, 0]));
   jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [272+272, 0]));
   jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [815, 0], -1350));

   jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [0, 255], 0, true));
   jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [272, 255-85]));
   jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [272+272, 255-85*2]));

   memberInputs.push(new MemberInput(membersIn, `a`, jointInputs[0].data.id, jointInputs[1].data.id, 4));
   memberInputs.push(new MemberInput(membersIn, `b`, jointInputs[1].data.id, jointInputs[2].data.id, 4));
   memberInputs.push(new MemberInput(membersIn, `c`, jointInputs[2].data.id, jointInputs[3].data.id, 4));

   memberInputs.push(new MemberInput(membersIn, `d`, jointInputs[4].data.id, jointInputs[5].data.id, 2));
   memberInputs.push(new MemberInput(membersIn, `e`, jointInputs[5].data.id, jointInputs[6].data.id, 2));
   memberInputs.push(new MemberInput(membersIn, `f`, jointInputs[6].data.id, jointInputs[3].data.id, 2));

   memberInputs.push(new MemberInput(membersIn, `g`, jointInputs[4].data.id, jointInputs[1].data.id));
   memberInputs.push(new MemberInput(membersIn, `h`, jointInputs[5].data.id, jointInputs[1].data.id));
   memberInputs.push(new MemberInput(membersIn, `i`, jointInputs[5].data.id, jointInputs[2].data.id));
   memberInputs.push(new MemberInput(membersIn, `j`, jointInputs[6].data.id, jointInputs[2].data.id));
}

function DrawChanges() {
    console.log("Updated");
    const canvas = <HTMLCanvasElement>document.getElementById("canvas_out");
    const context = <CanvasRenderingContext2D>canvas.getContext('2d');

    //Filter out dead members + joints
    memberInputs = memberInputs.filter(member => member.alive);
    jointInputs = jointInputs.filter(joint => joint.alive);

    const results = RunSimulation(jointInputs, memberInputs);
    DrawScene(context, [canvas.width, canvas.height], results);
}

export function AddCell(row:HTMLElement, text:string|number, ...classList:string[]) {
    let cell = document.createElement("TD");
    for(let c of classList) {
        cell.classList.add(c);
    }
    cell.innerHTML = <string>text;
    row.appendChild(cell);
}

function PopulateMemberTable() {
    const memberTable = <HTMLElement>document.getElementById("member_info");

    let row = document.createElement("TR");
    AddCell(row, "ID");
    AddCell(row, "Size (mm)");
    AddCell(row, "Thickness (mm)");
    AddCell(row, "Mass/length (g/mm)");
    AddCell(row, "Effctive Area (mm<sup>2</sup>)");

    memberTable.append(row);
    let count = 0;
    for(let member of BEAMS) {
        let row = document.createElement("TR");
        AddCell(row, count++);
        AddCell(row, member.size);
        AddCell(row, member.thickness);
        AddCell(row, member.massPerLength);
        AddCell(row, Round(GetEffectiveArea(member, 1), 1));

        memberTable.append(row);
    }
}

window.onload = ()=>{
    console.log("Starting script");
    clearTimeout(timeout);
    PopulateMemberTable();
    const addMemberBtn = <HTMLButtonElement>document.getElementById("new_member");
    const addJointBtn = <HTMLButtonElement>document.getElementById("new_joint");
    const optimiseBtn = <HTMLButtonElement>document.getElementById("optimise");
    addMemberBtn.onclick = addNewMember;
    addJointBtn.onclick = addNewJoint;

    initialCantilever();
    DrawChanges();
};

var timeout = setTimeout(window.onload);