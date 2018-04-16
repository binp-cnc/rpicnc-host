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

Cmd cmd_none():
	Cmd cmd
	cmd.type_ = CMD_NONE
	return cmd

Cmd cmd_idle():
	Cmd cmd
	cmd.type_ = CMD_IDLE
	return cmd

Cmd cmd_wait(c_uint32 duration):
	Cmd cmd
	cmd.type_ = CMD_WAIT
	cmd._cmd.wait.duration = duration
	return cmd

Cmd cmd_sync(c_uint32 id_, c_uint32 count):
	Cmd cmd
	cmd.type_ = CMD_SYNC
	cmd._cmd.sync.id_ = id_
	cmd._cmd.sync.count = count
	return cmd

Cmd cmd_move(c_uint8 dir_, c_uint32 steps, c_uint32 period):
	Cmd cmd
	cmd.type_ = CMD_MOVE
	cmd._cmd.move.dir_ = dir_
	cmd._cmd.move.steps = steps
	cmd._cmd.move.period = period
	return cmd

Cmd cmd_accl(c_uint8 dir_, c_uint32 steps, c_uint32 begin_period, c_uint32 end_period):
	Cmd cmd
	cmd.type_ = CMD_ACCL
	cmd._cmd.accl.dir_ = dir_
	cmd._cmd.accl.steps = steps
	cmd._cmd.accl.begin_period = begin_period
	cmd._cmd.accl.end_period = end_period
	return cmd

Cmd cmd_sine(c_uint8 dir_, c_uint32 steps, c_uint32 begin, c_uint32 size, c_uint32 period):
	Cmd cmd
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

# stop codes
SC_DONE         = 0x01
SC_SENS_L       = 0x10
SC_SENS_R       = 0x11
SC_USER_STOP    = 0x20

class TaskNone(Structure):
	_fields_ = []

class TaskScan(Structure):
	_fields_ = [
		# in
		("axis", c_int),
		("t_ivel", c_int),
		("t_vel", c_int),
		("tt_acc", c_int),
		# out
		("length", c_int),
	]

class TaskCalib(Structure):
	_fields_ = [
		# in
		("axis", c_int),
		("it_ivel", c_int),
		# out
		("t_ivel", c_int),
		("t_vel", c_int),
		("tt_acc", c_int),
	]

class TaskCmds(Structure):
	_fields_ = [
		# in
		("cmds_count", c_int*MAX_AXES),
		("cmds", POINTER(Cmd)*MAX_AXES),
		# out
		("cmds_done", c_int*MAX_AXES),
	]

class _TaskUnion(Union):
	_fields_ = [
		("none", TaskNone),
		("calib", TaskCalib),
		("scan", TaskScan),
		("cmds", TaskCmds),
		("gcode", TaskGCode),
		("curve", TaskCurve),
	]

class Task(Structure):
	_fields_ = [
		("type_", c_int),
		("_task", _TaskUnion),
		# out
		("stop_code", c_int),
	]

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

def load_lib(path):
	lib = cdll.LoadLibrary(path)

	lib.cnc_init.argtypes = [c_int, POINTER(C_AxisInfo)]
	lib.cnc_init.restype = c_int

	lib.cnc_quit.argtypes = []
	lib.cnc_quit.restype = c_int

	# synchronous
	lib.cnc_run_task.argtypes = [Task]
	lib.cnc_run_task.restype = c_int

	# asynchronous
	lib.cnc_run_task_async.argtypes = [Task]
	lib.cnc_run_task_async.restype = c_int

	lib.cnc_is_busy.argtypes = []
	lib.cnc_is_busy.restype = c_int

	lib.cnc_stop.argtypes = []
	lib.cnc_stop.restype = c_int

	return lib

