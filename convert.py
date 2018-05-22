import ctypes
from math import sqrt	

import lib


class Converter:
	def _convertcmd(cmd):
		args = []
		if cmd["type"] == "none":
			args.append(lib.CMD_NONE)

		elif cmd["type"] == "idle":
			args.append(lib.CMD_IDLE)

		elif cmd["type"] == "wait":
			args.append(lib.CMD_WAIT)
			args.append(cmd["diration"])

		elif cmd["type"] == "sync":
			args.append(lib.CMD_SYNC)
			args.append(cmd["id"])
			args.append(cmd["count"])

		elif cmd["type"].startswith("move"):
			args.append(lib.CMD_MOVE)
			margs = []

			if cmd["type"] == "move_vel":
				args.append(lib.CMD_MOVE_VEL)
				margs.append(cmd["period"])

			elif cmd["type"] == "move_acc":
				args.append(lib.CMD_MOVE_ACC)
				margs.append(cmd["begin_period"])
				margs.append(cmd["end_period"])

			elif cmd["type"] == "move_sin":
				args.append(lib.CMD_MOVE_SIN)
				margs.append(cmd["begin"])
				margs.append(cmd["size"])
				margs.append(cmd["period"])

			args.append(cmd["dir"])
			args.append(cmd["steps"])
			args.extend(margs)

		return lib.Cmd(*args)

	def __init__(self, cache):
		self.cache = cache

	def convert(self, task_info):
		data = [[] for _ in range(lib.MAX_AXES)]

		if task_info["type"] == "cmds":
			for i, acmds in enumerate(task_info["cmds"]):
				data[i] = [Converter._convertcmd(cmd) for cmd in acmds]

		elif task_info["type"] == "move":
			for ac, pr, acmds in zip(self.cache["axes"], task_info["pos_rel"], data):
				try:
					pr = int(pr)
				except TypeError:
					pr = 0
				d = pr > 0
				dist = int(abs(pr))
				if dist == 0:
					continue

				dt = (ac["vel_max"] - ac["vel_init"])/ac["acc_max"]
				acc_dist = int((ac["vel_init"] + 0.5*ac["acc_max"]*dt)*dt)

				rvi = int(1e6/ac["vel_init"] if ac["vel_init"] >= 1.0 else 0)
				rvm = int(1e6/ac["vel_max"])

				if 2*acc_dist < dist:
					acmds.extend([
						lib.Cmd(lib.CMD_MOVE, lib.CMD_MOVE_ACC, d, acc_dist, rvi, rvm),
						lib.Cmd(lib.CMD_MOVE, lib.CMD_MOVE_VEL, d, dist - 2*acc_dist, rvm),
						lib.Cmd(lib.CMD_MOVE, lib.CMD_MOVE_ACC, d, acc_dist, rvm, rvi),
					])
				else:
					acc_dist = dist//2;
					vel_max_red = sqrt(ac["vel_init"]*ac["vel_init"] + 2.0*ac["acc_max"]*acc_dist)
					rvmr = int(1e6/vel_max_red)
					acmds.extend([
						lib.Cmd(lib.CMD_MOVE, lib.CMD_MOVE_ACC, d, acc_dist, rvi, rvmr),
						lib.Cmd(lib.CMD_MOVE, lib.CMD_MOVE_ACC, d, acc_dist + (dist%2), rvmr, rvi),
					])

		for acmds in data:
			if len(acmds) == 0 or acmds[-1].type_ != lib.CMD_IDLE:
				acmds.append(lib.Cmd(lib.CMD_IDLE))

		task_data = [(lib.Cmd*len(acmds))() for acmds in data]
		for atd, acmds in zip(task_data, data):
			for i, cmd in enumerate(acmds):
				atd[i] = cmd

		task = lib.Task(lib.TASK_CMDS, task_data)

		return task, task_data
