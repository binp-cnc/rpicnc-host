function App() {
	this.ws = null;
	this.wscbs = {};
	this.wswd = null;
	this.stage = this.Stage.INIT;
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

	this.editor = new Editor(this);
	var editor_frame = eid("editor_frame");
	clear(editor_frame);
	editor_frame.appendChild(this.editor.elem);

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
	this.stage = this.Stage.INIT;
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