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
            this.start = start;
            this.end = end;
            this.type = type;
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
        cell.append(text);
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
        AddCell(row, "Effctive Area (mm)");
        memberTable.append(row);
        var count = 0;
        for (var _i = 0, BEAMS_1 = analyse_1.BEAMS; _i < BEAMS_1.length; _i++) {
            var member = BEAMS_1[_i];
            var row_1 = document.createElement("TR");
            AddCell(row_1, count++);
            AddCell(row_1, member.size);
            AddCell(row_1, member.thickness);
            AddCell(row_1, member.massPerLength);
            AddCell(row_1, math_util_1.Round(analyse_1.GetEffectiveArea(member), 1));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0lBSUEsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztJQUNwQixJQUFJLFdBQVcsR0FBZ0IsRUFBRSxDQUFDO0lBQ2xDLElBQUksWUFBWSxHQUFpQixFQUFFLENBQUM7SUFFcEM7UUFjSSxxQkFBWSxTQUFzQixFQUFFLElBQVcsRUFBRSxLQUFZLEVBQUUsR0FBVSxFQUFFLElBQWE7WUFBeEYsaUJBcUNDO1lBckMwRSxxQkFBQSxFQUFBLFFBQWE7WUFDcEYsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQztZQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUVqQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNuQixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUNmLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBRWpCLElBQUksQ0FBQyxVQUFVLEdBQWdCLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLFNBQVMsR0FBcUIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVuRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsVUFBQyxFQUFFLElBQUksS0FBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsS0FBSSxDQUFDLENBQUEsQ0FBQSxDQUFDLENBQUM7WUFFNUQsSUFBSSxDQUFDLGtCQUFrQixHQUFzQixRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlFLElBQUksQ0FBQyxnQkFBZ0IsR0FBc0IsUUFBUSxDQUFDLGFBQWEs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Q0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBRyxVQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0UsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBRyxVQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUcsVUFBWSxFQUFFLENBQUMsR0FBRyxHQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUUsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBRyxVQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTdFLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUcsVUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQy9FLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUcsVUFBWSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBRyxVQUFZLEVBQUUsQ0FBQyxHQUFHLEdBQUMsR0FBRyxFQUFFLEdBQUcsR0FBQyxFQUFFLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWpGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUYsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUYsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFRCxTQUFTLFdBQVc7UUFDaEIsSUFBTSxNQUFNLEdBQXNCLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEUsSUFBTSxPQUFPLEdBQTZCLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbEUsSUFBTSxPQUFPLEdBQUcsdUJBQWEsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekQsb0JBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsU0FBZ0IsT0FBTyxDQUFDLEdBQWUsRUFBRSxJQUFrQjtRQUFFLG1CQUFxQjthQUFyQixVQUFxQixFQUFyQixxQkFBcUIsRUFBckIsSUFBcUI7WUFBckIsa0NBQXFCOztRQUM5RSxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLEtBQWEsVUFBUyxFQUFULHVCQUFTLEVBQVQsdUJBQVMsRUFBVCxJQUFTLEVBQUU7WUFBcEIsSUFBSSxDQUFDLGtCQUFBO1lBQ0wsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDekI7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFTLElBQUksQ0FBQyxDQUFDO1FBQzFCLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQVBELDBCQU9DO0lBRUQsU0FBUyxtQkFBbUI7UUFDeEIsSUFBTSxXQUFXLEdBQWdCLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFeEUsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25CLE9BQU8sQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNuQyxPQUFPLENBQUMsR0FBRyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFbkMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFrQixVQUFLLEVBQUwsVUFBQSxlQUFLLEVBQUwsbUJBQUssRUFBTCxJQUFLLEVBQUU7WUFBckIsSUFBSSxNQUFNLGNBQUE7WUFDVixJQUFJLEtBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxLQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN0QixPQUFPLENBQUMsS0FBRyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQixPQUFPLENBQUMsS0FBRyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMvQixPQUFPLENBQUMsS0FBRyxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNuQyxPQUFPLENBQUMsS0FBRyxFQUFFLGlCQUFLLENBQUMsMEJBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqRCxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUcsQ0FBQyxDQUFDO1NBQzNCO0lBQ0wsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFNLEdBQUc7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDL0IsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RCLG1CQUFtQixFQUFFLENBQUM7UUFDdEIsSUFBTSxZQUFZLEdBQXNCLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUUsSUFBTSxXQUFXLEdBQXNCLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUUsWUFBWSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUM7UUFDcEMsV0FBVyxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7UUFFbEMsaUJBQWlCLEVBQUUsQ0FBQztRQUNwQixXQUFXLEVBQUUsQ0FBQztJQUNsQixDQUFDLENBQUM7SUFFRixJQUFJLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDIn0=