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


function Axis(elem, config) {
	Item.call(this, elem);
	this.config = config ? config : {};

	if (this.config["name"]) {
		ecl(this.elem, "t_axis_name").innerText = this.config["name"].toUpperCase();
	}
}
Axis.prototype = Object.create(Item.prototype);
Axis.prototype.constructor = Axis;


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
					this.config = msg["config"];

					console.log("axes");
					var axcon = eid("axes");
					clear(axcon);
					this.items.axes = map(this.config["axes"], function (i, ac) {
						var elem = template("t_axis");
						axcon.appendChild(elem);
						var axis = new Axis(elem, ac);
						return axis;
					});

					this.stage = Stage.OPERATE;
					console.log("config received");
				}
			} else if (this.stage == Stage.OPERATE) {

			}
		}.bind(this),
		"open": function (event) {
			console.log("ws open");
			this.send({"action": "connect"});
		}.bind(this),
		"close": function (event) {
			console.log("ws close");
		}.bind(this),
		"error": function (event) {
			console.log("ws error");
		}.bind(this)
	};
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