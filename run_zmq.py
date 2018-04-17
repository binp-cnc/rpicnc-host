import time
import json
import os
import traceback

import zmq

import logging as log
log.basicConfig(level=log.DEBUG, format="[%(levelname)s] %(message)s")

import cnc

cnc.init()

context = zmq.Context()
socket = context.socket(zmq.PAIR)
socket.bind("tcp://*:5556")

poller = zmq.Poller()
poller.register(socket, zmq.POLLOUT)

log.info("server started")

while True:
	msg = socket.recv().decode("utf-8")
	log.debug("received: '%s'" % msg)
	req = json.loads(msg)

	try:
		res = cnc.handle(req)
	except Exception:
		log.warning("error handle request")
		log.warning(traceback.format_exc())

	msg = json.dumps(res).encode("utf-8")
	
	if socket in dict(poller.poll(5000)):
		socket.send(msg)
		log.debug("sent: '%s'" % msg.decode("utf-8"))
	else:
		log.error("cannot send response")

cnc.quit()

log.info("server stopped")
