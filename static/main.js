function Item(elem, type) {
	this.elem = elem;
}
Item.prototype.constructor = Item;

function Button(elem, action) {
	Item.call(this, elem);
	this.action = action.bind(this);
	this.elem.addEventListener("click", this.action);
}
Button.prototype = Object.create(Item.prototype);
Button.prototype.constructor = Button;

function ButtonExt(elem, actions) {
	Item.call(this, elem);

	this.actions = actions;
	map_dict(this.actions, function (k, v) {
		this.actions[k] = v.bind(this);
	}.bind(this));

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
	this.update = update.bind(this);
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


function wssetup(actions) {
	var url = window.location;
	var ws = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws");
	if (!ws) {
		alert("Your browser doesn't support WebSockets");
	}
	map_dict(actions, function (k, v) {
		ws.addEventListener(k, v);
	});
	return ws;
}


STAGE_INIT = 0;
STAGE_CONFIG = 1;
STAGE_OPERATE = 2;

window.onload = function () {
	var stage = STAGE_INIT;
	var config = {};

	items = {};

	var device = {};
	var stop = function () {
		console.log("stop_button: down");
		ws.send(JSON.stringify({"action": "stop_device"}));
	};
	device["stop_button"] = new ButtonExt(eid("stop_button"), {"mousedown": stop, "click": stop});
	device["device_status"] = new Label(eid("device_status"), function (value) {
		this.innerText = value;
	});
	items["device"] = device;

	var editor = {
		"mode": {
			"2d": new Button(eid("canvas_mode_2d"), function () {
				this.elem.classList.remove("ccellbtn_inactive");
				editor["mode"]["3d"].elem.classList.add("ccellbtn_inactive");
			}),
			"3d": new Button(eid("canvas_mode_3d"), function () {
				this.elem.classList.remove("ccellbtn_inactive");
				editor["mode"]["2d"].elem.classList.add("ccellbtn_inactive");
			})
		}
	};
	items["editor"] = editor;

	var ws = wssetup({
		"message": function (event) {
			console.log(event.data);
			msg = JSON.parse(event.data);
			if (stage == STAGE_INIT) {
				if (msg["action"] == "accept") {
					stage = STAGE_CONFIG;
					console.log("successfully connected");
					ws.send(JSON.stringify({"action": "get_config"}));
				} else if (msg["action"] == "refuse") {
					console.error("connection error: " + msg["reason"]);
				}
			} else if (stage == STAGE_CONFIG) {
				if (msg["action"] == "set_config") {
					var config = msg["config"];

					var axcon = eid("axes");
					clear(axcon);
					items.axes = map(config["axes"], function (i, ac) {
						var elem = template("t_axis");
						axcon.appendChild(elem);
						var axis = new Axis(elem, ac);
						return axis;
					});

					stage = STAGE_OPERATE;
					console.log("config received");
				}
			} else if (stage == STAGE_OPERATE) {

			}
		},
		"open": function (event){
			ws.send(JSON.stringify({"action": "connect"}));
		}
	});
};
