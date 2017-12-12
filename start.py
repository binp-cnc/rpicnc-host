import zmq
import time


context = zmq.Context()
socket = context.socket(zmq.PAIR)
socket.bind("tcp://*:5556")

while True:
	msg = socket.recv()
	print("[recv] %s" % msg)
	msg = b"host responce"
	socket.send(msg)
	print("[send] %s" % msg)
