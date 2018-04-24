
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
		this.scan = new Button(ecl(this.elem, "t_axis_" + key), function () {
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
			this._cache[key] = val;
			var cdiff = {};
			cdiff[key] = val;
			this.dev._sendAxCDiff(this.num, cdiff);
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
	if (task["type"] == "scan") {
		this.pos.setValue(0);
		this.len.setValue(task["length"]);
	}
}

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

	this.app.send({"action": "get_cache"});
	this.app.send({"action": "get_device_state"});
	this.app.send({"action": "get_sensors_state"});
}

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
}

Device.prototype.setSensorsState = function (sens) {
	map(this.axes, function (i, ax) {
		ax.setSensorsState(sens[i]);
	}.bind(this));
}

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
}

Device.prototype.completeTask = function (task) {
	if (task["type"] == "scan" || task["type"] == "calib") {
		this.axes[task["axis"]].completeTask(task)
	}
}

function App() {
	this.ws = null;
	this.wscbs = {};
	this.wswd = null;

	this.items = {};
	this.stage = this.Stage.INIT;
	this.config = {};
	this.cache = {};
}
App.prototype.constructor = App;

App.prototype.Stage = {
	INIT: 0,
	CONFIG: 1,
	OPERATE: 2
};

App.prototype.init = function () {
	this.device = new Device(this);
	var device_frame = eid("device_frame");
	clear(device_frame);
	device_frame.appendChild(this.device.elem);


	this.editor = {
		"mode": {
			"2d": new Button(eid("canvas_mode_2d"), function () {
				this.items.editor.mode["2d"].elem.classList.remove("ccellbtn_inactive");
				this.items.editor.mode["3d"].elem.classList.add("ccellbtn_inactive");
			}.bind(this)),
			"3d": new Button(eid("canvas_mode_3d"), function () {
				this.items.editor.mode["2d"].elem.classList.add("ccellbtn_inactive");
				this.items.editor.mode["3d"].elem.classList.remove("ccellbtn_inactive");
			}.bind(this))
		}
	};

	this.wscbs = {
		"message": function (event) {
			console.log("[recv]: " + event.data);
			msg = JSON.parse(event.data);
			if (this.stage == this.Stage.INIT) {
				if (msg["action"] == "accept") {
					this.stage = this.Stage.CONFIG;
					console.log("successfully connected");
					this.send({"action": "get_config"});
				} else if (msg["action"] == "refuse") {
					console.error("connection error: " + msg["reason"]);
				}
			} else if (this.stage == this.Stage.CONFIG) {
				if (msg["action"] == "set_config") {
					console.log("config received");
					this.stage = this.Stage.OPERATE;
					this.device.setConfig(msg["config"]);
				}
			} else if (this.stage == this.Stage.OPERATE) {
				if (msg["action"] == "set_cache") {
					this.device.setCache(msg["cache"]);
				} else if (msg["action"] == "set_device_state") {
					this.device.setState(msg);
				} else if (msg["action"] == "set_sensors_state") {
					this.device.setSensorsState(msg["sensors"]);
				} else if (msg["action"] == "complete_task") {
					this.device.completeTask(msg["task"]);
				}
			}
		}.bind(this),
		"open": function (event) {
			console.log("ws open");
			this.send({"action": "connect"});
		}.bind(this),
		"close": function (event) {
			console.log("ws close");
			this.device.setStatus(Device.prototype.Status.ERROR, "not connected");
		}.bind(this),
		"error": function (event) {
			console.log("ws error");
			this.device.setStatus(Device.prototype.Status.ERROR, "error");
		}.bind(this)
	};
};

App.prototype.quit = function () {
	this.send({"action": "disconnect"});
	this.disconnect();

	this.ws = null;
	this.items = {};
	this.stage = this.Stage.INIT;
	this.config = {};
	this.cache = {};
};

App.prototype.connect = function () {
	this.disconnect();

	var url = window.location;
	var ws = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws");
	if (!ws) {
		console.error("Your browser doesn't support WebSockets");
	}
	map_dict(this.wscbs, function (k, v) {
		ws.addEventListener(k, v);
	});
	
	this.ws = ws;
};

App.prototype.disconnect = function () {
	if (this.ws && this.ws.readyState < 2) {
		this.ws.close();
	}
	this.stage = this.Stage.INIT;
};

App.prototype.send = function (message) {
	if (this.ws && this.ws.readyState < 2) {
		var msgstr = JSON.stringify(message);
		this.ws.send(msgstr);
		console.log("[send]: " + JSON.stringify(message));
	}
};

App.prototype.run = function () {
	var startConnect = function () {
		if (!this.ws || this.ws.readyState != 1) {
			this.disconnect();
			this.connect();
		}
		return setTimeout(startConnect, 10000);
	}.bind(this);
	this.wswd = startConnect();
};

app = new App();

window.addEventListener("load", function() {
	app.init();
	app.run();
}.bind(app));

window.addEventListener("beforeunload", function () {
	app.quit();
}.bind(app));