from ctypes import *

## device.h

MAX_AXES = 8

## command.h

CMD_NONE = 0x00

CMD_IDLE = 0x01
CMD_WAIT = 0x02
CMD_SYNC = 0x03

CMD_MOVE = 0x11
CMD_ACCL = 0x12
CMD_SINE = 0x13

class CmdNone(Structure):
	_fields_ = []

class CmdIdle(Structure):
	_fields_ = []

class CmdWait(Structure):
	_fields_ = [
		("duration", c_uint32), # us
	]

class CmdSync(Structure):
	_fields_ = [
		("id_", c_uint32),
		("count", c_uint32),
	]

class CmdMove(Structure):
	_fields_ = [
		("dir", c_uint8),
		("steps", c_uint32),
		("period", c_uint32), # us
	]

class CmdAccl(Structure):
	_fields_ = [
		("dir", c_uint8),
		("steps", c_uint32),
		("begin_period", c_uint32),
		("end_period", c_uint32),
	]

class CmdSine(Structure):
	_fields_ = [
		("dir_", c_uint8),
		("steps", c_uint32),
		("begin", c_uint32),
		("size", c_uint32),
		("period", c_uint32),
	]

class _CmdUnion(Union):
	_fields_ = [
		("none", CmdNone),
		("wait", CmdWait),
		("sync", CmdSync),
		("move", CmdMove),
		("accl", CmdAccl),
		("sine", CmdSine),
	]

class Cmd(Structure):
	_fields_ = [
		("type_", c_int),
		("_cmd", _CmdUnion),
	]

def cmd_none():
	cmd = Cmd()
	cmd.type_ = CMD_NONE
	return cmd

def cmd_idle():
	cmd = Cmd()
	cmd.type_ = CMD_IDLE
	return cmd

def cmd_wait(duration):
	cmd = Cmd()
	cmd.type_ = CMD_WAIT
	cmd._cmd.wait.duration = duration
	return cmd

def cmd_sync(id_, count):
	cmd = Cmd()
	cmd.type_ = CMD_SYNC
	cmd._cmd.sync.id_ = id_
	cmd._cmd.sync.count = count
	return cmd

def cmd_move(dir_, steps, period):
	cmd = Cmd()
	cmd.type_ = CMD_MOVE
	cmd._cmd.move.dir_ = dir_
	cmd._cmd.move.steps = steps
	cmd._cmd.move.period = period
	return cmd

def cmd_accl(dir_, steps, begin_period, end_period):
	cmd = Cmd()
	cmd.type_ = CMD_ACCL
	cmd._cmd.accl.dir_ = dir_
	cmd._cmd.accl.steps = steps
	cmd._cmd.accl.begin_period = begin_period
	cmd._cmd.accl.end_period = end_period
	return cmd

def cmd_sine(dir_, steps, begin, size, period):
	cmd = Cmd()
	cmd.type_ = CMD_SINE
	cmd._cmd.sine.dir_ = dir_
	cmd._cmd.sine.steps = steps
	cmd._cmd.sine.begin = begin
	cmd._cmd.sine.size = size
	cmd._cmd.sine.period = period
	return cmd


## task.h

TASK_NONE    = 0x00
TASK_SCAN    = 0x01
TASK_CALIB   = 0x02

TASK_CMDS    = 0x10
TASK_GCODE   = 0x11
TASK_CURVE   = 0x12

# task status
TS_NONE = 0x00
TS_WAIT = 0x01
TS_PROC = 0x02
TS_DONE = 0x03
TS_ERROR = 0xF0

# stop codes
SC_DONE         = 0x01
SC_SENS_L       = 0x10
SC_SENS_R       = 0x11
SC_USER_STOP    = 0x20

class TaskNone(Structure):
	_fields_ = []

	def __init__(self):
		super().__init__()

class TaskScan(Structure):
	_fields_ = [
		# in
		("axis", c_int),
		("vel_ini", c_float),
		("vel_max", c_float),
		("acc_max", c_float),
		# out
		("length", c_int),
	]

	def __init__(self, axis, vel_ini, vel_max, acc_max):
		super().__init__()
		self.axis = c_int(axis)
		self.vel_ini = c_float(vel_ini)
		self.vel_max = c_float(vel_max)
		self.acc_max = c_float(acc_max)
		self.length = c_int(0)

class TaskCalib(Structure):
	_fields_ = [
		# in
		("axis", c_int),
		# inout
		("vel_ini", c_float),
		# out
		("vel_max", c_float),
		("acc_max", c_float),
	]

	def __init__(self, axis, vel_ini, vel_max, acc_max):
		super().__init__()
		self.axis = c_int(axis)
		self.vel_ini = c_float(vel_ini)
		self.vel_max = c_float(vel_max)
		self.acc_max = c_float(acc_max)

class TaskCmds(Structure):
	_fields_ = [
		# in
		("cmds_count", c_int*MAX_AXES),
		("cmds", POINTER(Cmd)*MAX_AXES),
		# out
		("cmds_done", c_int*MAX_AXES),
	]

	def __init__(self, cmds_count, cmds):
		super().__init__()
		self.cmds_count = cmds_count
		self.cmds = cmds
		self.cmds_done = c_int(0)

class TaskGCode(Structure):
	_fields_ = []

	def __init__(self):
		super().__init__()

class TaskCurve(Structure):
	_fields_ = []

	def __init__(self):
		super().__init__()

class _TaskUnion(Union):
	_fields_ = [
		("none", TaskNone),
		("scan", TaskScan),
		("calib", TaskCalib),
		("cmds", TaskCmds),
		("gcode", TaskGCode),
		("curve", TaskCurve),
	]

class Task(Structure):
	_fields_ = [
		("type_", c_int),
		("_task", _TaskUnion),
		# out
		("status", c_int),
		("stop_code", c_int),
	]

	def __init__(self, type_, *args):
		super().__init__()
		self.type_ = type_
		if type_ == TASK_NONE:
			self._task.none.__init__(*args)
		elif type_ == TASK_SCAN:
			self._task.scan.__init__(*args)
		elif type_ == TASK_CALIB:
			self._task.calib.__init__(*args)
		elif type_ == TASK_CMDS:
			self._task.cmds.__init__(*args)
		elif type_ == TASK_GCODE:
			self._task.gcode.__init__(*args)
		elif type_ == TASK_CURVE:
			self._task.curve.__init__(*args)

## main.h

class AxisInfo(Structure):
	_fields_ = [
		("pin_step", c_int),
		("pin_dir", c_int),
		("pin_left", c_int),
		("pin_right", c_int),
	]

	def __init__(self, step, dir_, left, right):
		self.pin_step = step
		self.pin_dir = dir_
		self.pin_left = left
		self.pin_right = right


## load library

def load(path):
	lib = cdll.LoadLibrary(path)

	lib.cnc_init.argtypes = [c_int, POINTER(AxisInfo)]
	lib.cnc_init.restype = c_int

	lib.cnc_quit.argtypes = []
	lib.cnc_quit.restype = c_int

	lib.cnc_clear.argtypes = []
	lib.cnc_clear.restype = c_int

	# synchronous
	lib.cnc_run_task.argtypes = [POINTER(Task)]
	lib.cnc_run_task.restype = c_int

	lib.cnc_read_sensors.argtypes = []
	lib.cnc_read_sensors.restype = c_int

	# asynchronous
	lib.cnc_push_task.argtypes = [POINTER(Task)]
	lib.cnc_push_task.restype = c_int

	lib.cnc_run_async.argtypes = []
	lib.cnc_run_async.restype = c_int

	lib.cnc_is_busy.argtypes = []
	lib.cnc_is_busy.restype = c_int

	lib.cnc_wait.argtypes = []
	lib.cnc_wait.restype = c_int

	lib.cnc_stop.argtypes = []
	lib.cnc_stop.restype = c_int

	return lib

