import os
from subprocess import call, Popen

def callex(args, **kwargs):
	proc = Popen(args, **kwargs)
	proc.wait()

call(["git", "submodule", "update", "--init", "--recursive"])
callex("make", cwd=os.getcwd()+"/librpicnc")
