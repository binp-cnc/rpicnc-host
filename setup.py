import os
import sys
from subprocess import call, Popen


def callex(args, **kwargs):
	proc = Popen(args, **kwargs)
	proc.wait()


all_ = len(sys.argv) < 2 or "--all" in sys.argv

if all_ or "--git" in sys.argv:
	call(["git", "submodule", "update", "--init", "--recursive"])

if all_ or "--make" in sys.argv:
	callex("make", cwd=os.getcwd()+"/librpicnc")

