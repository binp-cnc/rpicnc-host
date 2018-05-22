function Editor(app) {
	Item.call(this, template("T_Editor"));
	this.app = app;
	this.axis_ctrls = [];

	this.mode2d = new Button(ecl(this.elem, "t_mode_2d"), function () {
		this.mode2d.elem.classList.remove("ccellbtn_inactive");
		this.mode3d.elem.classList.add("ccellbtn_inactive");
	}.bind(this));
	this.mode3d = new Button(ecl(this.elem, "t_mode_3d"), function () {
		this.mode2d.elem.classList.add("ccellbtn_inactive");
		this.mode3d.elem.classList.remove("ccellbtn_inactive");
	}.bind(this));

	this.move = new Button(ecl(this.elem, "t_move"), function () {
		this.app.device._sendMoveTask(map(this.axis_ctrls, function (i, ac) {
			return parseInt(ac.move_rel.getValue());
		}));
	}.bind(this));
}
Editor.prototype = Object.create(Item.prototype);
Editor.prototype.constructor = Editor;

Editor.prototype.setConfig = function (axes) {
	var axcon = ecl(this.elem, "t_axis_controls");
	clear(axcon);
	this.axis_ctrls = map(axes, function (i, ax) {
		var axc = new AxisControl(this.app, ax);
		axcon.appendChild(axc.elem);
		return axc;
	}.bind(this));
};

Editor.prototype.refresh = function () {
	map(this.axis_ctrls, function (i, ac) {
		ac.refresh();
	}.bind(this));
};
