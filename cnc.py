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
	def __init__(self, config, dummy=False):
		self.config = config
		self._lib = None
		self.dummy = dummy

	def __enter__(self):
		if self.dummy:
			return self

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
		if self.dummy:
			return 

		r = self._lib.cnc_quit()
		if r != 0:
			raise CNCException("cnc_quit error")

		self._lib = None

	def handle(self, req):
		res = {
			"type": req["type"],
			"status": "bad_type",
		}

		if req["type"] == "connect":
			res["status"] = "ok"

		if req["type"] == "disconnect":
			res["status"] = "ok"

		if req["type"] == "get_config":
			res["config"] = self.config
			res["status"] = "ok"

		return res
