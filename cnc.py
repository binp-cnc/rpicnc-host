import os

from ctypes import *

import logging as log
log.basicConfig(level=log.DEBUG, format="[%(levelname)s] %(message)s")


libcnc = None


def init():
	global libcnc
	libcnc = cdll.LoadLibrary(os.getcwd() + "/librpicnc/build/cnc.so")
	libcnc.cnc_init()

def quit():
	global libcnc
	libcnc.cnc_quit()
	ibcnc = None

def handle(req):
	global libcnc

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
