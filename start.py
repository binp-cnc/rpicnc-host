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

	if req["type"] == "init":
		libcnc.cnc_init()
		return { "status": "ok" }

	if req["type"] == "quit":
		libcnc.cnc_quit()
		return { "status": "ok" }

	elif req["type"] == "scan":
		if req["axis"] == "x":
			libcnc.cnc_scan_x()
		elif req["axis"] == "y":
			libcnc.cnc_scan_y()
		return { "status": "ok" }

	elif req["type"] == "center":
		libcnc.cnc_center()
		return { "status": "ok" }

	return { "status": "bad_type" }


context = zmq.Context()
socket = context.socket(zmq.PAIR)
socket.bind("tcp://*:5556")

poller = zmq.Poller()
poller.register(socket, zmq.POLLOUT)

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
	
	if socket in dict(poller.poll(4000)):
		socket.send(msg)
		log.debug("sent: '%s'" % msg.decode("utf-8"))
	else:
		log.error("cannot send response")
