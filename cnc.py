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

		self.peer = None

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

	def poll(self):
		pass

	def disconnect(self, peer):
		if peer is self.peer:
			self.peer = None

	def handle(self, peer, req):
		print(req)
		
		if req["action"] == "connect":
			if self.peer is None:
				self.peer = peer
			if peer is self.peer:
				peer.send({"action": "accept"})
			else:
				peer.send({
					"action": "refuse", 
					"reason": "another_connection"
				})
			return

		if peer is not self.peer:
			return

		if req["action"] == "disconnect":
			self.disconnect(peer)
			return

		if req["action"] == "get_config":
			peer.send({
				"action": "set_config",
				"config": self.config
			})
			return

		if req["action"] == "get_device_status":
			peer.send({
				"device_status": "idle"
			})
			return

		if req["action"] == "stop_device":
			if not self.dummy:
				self._lib.cnc_stop()
			return
