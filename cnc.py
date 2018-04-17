import os
import json

import ctypes

import logging as log
log.basicConfig(level=log.DEBUG, format="[%(levelname)s] %(message)s")

import lib


class CNCException(Exception):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)

class CNC:
	def __init__(self, config):
		self.config = config
		self._lib = None

	def __enter__(self):
		self._lib = lib.load(os.getcwd() + "/librpicnc/build/cnc.so")
		
		c_axesinfo = (lib.AxisInfo*len(self.config["axes"]))()
		for i, axis in enumerate(self.config["axes"]):
			pins = axis["pins"]
			c_axesinfo[i] = lib.AxisInfo(
				pins["step"],
				pins["dir"],
				pins["left"],
				pins["right"]
			)

		r = self._lib.cnc_init(len(c_axesinfo), c_axesinfo)
		if r != 0:
			raise CNCException("cnc_init error")

		return self

	def __exit__(self, *args):
		r = self._lib.cnc_quit()
		if r != 0:
			raise CNCException("cnc_quit error")

		self._lib = None

	def handle(self, req):

		res = {
			"type": req["type"],
			"status": "bad_type",
		}

		if req["type"] == "init":
			res["status"] = "ok"

		if req["type"] == "quit":
			res["status"] = "ok"

		elif req["type"] == "scan":
			if req["axis"] == "x":
				s = libcnc.cnc_scan_x()
			elif req["axis"] == "y":
				s = libcnc.cnc_scan_y()
			res.update({
				"axis": req["axis"],
				"size": s,
				"pos": 0,
				"status": "ok"
			})

		elif req["type"] == "move":
			args = [
				c_int32(int(req["pos"][0])), c_int32(int(req["pos"][1])),
				c_float(float(req["ivel"][0])), c_float(float(req["ivel"][1])),
				c_float(float(req["vel"][0])), c_float(float(req["vel"][1])),
				c_float(float(req["acc"][0])), c_float(float(req["acc"][1])),
			]
			libcnc.cnc_move(*args)
			res.update({
				"pos": req["pos"],
				"status": "ok"
			})

		return res
