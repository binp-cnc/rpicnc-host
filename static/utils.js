function map(arr, func) {
	var out = [];
	for (var i = 0; i < arr.length; ++i) {
		out.push(func(i, arr[i]));
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

