define(["require", "exports", "./renderer", "./analyse"], function (require, exports, renderer_1, analyse_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var jointCount = 0;
    var memberCount = 0;
    var jointInputs = [];
    var memberInputs = [];
    var MemberInput = (function () {
        function MemberInput(membersIn, name, start, end) {
            var _this = this;
            this.id = ++memberCount;
            this.name = name;
            this.start = start;
            this.end = end;
            this.type = 0;
            this.memberSpan = document.createElement("DIV");
            this.nameInput = document.createElement("INPUT");
            this.nameInput.value = name;
            this.nameInput.onchange = function (ev) { _this.updateName(ev, _this); };
            this.startSelectElement = document.createElement("SELECT");
            this.endSelectElement = document.createElement("SELECT");
            this.typeSelectElement = document.createElement("SELECT");
            for (var i = 0; i < analyse_1.BEAMS.length; i++) {
                var option = new Option("" + i, "" + i);
                this.typeSelectElement.options.add(option);
            }
            this.startSelectElement.onchange = function () { _this.updateStart(_this); };
            this.endSelectElement.onchange = function () { _this.updateEnd(_this); };
            this.typeSelectElement.onchange = function () { _this.updateType(_this); };
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
        MemberInput.prototype.updateStart = function (obj) {
            var selected = obj.startSelectElement.selectedOptions[0];
            obj.start = parseInt(selected.value);
            DrawChanges();
        };
        MemberInput.prototype.updateEnd = function (obj) {
            var selected = obj.endSelectElement.selectedOptions[0];
            obj.end = parseInt(selected.value);
            DrawChanges();
        };
        MemberInput.prototype.updateType = function (obj) {
            var selected = obj.typeSelectElement.selectedOptions[0];
            obj.type = parseInt(selected.value);
            DrawChanges();
        };
        MemberInput.prototype.updateAllOptions = function () {
            this.updateOptions(this.startSelectElement, this.start);
            this.updateOptions(this.endSelectElement, this.end);
        };
        MemberInput.prototype.updateOptions = function (selectElement, id) {
            while (selectElement.options.length > 0) {
                selectElement.options.remove(0);
            }
            for (var _i = 0, jointInputs_1 = jointInputs; _i < jointInputs_1.length; _i++) {
                var joint = jointInputs_1[_i];
                var selected = joint.id == id;
                var option = new Option(joint.name, joint.id + "", selected, selected);
                selectElement.options.add(option);
            }
        };
        MemberInput.prototype.updateName = function (ev, obj) {
            var inputBox = ev.srcElement;
            obj.name = inputBox.value;
            DrawChanges();
        };
        return MemberInput;
    }());
    exports.MemberInput = MemberInput;
    var JointInput = (function () {
        function JointInput(jointsIn, name, position, force, fixed) {
            var _this = this;
            if (position === void 0) { position = [0, 0]; }
            if (force === void 0) { force = 0; }
            if (fixed === void 0) { fixed = false; }
            this.id = ++jointCount;
            this.name = name;
            this.position = position;
            this.fixed = fixed;
            this.jointSpan = document.createElement("DIV");
            this.jointSpan.classList.add("joint_in");
            this.nameInput = document.createElement("INPUT");
            this.positionInput = document.createElement("INPUT");
            this.forceInput = document.createElement("INPUT");
            this.fixedInput = document.createElement("INPUT");
            this.fixedInput.type = "checkbox";
            this.positionInput.value = position[0] + ", " + position[1];
            this.fixedInput.checked = fixed;
            if (typeof force === "number") {
                this.force = [0, force];
                this.forceInput.value = "" + force;
            }
            else {
                this.force = force;
                this.forceInput.value = force[0] + ", " + force[1];
            }
            this.nameInput.value = name;
            this.nameInput.onchange = function (ev) { _this.updateName(ev, _this); };
            this.positionInput.onchange = function (ev) { _this.updatePosition(ev, _this); };
            this.forceInput.onchange = function (ev) { _this.updateForce(ev, _this); };
            this.fixedInput.onchange = function (ev) { return (_this.updateFixed(ev, _this)); };
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
        JointInput.prototype.updateName = function (ev, obj) {
            var input = ev.srcElement;
            if (input.value !== "" && canUpdateName(obj.id, input.value)) {
                obj.name = input.value;
                refeshSelectInputs();
            }
            else {
                alert("Invalid/ reused joint name");
            }
            DrawChanges();
        };
        JointInput.prototype.updatePosition = function (ev, obj) {
            var input = ev.srcElement;
            var posString = input.value.trim();
            if (!posString.match(/^-?\d+ ?, ?-?\d+$/)) {
                console.log("Position does not match regex");
                return;
            }
            var _a = posString.split(','), x = _a[0], y = _a[1];
            obj.position = [parseFloat(x), parseFloat(y)];
            DrawChanges();
        };
        JointInput.prototype.updateForce = function (ev, obj) {
            var input = ev.srcElement;
            var forceString = input.value.trim();
            if (forceString.match(/^-?\d+$/)) {
                obj.force = [0, parseFloat(forceString)];
            }
            else if (forceString.match(/^-?\d+ ?, ?-?\d+$/)) {
                var _a = forceString.split(','), x = _a[0], y = _a[1];
                obj.force = [parseFloat(x), parseFloat(y)];
            }
            else {
                console.log("Position does not match regex");
                return;
            }
            DrawChanges();
        };
        JointInput.prototype.updateFixed = function (ev, obj) {
            var input = ev.srcElement;
            obj.fixed = input.checked;
            DrawChanges();
        };
        return JointInput;
    }());
    exports.JointInput = JointInput;
    function canUpdateName(id, newName) {
        for (var _i = 0, jointInputs_2 = jointInputs; _i < jointInputs_2.length; _i++) {
            var joint = jointInputs_2[_i];
            if (id === joint.id)
                continue;
            if (newName === joint.name)
                return false;
        }
        return true;
    }
    function refeshSelectInputs() {
        for (var _i = 0, memberInputs_1 = memberInputs; _i < memberInputs_1.length; _i++) {
            var member = memberInputs_1[_i];
            member.updateAllOptions();
        }
        return true;
    }
    function addNewJoint() {
        var jointsIn = document.getElementById("joints_in");
        jointInputs.push(new JointInput(jointsIn, "Joint " + jointCount));
        refeshSelectInputs();
        DrawChanges();
    }
    function addNewMember() {
        var membersIn = document.getElementById("members_in");
        memberInputs.push(new MemberInput(membersIn, "Member " + memberCount, jointInputs[0].id, jointInputs[1].id));
        DrawChanges();
    }
    function initialCantilever() {
        var jointsIn = document.getElementById("joints_in");
        var membersIn = document.getElementById("members_in");
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [0, 0], 0, true));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [0, 255], 0, true));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [407.5, 0]));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [407.5, 255]));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [815, 0], -2700));
        memberInputs.push(new MemberInput(membersIn, "a", jointInputs[0].id, jointInputs[2].id));
        memberInputs.push(new MemberInput(membersIn, "b", jointInputs[1].id, jointInputs[2].id));
        memberInputs.push(new MemberInput(membersIn, "c", jointInputs[1].id, jointInputs[3].id));
        memberInputs.push(new MemberInput(membersIn, "d", jointInputs[2].id, jointInputs[3].id));
        memberInputs.push(new MemberInput(membersIn, "e", jointInputs[3].id, jointInputs[4].id));
        memberInputs.push(new MemberInput(membersIn, "f", jointInputs[2].id, jointInputs[4].id));
    }
    function DrawChanges() {
        var canvas = document.getElementById("canvas_out");
        var context = canvas.getContext('2d');
        var results = analyse_1.RunSimulation(jointInputs, memberInputs);
        renderer_1.DrawScene(context, [canvas.width, canvas.height], results);
    }
    function AddCell(row, text) {
        var cell = document.createElement("TD");
        cell.append(text);
        row.appendChild(cell);
    }
    function PopulateMemberTable() {
        var memberTable = document.getElementById("member_info");
        var row = document.createElement("TR");
        AddCell(row, "ID");
        AddCell(row, "Size (mm)");
        AddCell(row, "Thickness (mm)");
        AddCell(row, "Mass/length (g/mm)");
        memberTable.append(row);
        var count = 0;
        for (var _i = 0, BEAMS_1 = analyse_1.BEAMS; _i < BEAMS_1.length; _i++) {
            var member = BEAMS_1[_i];
            var row_1 = document.createElement("TR");
            AddCell(row_1, count++);
            AddCell(row_1, member.size);
            AddCell(row_1, member.thickness);
            AddCell(row_1, member.massPerLength);
            memberTable.append(row_1);
        }
    }
    window.onload = function () {
        console.log("Starting script");
        clearTimeout(timeout);
        PopulateMemberTable();
        var addMemberBtn = document.getElementById("new_member");
        var addJointBtn = document.getElementById("new_joint");
        addMemberBtn.onclick = addNewMember;
        addJointBtn.onclick = addNewJoint;
        initialCantilever();
        DrawChanges();
    };
    var timeout = setTimeout(window.onload);
});
