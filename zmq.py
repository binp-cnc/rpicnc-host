import zmq
import time
import json
import os
import traceback
import logging as log
from ctypes import *

log.basicConfig(level=log.DEBUG, format="[%(levelname)s] %(message)s")


libcnc = cdll.LoadLibrary(os.getcwd() + "/librpicnc/build/cnc.so")


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
			c_int32(req["pos"][0]), c_int32(req["pos"][1]),
			c_float(req["ivel"][0]), c_float(req["ivel"][1]),
			c_float(req["vel"][0]), c_float(req["vel"][1]),
			c_float(req["acc"][0]), c_float(req["acc"][1]),
		]
		libcnc.cnc_move(*args)
		res.update({
			"pos": req["pos"],
			"status": "ok"
		})

	return res


context = zmq.Context()
socket = context.socket(zmq.PAIR)
socket.bind("tcp://*:5556")

poller = zmq.Poller()
poller.register(socket, zmq.POLLOUT)

libcnc.cnc_init()

log.info("server started")

while True:
	msg = socket.recv().decode("utf-8")
	log.debug("received: '%s'" % msg)
	req = json.loads(msg)

	try:
		res = handle(req)
	except Exception:
		log.warning("error handle request")
		log.warning(traceback.format_exc())

	msg = json.dumps(res).encode("utf-8")
	
	if socket in dict(poller.poll(5000)):
		socket.send(msg)
		log.debug("sent: '%s'" % msg.decode("utf-8"))
	else:
		log.error("cannot send response")

libcnc.cnc_quit()

log.info("server stopped")
