function TrackCanvas(elem, editor) {
	Item.call(this, elem);
	this.editor = editor;

	this.border_p = 20; //border size, px
	this.vcs_p = 20; // vertical control size, px
	this.safe_s = 500; // safe distance from borders, steps
	this.as_p = 20; // arrow size, px

	this.track = false;
	this.zone = 0;

	var getMousePos = function (event) {
		var x_p = event.pageX - this.elem.offsetLeft;
		var y_p = event.pageY - this.elem.offsetTop;
		return [x_p, y_p];
	}.bind(this);
	
	var moveTarget = function (p_p) {
		var acs = this.editor.axis_ctrls;

		if (this.zone == 0) {
			if (acs.length < 2) { return; }
			var p_s = this._PtoS(p_p);

			p_s[0] = clamp(p_s[0], this.safe_s, this.sx_s - this.safe_s);
			p_s[1] = clamp(p_s[1], this.safe_s, this.sy_s - this.safe_s);

			acs[0].move_abs.setValue(p_s[0]);
			acs[0].move_abs.update();
			acs[1].move_abs.setValue(p_s[1]);
			acs[1].move_abs.update();

		} else if (this.zone == 1) {
			if (acs.length < 3) { return; }
			var z_s = this._zPtoS(p_p[1]);

			z_s = clamp(z_s, this.safe_s, this.sz_s - this.safe_s);

			acs[2].move_abs.setValue(z_s);
			acs[2].move_abs.update();
		}

		this.draw();
	}.bind(this);

	this.elem.addEventListener("mousedown", function (event) {
		this.track = true;
		var p_p = getMousePos(event);
		if (this.editor.axis_ctrls.length < 3 || p_p[0] < 1.5*this.border_p + this.w_p) {
			this.zone = 0;
		} else {
			this.zone = 1;
		}
		moveTarget(p_p);
	}.bind(this));
	this.elem.addEventListener("mouseup", function () {
		this.track = false;
	}.bind(this));
	this.elem.addEventListener("mouseout", function () {
		this.track = false;
	}.bind(this));
	this.elem.addEventListener("mousemove", function (event) {
		if (this.track) {
			moveTarget(getMousePos(event));
		}
	}.bind(this));
}

TrackCanvas.prototype = Object.create(Item.prototype);
TrackCanvas.prototype.constructor = TrackCanvas;

TrackCanvas.prototype._StoP = function(p_s) {
	var x_s = p_s[0], y_s = p_s[1];

	var x_p = (this.cx_p - this.sx_p/2) + x_s*this.sp;
	var y_p = (this.cy_p + this.sy_p/2) - y_s*this.sp;
	return [x_p, y_p];
};

TrackCanvas.prototype._PtoS = function(p_p) {
	var x_p = p_p[0], y_p = p_p[1];
	var x_s = (x_p - (this.cx_p - this.sx_p/2))/this.sp;
	var y_s = -(y_p - (this.cy_p + this.sy_p/2))/this.sp;
	return [x_s, y_s];
};

TrackCanvas.prototype._zStoP = function(z_s) {
	var z_p = (this.cz_p + this.sz_p/2) - z_s*this.spz;
	return z_p;
};

TrackCanvas.prototype._zPtoS = function(z_p) {
	var z_s = -(z_p - (this.cz_p + this.sz_p/2))/this.spz;
	return z_s;
};

TrackCanvas.prototype.refresh = function () {
	var border_p = this.border_p;
	var vcs_p = this.vcs_p;
	var safe_s = this.safe_s;

	var cnv = this.elem;

	var acs = this.editor.axis_ctrls;
	var axes = map(acs, function (i, ac) { return ac.axis; });
	if (axes.length < 2) { return; } 
	
	var w_p = cnv.width - 3*border_p - vcs_p, h_p = cnv.height - 2*border_p;
	var cx_p = border_p + w_p/2, cy_p = border_p + h_p/2;
	var sx_s = axes[0].getCache()["len"], sy_s = axes[1].getCache()["len"];
	var sp = Math.min(1.0*w_p/sx_s, 1.0*h_p/sy_s);
	var sx_p = sx_s*sp, sy_p = sy_s*sp;
	var sxs_p = (sx_s - safe_s)*sp, sys_p = (sy_s - safe_s)*sp;

	this.w_p = w_p;
	this.h_p = h_p;
	this.cx_p = cx_p;
	this.cy_p = cy_p;
	this.sx_s = sx_s;
	this.sy_s = sy_s;
	this.sp = sp;
	this.sx_p = sx_p;
	this.sy_p = sy_p;
	this.sxs_p = sxs_p;
	this.sys_p = sys_p;

	if (axes.length < 3) { return; }

	var sz_s = axes[2].getCache()["len"];
	var spz = 1.0*h_p/sz_s;
	var cz_p = cy_p;
	var sz_p = sz_s*spz;
	var szs_p = (sz_s - safe_s)*spz;
	var czx_p = 2*border_p + w_p + vcs_p/2;

	this.sz_s = sz_s;
	this.spz = spz;
	this.cz_p = cz_p;
	this.sz_p = sz_p;
	this.szs_p = szs_p;
	this.czx_p = czx_p;
};

TrackCanvas.prototype.draw = function () {
	var cnv = this.elem;
	var ctx = cnv.getContext("2d");

	var acs = this.editor.axis_ctrls;
	var axes = map(acs, function (i, ac) { return ac.axis; });
	if (axes.length < 2) { return; } 

	var drawRectP = function (l_p, h_p) {
		ctx.beginPath();
		ctx.rect(l_p[0], l_p[1], h_p[0] - l_p[0], h_p[1] - l_p[1]);
		ctx.stroke();
		ctx.beginPath();
	}.bind(this);

	var drawRectS = function (l_s, h_s) {
		var l_p = this._StoP(l_s);
		var h_p = this._StoP(h_s);
		drawRectP(l_p, h_p);
	}.bind(this);

	var drawArrowP = function (p_p, as_p) {
		var px_p = p_p[0], py_p = p_p[1];
		
		ctx.beginPath();
		ctx.moveTo(px_p - as_p, py_p);
		ctx.lineTo(px_p + as_p, py_p);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(px_p, py_p - as_p);
		ctx.lineTo(px_p, py_p + as_p);
		ctx.stroke();

		ctx.beginPath();
	}.bind(this);

	var drawArrowS = function (p_s, as_p) {
		var p_p = this._StoP(p_s);
		drawArrowP(p_p, as_p);
	}.bind(this);

	var drawLineP = function (f_p, t_p) {
		ctx.beginPath();
		ctx.moveTo(f_p[0], f_p[1]);
		ctx.lineTo(t_p[0], t_p[1]);
		ctx.stroke()
		ctx.beginPath();
	}.bind(this);

	var drawLineS = function (f_s, t_s) {
		var f_p = this._StoP(f_s);
		var t_p = this._StoP(t_s);
		drawLineP(f_p, t_p);
	}.bind(this);

	ctx.clearRect(0,0,cnv.width,cnv.height);
	ctx.lineWidth = 2;

	// all area
	ctx.strokeStyle = "#FF0000";
	drawRectS([0, 0], [this.sx_s, this.sy_s]);

	// safe area
	ctx.strokeStyle = "#FFFF00";
	drawRectS([this.safe_s, this.safe_s], [this.sx_s - this.safe_s, this.sy_s - this.safe_s]);

	var c_s = [
		axes[0].getCache()["pos"],
		axes[1].getCache()["pos"]
	];
	var t_s = [
		c_s[0] + (parseInt(acs[0].move_rel.getValue()) || 0),
		c_s[1] + (parseInt(acs[1].move_rel.getValue()) || 0)
	];
	// target pointer
	ctx.strokeStyle = "#00FF00";
	drawArrowS(t_s, this.as_p/2);

	// path to pointer
	ctx.strokeStyle = "#00FF00";
	drawLineS(c_s, t_s);

	// current pointer
	ctx.strokeStyle = "#FFFF00";
	drawArrowS(c_s, this.as_p);

	if (axes.length < 3) { return; }
	var lx_p, ly_p, hx_p, hy_p;

	// all area
	ctx.strokeStyle = "#FF0000";
	lx_p = this.czx_p - this.vcs_p/2;
	hx_p = this.czx_p + this.vcs_p/2;
	ly_p = this._zStoP(0);
	hy_p = this._zStoP(this.sz_s);
	drawLineP([lx_p, ly_p], [hx_p, ly_p]);
	drawLineP([lx_p, hy_p], [hx_p, hy_p]);
	
	// safe area
	ctx.strokeStyle = "#FFFF00";
	lx_p = this.czx_p - this.vcs_p/4;
	hx_p = this.czx_p + this.vcs_p/4;
	ly_p = this._zStoP(this.safe_s);
	hy_p = this._zStoP(this.sz_s - this.safe_s);
	drawLineP([lx_p, ly_p], [hx_p, ly_p]);
	drawLineP([lx_p, hy_p], [hx_p, hy_p]);

	var cz_s = axes[2].getCache()["pos"];
	var tz_s = cz_s + (parseInt(acs[2].move_rel.getValue()) || 0);

	// target pointer
	ctx.strokeStyle = "#00FF00";
	drawArrowP([this.czx_p, this._zStoP(tz_s)], this.as_p/2);

	// path to pointer
	ctx.strokeStyle = "#00FF00";
	drawLineP([this.czx_p, this._zStoP(tz_s)], [this.czx_p, this._zStoP(cz_s)]);

	// current pointer
	ctx.strokeStyle = "#FFFF00";
	drawArrowP([this.czx_p, this._zStoP(cz_s)], this.as_p/2);
};

function Editor(app) {
	Item.call(this, template("T_Editor"));
	this.app = app;

	this.axis_ctrls = [];
	this.canvas = new TrackCanvas(ecl(this.elem, "t_canvas"), this);

	this.mode2d = new Button(ecl(this.elem, "t_mode_2d"), function () {
		this.mode2d.elem.classList.remove("ccellbtn_inactive");
		this.mode3d.elem.classList.add("ccellbtn_inactive");
	}.bind(this));
	this.mode3d = new Button(ecl(this.elem, "t_mode_3d"), function () {
		this.mode2d.elem.classList.add("ccellbtn_inactive");
		this.mode3d.elem.classList.remove("ccellbtn_inactive");
	}.bind(this));

	this.move = new Button(ecl(this.elem, "t_move"), function () {
		this.app.device._sendMoveTask(map(this.axis_ctrls, function (i, ac) {
			var v = parseInt(ac.move_rel.getValue());
			ac.move_rel.setValue(0);
			return v;
		}));
	}.bind(this));
}
Editor.prototype = Object.create(Item.prototype);
Editor.prototype.constructor = Editor;

Editor.prototype.setConfig = function (axes) {
	var axcon = ecl(this.elem, "t_axis_controls");
	clear(axcon);
	this.axis_ctrls = map(axes, function (i, ax) {
		var axc = new AxisControl(this.app, this, ax);
		axcon.appendChild(axc.elem);
		return axc;
	}.bind(this));
};

Editor.prototype.refresh = function () {
	map(this.axis_ctrls, function (i, ac) {
		ac.refresh();
	}.bind(this));
	this.canvas.refresh();
	this.draw();
};


Editor.prototype.draw = function () {
	this.canvas.draw();
};