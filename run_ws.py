import sys
import json
import traceback

import asyncio
import aiohttp
from aiohttp import web

import logging as log
log.basicConfig(level=log.DEBUG, format="[%(levelname)s] %(message)s")

from cnc import CNC


async def asend(ws, msg):
    await ws.send_str(msg)


class Peer:
    def __init__(self, loop, ws):
        self.loop = loop
        self.ws = ws

    def send(self, msg):
        asyncio.ensure_future(asend(self.ws, json.dumps(msg)), loop=loop)


async def websocket(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    cnc = request.app["cnc"]
    peer = Peer(request.app["loop"], ws)

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:

            try:
                res = cnc.handle(peer, json.loads(msg.data))
            except:
                log.warning("error handle request")
                log.warning(traceback.format_exc())

        elif msg.type == aiohttp.WSMsgType.ERROR:
            log.warning("ws exception %s" % ws.exception())

    cnc.disconnect(peer)
    log.info("ws closed")

    return ws


async def index(request):
    return web.FileResponse("static/index.html")


async def periodic(app, seconds):
    while True:
        app["cnc"].poll()
        await asyncio.sleep(seconds)


loop = asyncio.get_event_loop()

app = web.Application(loop=loop)
app.add_routes([
    web.get("/", index),
    web.get("/ws", websocket),
])
app.router.add_static("/", path="./static")
app["loop"] = loop

asyncio.ensure_future(periodic(app, 0.1), loop=loop)


with open("config.json", "r") as f:
    config = json.load(f)


with CNC(config, dummy="--dummy" in sys.argv) as cnc:
    app["cnc"] = cnc
    web.run_app(app)
