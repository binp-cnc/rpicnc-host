from ctypes import *

## device.h

MAX_AXES = 8

## command.h

CMD_NONE = 0x00

CMD_IDLE = 0x01
CMD_WAIT = 0x02
CMD_SYNC = 0x03
CMD_MOVE = 0x10

CMD_MOVE_VEL = 0x11
CMD_MOVE_ACC = 0x12
CMD_MOVE_SIN = 0x13

class CmdNone(Structure):
	_fields_ = []

	def __init__(self):
		pass

class CmdIdle(Structure):
	_fields_ = []

	def __init__(self):
		pass

class CmdWait(Structure):
	_fields_ = [
		("duration", c_uint32), # us
	]

	def __init__(self, duration):
		self.duration = c_uint32(duration)

class CmdSync(Structure):
	_fields_ = [
		("id_", c_uint32),
		("count", c_uint32),
	]

	def __init__(self, id_, count):
		self.id_ = c_uint32(id_)
		self.count = c_uint32(count)

class CmdMoveVel(Structure):
	_fields_ = [
		("period", c_uint32), # us
	]

	def __init__(self, period):
		self.period = c_uint32(period)

class CmdMoveAcc(Structure):
	_fields_ = [
		("begin_period", c_uint32),
		("end_period", c_uint32),
	]

	def __init__(self, begin_period, end_period):
		self.begin_period = c_uint32(begin_period)
		self.end_period = c_uint32(end_period)

class CmdMoveSin(Structure):
	_fields_ = [
		("begin", c_uint32),
		("size", c_uint32),
		("period", c_uint32),
	]

	def __init__(self, begin, size, period):
		self.begin = c_uint32(begin)
		self.size = c_uint32(size)
		self.period = c_uint32(period)

class _CmdMoveUnion(Union):
	_fields_ = [
		("vel", CmdMoveVel),
		("acc", CmdMoveAcc),
		("sin", CmdMoveSin),
	]

class CmdMove(Structure):
	_fields_ = [
		("type_", c_uint8),
		("dir_", c_uint8),
		("steps", c_uint32),
		("_cmd", _CmdMoveUnion),
	]

	def __init__(self, type_, dir_, steps, *args):
		self.type_ = c_uint8(type_)
		self.dir_ = c_uint8(dir_)
		self.steps = c_uint32(steps)
		if type_ == CMD_MOVE_VEL:
			self._cmd.vel.__init__(*args)
		elif type_ == CMD_MOVE_ACC:
			self._cmd.acc.__init__(*args)
		elif type_ == CMD_MOVE_SIN:
			self._cmd.sin.__init__(*args)

class _CmdUnion(Union):
	_fields_ = [
		("none", CmdNone),
		("idle", CmdNone),
		("wait", CmdWait),
		("sync", CmdSync),
		("move", CmdMove),
	]

class Cmd(Structure):
	_fields_ = [
		("type_", c_uint8),
		("_cmd", _CmdUnion),
	]

	def __init__(self, type_, *args):
		self.type_ = c_uint8(type_)
		if type_ == CMD_NONE:
			self._cmd.none.__init__(*args)
		elif type_ == CMD_IDLE:
			self._cmd.idle.__init__(*args)
		elif type_ == CMD_WAIT:
			self._cmd.wait.__init__(*args)
		elif type_ == CMD_SYNC:
			self._cmd.sync.__init__(*args)
		elif type_ == CMD_MOVE:
			self._cmd.move.__init__(*args)


## task.h

TASK_NONE    = 0x00
TASK_SCAN    = 0x01
TASK_CALIB   = 0x02
TASK_CMDS    = 0x10

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

	def __init__(self, cmds):
		super().__init__()
		self.cmds_count = (c_int*MAX_AXES)()
		self.cmds = (POINTER(Cmd)*MAX_AXES)()
		self.cmds_done = (c_int*MAX_AXES)()
		for i, acmds in enumerate(cmds):
			self.cmds_count[i] = len(acmds)
			self.cmds[i] = acmds
			self.cmds_done[i] = 0

class _TaskUnion(Union):
	_fields_ = [
		("none", TaskNone),
		("scan", TaskScan),
		("calib", TaskCalib),
		("cmds", TaskCmds),
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
		self.type_ = c_int(type_)
		if type_ == TASK_NONE:
			self._task.none.__init__(*args)
		elif type_ == TASK_SCAN:
			self._task.scan.__init__(*args)
		elif type_ == TASK_CALIB:
			self._task.calib.__init__(*args)
		elif type_ == TASK_CMDS:
			self._task.cmds.__init__(*args)

## main.h

class AxisInfo(Structure):
	_fields_ = [
		("pin_step", c_int),
		("pin_dir", c_int),
		("pin_left", c_int),
		("pin_right", c_int),

		("position", c_int),
		("direction", c_int),
		("length", c_int),
	]

	def __init__(self, **kwargs):
		if "pins" in kwargs:
			self.pin_step = kwargs["pins"]["step"]
			self.pin_dir = kwargs["pins"]["dir"]
			self.pin_left = kwargs["pins"]["left"]
			self.pin_right = kwargs["pins"]["right"]

		self.position = kwargs.get("pos", 0);
		self.direction = kwargs.get("dir_", 0);
		self.length = kwargs.get("len_", 0);


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

	lib.cnc_axes_info.argtypes = [POINTER(AxisInfo)]
	lib.cnc_axes_info.restype = c_int

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

