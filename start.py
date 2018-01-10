import zmq
import time
import json
import traceback
import logging as log

log.basicConfig(level=log.DEBUG, format="[%(levelname)s] %(message)s")


def handle(req):
	if req["type"] == "init":
		return { "status": "ok" }
	return { "status": "bad_type" }


context = zmq.Context()
socket = context.socket(zmq.PAIR)
socket.bind("tcp://*:5556")

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
	socket.send(msg)
	log.debug("sent: '%s'" % msg)
