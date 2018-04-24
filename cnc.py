import os
import json
from queue import Queue

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
		self.lib = None

		self.peer = None

		self.dummy = dummy

		self.cache = None
		self.load_cache()

		self.sens = 0

		self.task_queue = Queue()

	def load_cache(self):
		try:
			with open("cache.json", "r") as f:
				self.cache = json.load(f)
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
				})

		self.store_cache()

	def store_cache(self):
		with open("cache.json", "w") as f:
			json.dump(self.cache, f, indent="\t")

	def __enter__(self):
		if self.dummy:
			return self

		self.lib = lib.load(os.getcwd() + "/librpicnc/build/cnc.so")
		
		c_axesinfo = (lib.AxisInfo*len(self.config["axes"]))()
		for i, axis in enumerate(self.config["axes"]):
			pins = axis["pins"]
			c_axesinfo[i] = lib.AxisInfo(
				pins["step"],
				pins["dir"],
				pins["left"],
				pins["right"]
			)

		r = self.lib.cnc_init(len(c_axesinfo), c_axesinfo)
		if r != 0:
			raise CNCException("cnc_init error")

		return self

	def __exit__(self, *args):
		if self.dummy:
			return 

		r = self.lib.cnc_quit()
		if r != 0:
			raise CNCException("cnc_quit error")

		self.lib = None

	def poll(self):
		if self.peer is None:
			return

		# check sensors state
		sens = 0
		if not self.dummy:
			sens = int(self.lib.cnc_read_sensors())
		if sens != self.sens:
			self.sens = sens
			self._send_sensors_state()

		# check for complete tasks
		rts = 0
		if not self.dummy:
			rts = self.lib.cnc_is_busy()
		qts = self.task_queue.qsize()

		updstat = False
		for i in range(qts - rts):
			ti, task = self.task_queue.get_nowait()
			updstat = True

			if ti["type"] == "scan":
				axc = self.cache["axes"][ti["axis"]]
				axc["pos"] = 0
				axc["len"] = task._task.scan.length
				self._send_cache()

				ti["length"] = task._task.scan.length

			elif ti["type"] == "calib":
				axc = self.cache["axes"][ti["axis"]]
				axc["pos"] = 0
				axc["vel_init"] = task._task.calib.vel_ini
				#axc["vel_max"] = task._task.calib.vel_max
				#axc["acc_max"] = task._task.calib.acc_max
				self._send_cache()

				ti["vel_init"] = task._task.calib.vel_ini
				#ti["vel_max"] = task._task.calib.vel_max
				#ti["acc_max"] = task._task.calib.acc_max

			self.peer.send({
				"action": "complete_task",
				"task": ti
			})

		if updstat:
			self._send_device_state()

	def _send_device_state(self):
		self.peer.send({
			"action": "set_device_state",
			"status": "busy" if self.task_queue.qsize() > 0 else "idle",
			"tasks": {
				"count": self.task_queue.qsize()
			}
		})

	def _send_sensors_state(self):
		ss = [(self.sens>>(2*i))&3 for i in range(len(self.config["axes"]))]
		self.peer.send({
			"action": "set_sensors_state",
			"sensors": [(s&1, s>>1) for s in ss],
		})

	def _send_cache(self):
		self.peer.send({
			"action": "set_cache",
			"cache": self.cache
		})

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
			self._send_cache()
			return

		if req["action"] == "update_cache":
			cache = req["cache_diff"]
			for sc, c in zip(self.cache["axes"], cache["axes"]):
				if c is not None:
					sc.update(c)
			self.store_cache()
			return

		if req["action"] == "get_device_state":
			self._send_device_state()
			return

		if req["action"] == "get_sensors_state":
			self._send_sensors_state()
			return

		if req["action"] == "stop_device":
			if not self.dummy:
				self.lib.cnc_stop()
			while self.task_queue.qsize() > 0:
				self.task_queue.get_nowait()
			self._send_device_state()
			return

		if req["action"] == "run_task":
			ti = req["task"]
			
			if ti["type"] == "scan":
				ac = self.cache["axes"][ti["axis"]]
				print(ac)
				task = lib.Task(
					lib.TASK_SCAN,
					ti["axis"],
					ac["vel_init"],
					ac["vel_max"],
					ac["acc_max"],
				)
				print(task._task.scan.vel_ini)
			elif ti["type"] == "calib":
				ac = self.cache["axes"][ti["axis"]]
				print(ac)
				task = lib.Task(
					lib.TASK_CALIB,
					ti["axis"],
					ac["vel_init"],
				)
				print(task._task.scan.vel_ini)

			self.task_queue.put_nowait((ti, task))
			if not self.dummy:
				self.lib.cnc_push_task(task)
				self.lib.cnc_run_async()
			self._send_device_state()

			return
