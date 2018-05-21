function Device(app) {
	Item.call(this, template("T_Device"));
	this.app = app;
	this.axes = [];
	this.config = {};
	this._cache = {};

	var stop = function () {
		console.log("stop_button: down");
		this.app.send({"action": "stop_device"});
	}.bind(this);
	this.stop_button = new ButtonExt(ecl(this.elem, "t_stop_button"), {"mousedown": stop, "click": stop});
	this.device_status = new Label(ecl(this.elem, "t_device_status"));
}
Device.prototype = Object.create(Item.prototype);
Device.prototype.constructor = Device;

Device.prototype.setConfig = function (config) {
	this.config = config;

	var axcon = ecl(this.elem, "t_axes");
	clear(axcon);
	this.axes = map(this.config["axes"], function (i, ac) {
		var axis = new Axis(this.app, this, i, ac);
		axcon.appendChild(axis.elem);
		return axis;
	}.bind(this));

	this.app.editor.setConfig(this.axes);

	this.app.send({"action": "get_cache"});
	this.app.send({"action": "get_device_state"});
	this.app.send({"action": "get_sensors_state"});
};

Device.prototype.setCache = function (cache) {
	this._cache = cache;
	map(this.axes, function (i, ax) {
		ax.setCache(this._cache["axes"][i]);
	}.bind(this));
};

Device.prototype.getCache = function (cache) {
	return this._cache;
};

Device.prototype._sendAxCDiff = function (axno, axcache) {
	var cdiff = {
		"axes": map(this.axes, function () { return {}; })
	};
	cdiff["axes"][axno] = axcache;
	this.app.send({
		"action": "update_cache",
		"cache_diff": cdiff
	});
};

Device.prototype._sendAxMoveTask = function (axno, pos_rel) {
	var pdata = map(this.axes, function (i, a) {})
	pdata[axno] = pos_rel;
	this.app.send({
		"action": "run_task",
		"task": {
			"type": "move",
			"pos_rel": pdata
		}
	});
};

Device.prototype.setSensorsState = function (sens) {
	map(this.axes, function (i, ax) {
		ax.setSensorsState(sens[i]);
	}.bind(this));
};

Device.prototype.Status = {
	ERROR: 0,
	WARNING: 1,
	IDLE: 2,
	BUSY: 3
};

Device.prototype.setStatus = function (stat, info) {
	var elem = ecl(this.elem, "t_device_status_value");
	map(["ccol_good", "ccol_warn", "ccol_error", "ccell_active"], function (i, col) {
		elem.classList.remove(col);
	}.bind(this));
	if (stat == this.Status.ERROR) {
		elem.classList.add("ccol_error");
	} else if (stat == this.Status.WARNING) {
		elem.classList.add("ccol_warn");
	} else if (stat == this.Status.IDLE) {
		elem.classList.add("ccol_good");
	} else if (stat == this.Status.BUSY) {
		elem.classList.add("ccell_active");
	}
	elem.innerText = info;
};

Device.prototype.setState = function (info) {
	if (info["status"] == "idle") {
		this.setStatus(this.Status.IDLE, info["status"]);
	} else if (info["status"] == "busy") {
		this.setStatus(this.Status.BUSY, info["status"]);
	} else {
		this.setStatus(this.Status.WARNING, "unknown");
	}
	ecl(this.elem, "t_device_status_tasks_in_queue").innerText = info["tasks"]["count"];
	ecl(this.elem, "t_device_status_current_task").innerText = info["tasks"]["current"];
};

Device.prototype.completeTask = function (task) {
	if (task["type"] == "scan" || task["type"] == "calib") {
		this.axes[task["axis"]].completeTask(task)
	}
};
