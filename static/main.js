function Item(elem, type) {
	this.elem = elem;
}
Item.prototype.constructor = Item;

function Button(elem, action) {
	Item.call(this, elem);
	this.action = action;
	this.elem.addEventListener("click", this.action);
}
Button.prototype = Object.create(Item.prototype);
Button.prototype.constructor = Button;

function ButtonExt(elem, actions) {
	Item.call(this, elem);

	this.actions = actions;
	map_dict(this.actions, function (k, v) {
		this.elem.addEventListener(k, v);
	}.bind(this));
}
ButtonExt.prototype = Object.create(Item.prototype);
ButtonExt.prototype.constructor = ButtonExt;

function ToggleButton(elem, action) {
	Button.call(this, elem, action);
	this._value = false;
	this.elem.removeEventListener("click", this.action);
	this.elem.addEventListener("click", function(event){
		this._value = !this._value;
		this.action(event);
	}.bind(this));
}
ToggleButton.prototype = Object.create(Button.prototype);
ToggleButton.prototype.constructor = ToggleButton;
ToggleButton.prototype.getValue = function () {
	return this._value;
};
ToggleButton.prototype.setValue = function (v) {
	this._value = v;
	this.action();
};

function Label(elem, update) {
	Item.call(this, elem);
	this.update = update;
}
Label.prototype = Object.create(Item.prototype);
Label.prototype.constructor = Label;

function Input(elem, update) {
	Item.call(this, elem);
	this._value = "";
	this.update = update;
	this.elem.addEventListener("change", function (event) {
		this._value = this.elem.value;
		this.update(event);
	}.bind(this));
}
Input.prototype = Object.create(Item.prototype);
Input.prototype.constructor = Input;

Input.prototype.getValue = function () {
	return this._value;
}
Input.prototype.setValue = function (v) {
	this._value = v;
	this.elem.value = v;
}

function Axis(app, elem, num, config) {
	Item.call(this, elem);
	this.app = app;
	this.num = num;
	this.config = config ? config : {};
	this.cache = {};

	if (this.config["name"]) {
		ecl(this.elem, "t_axis_name").innerText = this.config["name"].toUpperCase();
	}

	this.scan = new Button(ecl(this.elem, "t_axis_scan"), function () {
		this.app.send({
			"action": "run_task",
			"task": {
				"id": 0,
				"type": "scan",
				"axis": this.num
			}
		});
	}.bind(this));

	this.calib = new Button(ecl(this.elem, "t_axis_calib"), function () {
		this.app.send({
			"action": "run_task",
			"task": {
				"id": 0,
				"type": "calib",
				"axis": this.num
			}
		});
	}.bind(this));

	this.pos = new Label(ecl(this.elem, "t_pos"));
	this.len = new Label(ecl(this.elem, "t_len"));
	this.vel_init = new Input(ecl(this.elem, "t_vel_init"), function () {
		console.log("change vel_init");
		this.cache["vel_init"] = this.vel_init.getValue();
	}.bind(this));
	this.vel_max = new Input(ecl(this.elem, "t_vel_max"), function () {
		console.log("change vel_max");
		this.cache["vel_max"] = this.vel_max.getValue();
	}.bind(this));
	this.acc_max = new Input(ecl(this.elem, "t_acc_max"), function () {
		console.log("change acc_max");
		this.cache["acc_max"] = this.acc_max.getValue();

		this.app.send({"action": "set_cache"});
	}.bind(this));
}
Axis.prototype = Object.create(Item.prototype);
Axis.prototype.constructor = Axis;

Axis.prototype.getCache = function (cache) {
	var cache = {
		"pos": ecl(this.elem, "t_pos").innerText,
		"len": ecl(this.elem, "t_len").innerText,
		"vel_init": ecl(this.elem, "t_vel_init").value,
		"vel_max": ecl(this.elem, "t_vel_max").value,
		"acc_max": ecl(this.elem, "t_acc_max").value
	};
	return cache;
};
Axis.prototype.setCache = function (cache) {
	ecl(this.elem, "t_pos").innerText = cache["pos"];
	ecl(this.elem, "t_len").innerText = cache["len"];
	ecl(this.elem, "t_vel_init").value = cache["vel_init"];
	ecl(this.elem, "t_vel_max").value = cache["vel_max"];
	ecl(this.elem, "t_acc_max").value = cache["acc_max"];
};

Axis.prototype.setSensors = function (sens) {
	ecl(this.elem, "t_sens_left").classList[sens[0] ? "add" : "remove"]("ccell_active");
	ecl(this.elem, "t_sens_right").classList[sens[1] ? "add" : "remove"]("ccell_active");
};

function Device(app, elem, config) {
	Item.call(this, elem);
	this.app = app;
	this.config = config;

	var axcon = eid("axes");
	clear(axcon);
	this.axes = map(this.config["axes"], function (i, ac) {
		var elem = template("t_axis");
		axcon.appendChild(elem);
		var axis = new Axis(this.app, this, elem, i, ac);
		return axis;
	}.bind(this));
}
Device.prototype = Object.create(Item.prototype);
Device.prototype.constructor = Device;


Stage = {
	INIT: 0,
	CONFIG: 1,
	OPERATE: 2
};

function App() {
	this.ws = null;
	this.wscbs = {};
	this.wswd = null;

	this.items = {};
	this.stage = Stage.INIT;
	this.config = {};
	this.cache = {};

	this.Status = {
		"ERROR": 0,
		"WARNING": 1,
		"IDLE": 2,
		"BUSY": 3
	};
}
App.prototype.constructor = App;

App.prototype.init = function () {
	var device = {};
	var stop = function () {
		console.log("stop_button: down");
		this.send({"action": "stop_device"});
	}.bind(this);
	device.stop_button = new ButtonExt(eid("stop_button"), {"mousedown": stop, "click": stop});
	device.device_status = new Label(eid("device_status"), function (value) {
		this.items.device.device_status.innerText = value;
	}.bind(this));
	this.items["device"] = device;

	var editor = {
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
	this.items["editor"] = editor;

	this.wscbs = {
		"message": function (event) {
			console.log(event.data);
			msg = JSON.parse(event.data);
			if (this.stage == Stage.INIT) {
				if (msg["action"] == "accept") {
					this.stage = Stage.CONFIG;
					console.log("successfully connected");
					this.send({"action": "get_config"});
				} else if (msg["action"] == "refuse") {
					console.error("connection error: " + msg["reason"]);
				}
			} else if (this.stage == Stage.CONFIG) {
				if (msg["action"] == "set_config") {

					this.items["device"] = new Device(this, eid("device"), msg["config"]);

					this.stage = Stage.OPERATE;
					console.log("config received");

					this.send({"action": "get_cache"});
					this.send({"action": "get_tasks"});
					this.send({"action": "get_sensors"});
				}
			} else if (this.stage == Stage.OPERATE) {
				if (msg["action"] == "set_cache") {
					map(this.items.axes, function (i, ax) {
						ax.setCache(msg["cache"]["axes"][i]);
					}.bind(this));
				} else if (msg["action"] == "set_tasks") {
					if (msg["count"] == 0) {
						this.setStatus(this.Status.IDLE, "Idle");
					} else {
						this.setStatus(this.Status.BUSY, "Busy");
					}
					eid("device_status_tasks_in_queue").innerText = msg["count"];
					eid("device_status_current_task").innerText = msg["current"];
				} else if (msg["action"] == "set_sensors") {
					var sens = msg["sensors"];
					map(this.items.axes, function (i, ax) {
						ax.setSensors(sens[i]);
					}.bind(this));
				} else if (msg["action"] == "complete_task") {
					var task = msg["task"];
					if (task["type"] == "scan") {
						// TODO: move to axis
						ecl(this.items["axes"][task["axis"]].elem, "t_pos").innerText = 0;
						ecl(this.items["axes"][task["axis"]].elem, "t_len").innerText = task["length"];
					}
				}
			}
		}.bind(this),
		"open": function (event) {
			console.log("ws open");
			this.send({"action": "connect"});
		}.bind(this),
		"close": function (event) {
			console.log("ws close");
			this.setStatus(this.Status.ERROR, "Not connected");
		}.bind(this),
		"error": function (event) {
			console.log("ws error");
			this.setStatus(this.Status.ERROR, "Error");
		}.bind(this)
	};
};

App.prototype.setStatus = function (stat, info) {
	var elem = eid("device_status_value");
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

App.prototype.quit = function () {
	this.send({"action": "disconnect"});
	this.disconnect();

	this.ws = null;
	this.items = {};
	this.stage = Stage.INIT;
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
	this.stage = Stage.INIT;
};

App.prototype.send = function (message) {
	if (this.ws && this.ws.readyState < 2) {
		this.ws.send(JSON.stringify(message))
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