websocket = null;

window.onload = function () {
	var url = window.location;
	var ws = new WebSocket("ws://" + url.hostname + ":" + url.port + "/ws");
	if (!ws) {
		alert("Your browser doesn't support WebSockets");
	}
	websocket = ws;

	ws.onmessage = function (event) {
		console.log(event.data);
		msg = JSON.parse(event.data);
		if (msg.axis == "x") {
			document.getElementsByName("cpos_x")[0].value = msg.pos;
			document.getElementsByName("size_x")[0].value = msg.size;
		} else if (msg.axis == "y") {
			document.getElementsByName("cpos_y")[0].value = msg.pos;
			document.getElementsByName("size_y")[0].value = msg.size;
		}
	};
	ws.onopen = function (event) {
		ws.send(JSON.stringify({"type": "init"}));
	};
};

window.onload = function () {
	document.getElementById("scan_x").onclick = function () {
		ws.send(JSON.stringify({"type": "scan", "axis": "x"}));
	};
	document.getElementById("scan_y").onclick = function () {
		ws.send(JSON.stringify({"type": "scan", "axis": "y"}));
	};
	document.getElementById("move").onclick = function () {
		ws.send(JSON.stringify({
			"type": "move",
			"pos": [document.getElementsByName("pos_x")[0].value, document.getElementsByName("pos_y")[0].value],
			"ivel": [document.getElementsByName("ivel_x")[0].value, document.getElementsByName("ivel_y")[0].value],
			"vel": [document.getElementsByName("vel_x")[0].value, document.getElementsByName("vel_y")[0].value],
			"acc": [document.getElementsByName("acc_x")[0].value, document.getElementsByName("acc_y")[0].value]
		}));
	};
};
