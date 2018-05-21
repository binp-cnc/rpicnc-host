function Axis(app, dev, num, config) {
	Item.call(this, template("T_Axis"));
	this.app = app;
	this.dev = dev;
	this.num = num;
	this.config = config;
	
	this._cache = {};

	if (this.config["name"]) {
		ecl(this.elem, "t_axis_name").innerText = this.config["name"].toUpperCase();
	}

	map(["scan", "calib"], function (i, key) {
		this[key] = new Button(ecl(this.elem, "t_axis_" + key), function () {
			this.app.send({
				"action": "run_task",
				"task": {
					"id": 0,
					"type": key,
					"axis": this.num
				}
			});
		}.bind(this));
	}.bind(this));

	this.pos = new Label(ecl(this.elem, "t_pos"));
	this.len = new Label(ecl(this.elem, "t_len"));
	map(["vel_init", "vel_max", "acc_max"], function (i, key) {
		this[key] = new Input(ecl(this.elem, "t_" + key), function () {
			console.log("change " + key);
			var val = this[key].getValue();
			if ((val || val == 0) && val >= 0.0) {
				console.log(val);
				this._cache[key] = val;
				var cdiff = {};
				cdiff[key] = val;
				this.dev._sendAxCDiff(this.num, cdiff);
			}
		}.bind(this), "float");
	}.bind(this));
}
Axis.prototype = Object.create(Item.prototype);
Axis.prototype.constructor = Axis;

Axis.prototype.setCache = function (cache) {
	this._cache = cache;
	map_dict(this._cache, function (k, v) {
		this[k].setValue(v);
	}.bind(this));
};

Axis.prototype.getCache = function (cache) {
	return this._cache;
};

Axis.prototype.setSensorsState = function (sens) {
	ecl(this.elem, "t_sens_left").classList[sens[0] ? "add" : "remove"]("ccell_active");
	ecl(this.elem, "t_sens_right").classList[sens[1] ? "add" : "remove"]("ccell_active");
};

Axis.prototype.completeTask = function (task) {
	/*
	if (task["type"] == "scan") {
		this.pos.setValue(0);
		this.len.setValue(task["length"]);
	}
	*/
}

function AxisControl(app, axis) {
	Item.call(this, template("T_AxisControl"));
	this.app = app;
	this.axis = axis;

	ecl(this.elem, "t_name").innerText = "Axis " + this.axis.config["name"].toUpperCase();
	
	this.move_abs = new FastInput(ecl(this.elem, "t_move_abs"), function () {
		var val = cast("int", this.move_abs.getValue());
		this.move_rel.setValue(val - this.axis.pos.getValue());
	}.bind(this), "int");
	this.move_rel = new FastInput(ecl(this.elem, "t_move_rel"), function () {
		var val = cast("int", this.move_rel.getValue());
		this.move_abs.setValue(val + this.axis.pos.getValue());
	}.bind(this), "int");
}
AxisControl.prototype = Object.create(Item.prototype);
AxisControl.prototype.constructor = AxisControl;
