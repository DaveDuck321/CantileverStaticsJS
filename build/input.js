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
            this.alive = true;
            this.data = {
                id: ++memberCount,
                name: name,
                startId: start,
                endId: end,
                beamType: type,
                beamCount: 1,
            };
            this.memberSpan = document.createElement("DIV");
            this.nameInput = document.createElement("INPUT");
            this.doubleInput = document.createElement("INPUT");
            this.removeInput = document.createElement("INPUT");
            this.removeInput.type = "button";
            this.removeInput.value = "Remove";
            this.doubleInput.type = "checkbox";
            this.nameInput.onchange = function () { _this.updateName(_this); };
            this.doubleInput.onchange = function () { _this.updateDouble(_this); };
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
            this.removeInput.onclick = function () { _this.destroy(_this); };
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
        MemberInput.prototype.matchInternalState = function () {
            this.nameInput.value = this.data.name;
            this.startSelectElement.value = "" + this.data.startId;
            this.endSelectElement.value = "" + this.data.endId;
            this.typeSelectElement.value = "" + this.data.beamType;
            this.doubleInput.checked = this.data.beamCount > 1;
        };
        MemberInput.prototype.destroy = function (obj) {
            obj.alive = false;
            obj.memberSpan.remove();
            DrawChanges();
        };
        MemberInput.prototype.updateDouble = function (obj) {
            obj.data.beamCount = obj.doubleInput.checked ? 2 : 1;
            DrawChanges();
        };
        MemberInput.prototype.updateStart = function (obj) {
            obj.data.startId = parseInt(obj.startSelectElement.value);
            DrawChanges();
        };
        MemberInput.prototype.updateEnd = function (obj) {
            var selected = obj.endSelectElement.selectedOptions[0];
            obj.data.endId = parseInt(selected.value);
            DrawChanges();
        };
        MemberInput.prototype.updateType = function (obj) {
            var selected = obj.typeSelectElement.selectedOptions[0];
            obj.data.beamType = parseInt(selected.value);
            DrawChanges();
        };
        MemberInput.prototype.updateAllOptions = function () {
            this.updateOptions(this.startSelectElement, this.data.startId);
            this.updateOptions(this.endSelectElement, this.data.endId);
        };
        MemberInput.prototype.updateOptions = function (selectElement, id) {
            while (selectElement.options.length > 0) {
                selectElement.options.remove(0);
            }
            for (var _i = 0, jointInputs_1 = jointInputs; _i < jointInputs_1.length; _i++) {
                var joint = jointInputs_1[_i];
                var selected = joint.data.id == id;
                var option = new Option(joint.data.name, joint.data.id + "", selected, selected);
                selectElement.options.add(option);
            }
        };
        MemberInput.prototype.updateName = function (obj) {
            obj.data.name = obj.nameInput.value;
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
            this.alive = true;
            if (typeof force === "number") {
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
            this.nameInput = document.createElement("INPUT");
            this.positionInput = document.createElement("INPUT");
            this.forceInput = document.createElement("INPUT");
            this.fixedInput = document.createElement("INPUT");
            this.removeInput = document.createElement("INPUT");
            this.removeInput.type = "button";
            this.removeInput.value = "Remove";
            this.fixedInput.type = "checkbox";
            this.nameInput.onchange = function (ev) { _this.updateName(ev, _this); };
            this.positionInput.onchange = function (ev) { _this.updatePosition(ev, _this); };
            this.forceInput.onchange = function (ev) { _this.updateForce(ev, _this); };
            this.fixedInput.onchange = function (ev) { return (_this.updateFixed(ev, _this)); };
            this.removeInput.onclick = function () { _this.destroy(_this); };
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
        JointInput.prototype.matchInternalState = function () {
            var state = this.data;
            this.nameInput.value = state.name;
            this.positionInput.value = state.position[0] + ", " + state.position[1];
            this.fixedInput.checked = state.fixed;
            if (state.force[0] === 0) {
                this.forceInput.value = "" + state.force[1];
            }
            else {
                this.forceInput.value = state.force[0] + ", " + state.force[1];
            }
        };
        JointInput.prototype.destroy = function (obj) {
            if (!canDestroyJoint(obj.data.id)) {
                alert("Cannot remove joint, there are connecting members!");
                return;
            }
            obj.alive = false;
            obj.jointSpan.remove();
            DrawChanges();
        };
        JointInput.prototype.updateName = function (ev, obj) {
            var input = ev.srcElement;
            if (input.value !== "" && canUpdateName(obj.data.id, input.value)) {
                obj.data.name = input.value;
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
            obj.data.position = [parseFloat(x), parseFloat(y)];
            DrawChanges();
        };
        JointInput.prototype.updateForce = function (ev, obj) {
            var input = ev.srcElement;
            var forceString = input.value.trim();
            if (forceString.match(/^-?\d+$/)) {
                obj.data.force = [0, parseFloat(forceString)];
            }
            else if (forceString.match(/^-?\d+ ?, ?-?\d+$/)) {
                var _a = forceString.split(','), x = _a[0], y = _a[1];
                obj.data.force = [parseFloat(x), parseFloat(y)];
            }
            else {
                console.log("Position does not match regex");
                return;
            }
            DrawChanges();
        };
        JointInput.prototype.updateFixed = function (ev, obj) {
            var input = ev.srcElement;
            obj.data.fixed = input.checked;
            DrawChanges();
        };
        return JointInput;
    }());
    exports.JointInput = JointInput;
    function canDestroyJoint(id) {
        for (var _i = 0, memberInputs_1 = memberInputs; _i < memberInputs_1.length; _i++) {
            var member = memberInputs_1[_i];
            if (member.data.startId == id || member.data.endId == id) {
                return false;
            }
        }
        return true;
    }
    function canUpdateName(id, newName) {
        for (var _i = 0, jointInputs_2 = jointInputs; _i < jointInputs_2.length; _i++) {
            var joint = jointInputs_2[_i];
            if (id === joint.data.id)
                continue;
            if (newName === joint.data.name)
                return false;
        }
        return true;
    }
    function refeshSelectInputs() {
        for (var _i = 0, memberInputs_2 = memberInputs; _i < memberInputs_2.length; _i++) {
            var member = memberInputs_2[_i];
            member.updateAllOptions();
        }
        return true;
    }
    function addNewJoint() {
        var jointsIn = document.getElementById("joints_in");
        jointInputs.push(new JointInput(jointsIn, "" + jointCount));
        refeshSelectInputs();
        DrawChanges();
    }
    function addNewMember() {
        var membersIn = document.getElementById("members_in");
        memberInputs.push(new MemberInput(membersIn, "m" + memberCount, jointInputs[0].data.id, jointInputs[1].data.id));
        DrawChanges();
    }
    function loadFromData(data) {
        jointCount = 0;
        memberCount = 0;
        memberInputs = [];
        jointInputs = [];
        var membersIn = document.getElementById("members_in");
        var jointsIn = document.getElementById("joints_in");
        membersIn.innerHTML = "";
        jointsIn.innerHTML = "";
        for (var _i = 0, _a = data.joints; _i < _a.length; _i++) {
            var jointData = _a[_i];
            var joint = new JointInput(jointsIn, jointData.name);
            joint.data = jointData;
            joint.matchInternalState();
            jointInputs.push(joint);
            jointCount = Math.max(jointData.id + 1, jointCount);
        }
        for (var _b = 0, _c = data.members; _b < _c.length; _b++) {
            var memberData = _c[_b];
            var member = new MemberInput(membersIn, memberData.name, 0, 1);
            member.data = memberData;
            member.matchInternalState();
            memberInputs.push(member);
            memberCount = Math.max(memberData.id + 1, memberCount);
        }
        refeshSelectInputs();
        DrawChanges();
    }
    function loadFromJsonInput() {
        var jsonInput = document.getElementById("structure_data");
        try {
            var saveData = JSON.parse(jsonInput.value);
            loadFromData(saveData);
        }
        catch (e) {
            alert("Could not load from json!");
        }
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
        memberInputs.push(new MemberInput(membersIn, "a", jointInputs[0].data.id, jointInputs[1].data.id, 4));
        memberInputs.push(new MemberInput(membersIn, "b", jointInputs[1].data.id, jointInputs[2].data.id, 4));
        memberInputs.push(new MemberInput(membersIn, "c", jointInputs[2].data.id, jointInputs[3].data.id, 4));
        memberInputs.push(new MemberInput(membersIn, "d", jointInputs[4].data.id, jointInputs[5].data.id, 2));
        memberInputs.push(new MemberInput(membersIn, "e", jointInputs[5].data.id, jointInputs[6].data.id, 2));
        memberInputs.push(new MemberInput(membersIn, "f", jointInputs[6].data.id, jointInputs[3].data.id, 2));
        memberInputs.push(new MemberInput(membersIn, "g", jointInputs[4].data.id, jointInputs[1].data.id));
        memberInputs.push(new MemberInput(membersIn, "h", jointInputs[5].data.id, jointInputs[1].data.id));
        memberInputs.push(new MemberInput(membersIn, "i", jointInputs[5].data.id, jointInputs[2].data.id));
        memberInputs.push(new MemberInput(membersIn, "j", jointInputs[6].data.id, jointInputs[2].data.id));
    }
    function DrawChanges() {
        console.log("Updated");
        var canvas = document.getElementById("canvas_out");
        var context = canvas.getContext('2d');
        memberInputs = memberInputs.filter(function (member) { return member.alive; });
        jointInputs = jointInputs.filter(function (joint) { return joint.alive; });
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
        var optimiseBtn = document.getElementById("optimise");
        var loadJSON = document.getElementById("JSON_load");
        addMemberBtn.onclick = addNewMember;
        addJointBtn.onclick = addNewJoint;
        loadJSON.onclick = loadFromJsonInput;
        initialCantilever();
        DrawChanges();
    };
    var timeout = setTimeout(window.onload);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0lBS0EsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztJQUNwQixJQUFJLFdBQVcsR0FBZ0IsRUFBRSxDQUFDO0lBQ2xDLElBQUksWUFBWSxHQUFpQixFQUFFLENBQUM7SUFFcEM7UUFZSSxxQkFBWSxTQUFzQixFQUFFLElBQVcsRUFBRSxLQUFZLEVBQUUsR0FBVSxFQUFFLElBQWE7WUFBeEYsaUJBbURDO1lBbkQwRSxxQkFBQSxFQUFBLFFBQWE7WUFDcEYsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFDbEIsSUFBSSxDQUFDLElBQUksR0FBRztnQkFDUixFQUFFLEVBQUUsRUFBRSxXQUFXO2dCQUNqQixJQUFJLEVBQUUsSUFBSTtnQkFDVixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsR0FBRztnQkFDVixRQUFRLEVBQUUsSUFBSTtnQkFDZCxTQUFTLEVBQUUsQ0FBQzthQUNmLENBQUM7WUFFRixJQUFJLENBQUMsVUFBVSxHQUFnQixRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLEdBQXFCLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLFdBQVcsR0FBcUIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsV0FBVyxHQUFxQixRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7WUFDbEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJ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UCxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztTQUN0QztJQUNMLENBQUM7SUFFRCxTQUFTLGlCQUFpQjtRQUN0QixJQUFNLFFBQVEsR0FBZ0IsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuRSxJQUFNLFNBQVMsR0FBZ0IsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV0RSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFHLFVBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFHLFVBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBRyxVQUFZLEVBQUUsQ0FBQyxHQUFHLEdBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFHLFVBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFN0UsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBRyxVQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0UsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBRyxVQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFHLFVBQVksRUFBRSxDQUFDLEdBQUcsR0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFDLEVBQUUsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakYsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25HLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0RyxD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