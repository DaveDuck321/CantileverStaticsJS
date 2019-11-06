import { DrawScene } from "./renderer";
import {vec2, Magnitude} from "./vecMaths";
import { RunSimulation, BEAMS } from "./analyse";

let jointCount = 0;
let memberCount = 0;
let jointInputs:JointInput[] = [];
let memberInputs:MemberInput[] = [];

export class MemberInput {
    id: number;
    name: string;

    start: number;
    end: number;
    type: number;

    memberSpan: HTMLElement;
    nameInput: HTMLInputElement;
    typeSelectElement: HTMLSelectElement;
    startSelectElement: HTMLSelectElement;
    endSelectElement: HTMLSelectElement;

    constructor(membersIn: HTMLElement, name:string, start:number, end:number) {
        this.id = ++memberCount;
        this.name = name;

        this.start = start;
        this.end = end;
        this.type = 0;

        this.memberSpan = <HTMLElement>document.createElement("DIV");
        this.nameInput = <HTMLInputElement>document.createElement("INPUT");

        this.nameInput.value = name;
        this.nameInput.onchange = (ev)=>{this.updateName(ev, this)};

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

        this.memberSpan.append("Name: ");
        this.memberSpan.appendChild(this.nameInput);
        this.memberSpan.append(" Starts at: ");
        this.memberSpan.appendChild(this.startSelectElement);
        this.memberSpan.append(" Ends at: ");
        this.memberSpan.appendChild(this.endSelectElement);
        this.memberSpan.append(" Type: ");
        this.memberSpan.appendChild(this.typeSelectElement);

        membersIn.appendChild(this.memberSpan);
        this.updateAllOptions();
    }
    updateStart(obj:MemberInput) {
        const selected = obj.startSelectElement.selectedOptions[0];
        obj.start = parseInt(selected.value);
        DrawChanges();
    }
    updateEnd(obj:MemberInput) {
        const selected = obj.endSelectElement.selectedOptions[0];
        obj.end = parseInt(selected.value);
        DrawChanges();
    }
    updateType(obj:MemberInput) {
        const selected = obj.typeSelectElement.selectedOptions[0];
        obj.type = parseInt(selected.value);
        DrawChanges();
    }

    updateAllOptions() {
        this.updateOptions(this.startSelectElement, this.start);
        this.updateOptions(this.endSelectElement, this.end);
    }
    updateOptions(selectElement:HTMLSelectElement, id:number): void {
        while(selectElement.options.length > 0) {
            selectElement.options.remove(0);
        }
        for(let joint of jointInputs) {
            let selected = joint.id == id;
            let option = new Option(joint.name, joint.id+"", selected, selected);
            selectElement.options.add(option);
        }
    }
    updateName(ev:Event, obj:MemberInput) {
        const inputBox = <HTMLInputElement>ev.srcElement;
        obj.name = inputBox.value;
        DrawChanges();
    }
}

export class JointInput {
    id: number;
    name: string;
    position: vec2;
    force: vec2;
    fixed: boolean;

    jointSpan: HTMLElement;
    nameInput: HTMLInputElement;
    positionInput: HTMLInputElement;
    fixedInput: HTMLInputElement;
    forceInput: HTMLInputElement;

    constructor(jointsIn: HTMLElement, name: string, position:vec2 = [0, 0], force:vec2|number = 0, fixed:boolean = false) {
        this.id = ++jointCount;
        this.name = name;
        this.position = position;
        this.fixed = fixed;

        this.jointSpan = document.createElement("DIV");
        this.jointSpan.classList.add("joint_in");

        this.nameInput = <HTMLInputElement>document.createElement("INPUT");
        this.positionInput = <HTMLInputElement>document.createElement("INPUT");
        this.forceInput = <HTMLInputElement>document.createElement("INPUT");
        this.fixedInput = <HTMLInputElement>document.createElement("INPUT");
        this.fixedInput.type = "checkbox";

        this.positionInput.value = `${position[0]}, ${position[1]}`;
        this.fixedInput.checked = fixed;
        if(typeof force === "number") {
            this.force = [0, force];
            this.forceInput.value = `${force}`;
        } else {
            this.force = force;
            this.forceInput.value = `${force[0]}, ${force[1]}`;
        }
        this.nameInput.value = name;
        this.nameInput.onchange = (ev)=>{this.updateName(ev, this)};
        this.positionInput.onchange = (ev)=>{this.updatePosition(ev, this)};
        this.forceInput.onchange = (ev)=>{this.updateForce(ev, this)};
        this.fixedInput.onchange = (ev)=>(this.updateFixed(ev, this));

        this.jointSpan.append("Name: ");
        this.jointSpan.appendChild(this.nameInput);
        this.jointSpan.append(" Position (x, y) in mm: ");
        this.jointSpan.appendChild(this.positionInput);
        this.jointSpan.append(" Force(x, y): ");
        this.jointSpan.appendChild(this.forceInput);
        this.jointSpan.append(" Fixed: ");
        this.jointSpan.appendChild(this.fixedInput);

        jointsIn.appendChild(this.jointSpan);
    }
    updateName(ev: Event, obj:JointInput):void {
        const input = <HTMLInputElement>ev.srcElement;
        if(input.value !== "" && canUpdateName(obj.id, input.value)) {
            obj.name = input.value;
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
        obj.position = [parseFloat(x), parseFloat(y)];
        DrawChanges();
    }
    updateForce(ev: Event, obj:JointInput) {
        const input = <HTMLInputElement>ev.srcElement;
        let forceString = input.value.trim();
        if(forceString.match(/^-?\d+$/)) {
            obj.force = [0, parseFloat(forceString)];
        } else if(forceString.match(/^-?\d+ ?, ?-?\d+$/)) {
            let [x, y] = forceString.split(',');
            obj.force = [parseFloat(x), parseFloat(y)];
        } else {
            console.log("Position does not match regex");
            return;
        }
        DrawChanges();
    }
    updateFixed(ev: Event, obj:JointInput) {
        const input = <HTMLInputElement>ev.srcElement;
        obj.fixed = input.checked;
        DrawChanges();
    }
}

function canUpdateName(id:number, newName:string):boolean {
    for(let joint of jointInputs) {
        if(id === joint.id) continue;
        if(newName === joint.name) return false;
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
    jointInputs.push(new JointInput(jointsIn, `Joint ${jointCount}`));
    refeshSelectInputs();
    DrawChanges();
}

function addNewMember() {
    const membersIn = <HTMLElement>document.getElementById("members_in");
    memberInputs.push(new MemberInput(membersIn, `Member ${memberCount}`, jointInputs[0].id, jointInputs[1].id));
    DrawChanges();
}

function initialCantilever() {
    const jointsIn = <HTMLElement>document.getElementById("joints_in");
    const membersIn = <HTMLElement>document.getElementById("members_in");

    jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [0 ,0], 0, true));
    jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [0, 255], 0, true));
    jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [407.5, 0]));
    jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [407.5, 255]));
    jointInputs.push(new JointInput(jointsIn, `${jointCount}`, [815, 0], -2700));
    
    memberInputs.push(new MemberInput(membersIn, `a`, jointInputs[0].id, jointInputs[2].id));
    memberInputs.push(new MemberInput(membersIn, `b`, jointInputs[1].id, jointInputs[2].id));
    memberInputs.push(new MemberInput(membersIn, `c`, jointInputs[1].id, jointInputs[3].id));
    memberInputs.push(new MemberInput(membersIn, `d`, jointInputs[2].id, jointInputs[3].id));
    memberInputs.push(new MemberInput(membersIn, `e`, jointInputs[3].id, jointInputs[4].id));
    memberInputs.push(new MemberInput(membersIn, `f`, jointInputs[2].id, jointInputs[4].id));
}

function DrawChanges() {
    const canvas = <HTMLCanvasElement>document.getElementById("canvas_out");
    const context = <CanvasRenderingContext2D>canvas.getContext('2d');

    const results = RunSimulation(jointInputs, memberInputs);
    DrawScene(context, [canvas.width, canvas.height], results);
}

function AddCell(row:HTMLElement, text:string|number) {
    let cell = document.createElement("TD");
    cell.append(<string>text);
    row.appendChild(cell);
}

function PopulateMemberTable() {
    const memberTable = <HTMLElement>document.getElementById("member_info");

    let row = document.createElement("TR");
    AddCell(row, "ID");
    AddCell(row, "Size (mm)");
    AddCell(row, "Thickness (mm)");
    AddCell(row, "Mass/length (g/mm)");

    memberTable.append(row);
    let count = 0;
    for(let member of BEAMS) {
        let row = document.createElement("TR");
        AddCell(row, count++);
        AddCell(row, member.size);
        AddCell(row, member.thickness);
        AddCell(row, member.massPerLength);

        memberTable.append(row);
    }
}

window.onload = ()=>{
    console.log("Starting script");
    clearTimeout(timeout);
    PopulateMemberTable();
    const addMemberBtn = <HTMLButtonElement>document.getElementById("new_member");
    const addJointBtn = <HTMLButtonElement>document.getElementById("new_joint");
    addMemberBtn.onclick = addNewMember;
    addJointBtn.onclick = addNewJoint;

    initialCantilever();
    DrawChanges();
};

var timeout = setTimeout(window.onload);