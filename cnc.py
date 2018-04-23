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

		self.cache = None
		self.load_cache();

		self.sens = 0;

	def load_cache(self):
		try:
			with open("cache.json", "r") as f:
				self.cache = json.load(f);
		except (OSError, IOError, json.JSONDecodeError) as e:
			self.cache = {
				"axes": []
			}
			for ax in self.config["axes"]:
				self.cache["axes"].append({
					"pos": 0,
					"len": 1000,
					"vel_init": 100,
					"vel_max": 500,
					"acc_max": 1000
				});

		self.store_cache()

	def store_cache(self):
		with open("cache.json", "w") as f:
			json.dump(self.cache, f, indent="\t")

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

	def _decode_sensors(self, sens):
		ss = [(sens>>(2*i))&3 for i in range(len(self.config["axes"]))]
		return [(s&1, s>>1) for s in ss]

	def poll(self):
		if self.peer is None:
			return

		sens = 0
		if not self.dummy:
			sens = int(self._lib.cnc_read_sensors());
		if sens != self.sens:
			self.peer.send({
				"action": "set_sensors",
				"sensors": self._decode_sensors(sens),
			});
			self.sens = sens

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

		if req["action"] == "get_cache":
			peer.send({
				"action": "set_cache",
				"cache": self.cache
			})
			return

		if req["action"] == "get_tasks":
			count = 0
			if not self.dummy:
				count = self._lib.cnc_is_busy()
			peer.send({
				"action": "set_tasks",
				"count": count,
				"current": "none"
			})
			return

		if req["action"] == "get_sensors":
			self.peer.send({
				"action": "set_sensors",
				"sensors": self._decode_sensors(self.sens),
			});
			return

		if req["action"] == "stop_device":
			if not self.dummy:
				self._lib.cnc_stop()
			return
