define(["require", "exports", "./renderer", "./math_util", "./analyse"], function (require, exports, renderer_1, math_util_1, analyse_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var jointCount = 0;
    var memberCount = 0;
    var jointInputs = [];
    var memberInputs = [];
    var MemberInput = (function () {
        function MemberInput(membersIn, name, start, end, type) {
            var _this = this;
            if (type === void 0) { type = 0; }
            this.id = ++memberCount;
            this.name = name;
            this.double = false;
            this.start = start;
            this.end = end;
            this.type = type;
            this.memberSpan = document.createElement("DIV");
            this.nameInput = document.createElement("INPUT");
            this.doubleInput = document.createElement("INPUT");
            this.doubleInput.type = "checkbox";
            this.nameInput.value = name;
            this.nameInput.onchange = function () { _this.updateName(_this); };
            this.doubleInput.onchange = function () { _this.updateDouble(_this); };
            this.startSelectElement = document.createElement("SELECT");
            this.endSelectElement = document.createElement("SELECT");
            this.typeSelectElement = document.createElement("SELECT");
            for (var i = 0; i < analyse_1.BEAMS.length; i++) {
                var option = new Option("" + i, "" + i);
                this.typeSelectElement.options.add(option);
            }
            this.typeSelectElement.options.selectedIndex = type;
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
            this.memberSpan.append(" Double Beam: ");
            this.memberSpan.appendChild(this.doubleInput);
            membersIn.appendChild(this.memberSpan);
            this.updateAllOptions();
        }
        MemberInput.prototype.updateDouble = function (obj) {
            obj.double = obj.doubleInput.checked;
            DrawChanges();
        };
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
        MemberInput.prototype.updateName = function (obj) {
            obj.name = obj.nameInput.value;
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
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [272, 0]));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [272 + 272, 0]));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [815, 0], -1350));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [0, 255], 0, true));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [272, 255 - 85]));
        jointInputs.push(new JointInput(jointsIn, "" + jointCount, [272 + 272, 255 - 85 * 2]));
        memberInputs.push(new MemberInput(membersIn, "a", jointInputs[0].id, jointInputs[1].id, 4));
        memberInputs.push(new MemberInput(membersIn, "b", jointInputs[1].id, jointInputs[2].id, 4));
        memberInputs.push(new MemberInput(membersIn, "c", jointInputs[2].id, jointInputs[3].id, 4));
        memberInputs.push(new MemberInput(membersIn, "d", jointInputs[4].id, jointInputs[5].id, 2));
        memberInputs.push(new MemberInput(membersIn, "e", jointInputs[5].id, jointInputs[6].id, 2));
        memberInputs.push(new MemberInput(membersIn, "f", jointInputs[6].id, jointInputs[3].id, 2));
        memberInputs.push(new MemberInput(membersIn, "g", jointInputs[4].id, jointInputs[1].id));
        memberInputs.push(new MemberInput(membersIn, "h", jointInputs[5].id, jointInputs[1].id));
        memberInputs.push(new MemberInput(membersIn, "i", jointInputs[5].id, jointInputs[2].id));
        memberInputs.push(new MemberInput(membersIn, "j", jointInputs[6].id, jointInputs[2].id));
    }
    function DrawChanges() {
        console.log("Updated");
        var canvas = document.getElementById("canvas_out");
        var context = canvas.getContext('2d');
        var results = analyse_1.RunSimulation(jointInputs, memberInputs);
        renderer_1.DrawScene(context, [canvas.width, canvas.height], results);
    }
    function AddCell(row, text) {
        var classList = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            classList[_i - 2] = arguments[_i];
        }
        var cell = document.createElement("TD");
        for (var _a = 0, classList_1 = classList; _a < classList_1.length; _a++) {
            var c = classList_1[_a];
            cell.classList.add(c);
        }
        cell.innerHTML = text;
        row.appendChild(cell);
    }
    exports.AddCell = AddCell;
    function PopulateMemberTable() {
        var memberTable = document.getElementById("member_info");
        var row = document.createElement("TR");
        AddCell(row, "ID");
        AddCell(row, "Size (mm)");
        AddCell(row, "Thickness (mm)");
        AddCell(row, "Mass/length (g/mm)");
        AddCell(row, "Effctive Area (mm<sup>2</sup>)");
        memberTable.append(row);
        var count = 0;
        for (var _i = 0, BEAMS_1 = analyse_1.BEAMS; _i < BEAMS_1.length; _i++) {
            var member = BEAMS_1[_i];
            var row_1 = document.createElement("TR");
            AddCell(row_1, count++);
            AddCell(row_1, member.size);
            AddCell(row_1, member.thickness);
            AddCell(row_1, member.massPerLength);
            AddCell(row_1, math_util_1.Round(analyse_1.GetEffectiveArea(member, 1), 1));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0lBSUEsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztJQUNwQixJQUFJLFdBQVcsR0FBZ0IsRUFBRSxDQUFDO0lBQ2xDLElBQUksWUFBWSxHQUFpQixFQUFFLENBQUM7SUFFcEM7UUFnQkkscUJBQVksU0FBc0IsRUFBRSxJQUFXLEVBQUUsS0FBWSxFQUFFLEdBQVUsRUFBRSxJQUFhO1lBQXhGLGlCQTRDQztZQTVDMEUscUJBQUEsRUFBQSxRQUFhO1lBQ3BGLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUM7WUFDeEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFFcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDbkIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDZixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUVqQixJQUFJLENBQUMsVUFBVSxHQUFnQixRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLEdBQXFCLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLFdBQVcsR0FBcUIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUE7WUFFbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQzVCLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLGNBQUssS0FBSSxDQUFDLFVBQVUsQ0FBQyxLQUFJLENBQUMsQ0FB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QUMsQ0FBQztRQUU3RSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFHLFVBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMvRSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFHLFVBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNFLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUcsVUFBWSxFQUFFLENBQUMsR0FBRyxHQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqRixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUYsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUYsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFD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