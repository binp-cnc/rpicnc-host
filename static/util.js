function map(arr, func) {
	var out = Array(arr.length);
	for (var i = 0; i < arr.length; ++i) {
		out[i] = func(i, arr[i]);
	}
	return out;
}

function map_range(num, func) {
	var out = Array(num);
	for (var i = 0; i < num; ++i) {
		out[i] = func(i);
	}
	return out;
}

function map_dict(dict, func) {
	var out = {};
	for (var key in dict) {
		if (dict.hasOwnProperty(key)) {
			out[key] = func(key, dict[key]);
		}
	}
	return out;
}

function eid(id) {
	return document.getElementById(id);
}

function ecls(node, cl) {
	return node.getElementsByClassName(cl);
}

function ecl(node, cl) {
	return ecls(node, cl)[0];
}

function clear(node) {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

function template(cl) {
	return eid("templates").querySelector("#templates > ." + cl).cloneNode(true)
}

function cast(type, val) {
	switch (type) {
		case "int": return parseInt(val);
		case "float": return parseFloat(val);
		case "str": return "" + val;
	}
	console.error("unknown type '" + type + "'");
	return val;
}

function clamp(v, l, h) {
	if (v < l) {
		return l;
	} else if (v > h) {
		return h;
	} else {
		return v;
	}
}
