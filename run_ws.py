import sys
import json
import traceback

import asyncio
import aiohttp
from aiohttp import web

import logging as log
log.basicConfig(level=log.DEBUG, format="[%(levelname)s] %(message)s")

from cnc import CNC


async def ahandle(app, req, ws):
    try:
        cnc = app["cnc"]
        res = cnc.handle(json.loads(req))
        await ws.send_str(json.dumps(res))
    except:
        log.warning("error handle request")
        log.warning(traceback.format_exc())


async def websocket(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            await ahandle(request.app, msg.data, ws)
        elif msg.type == aiohttp.WSMsgType.ERROR:
            log.warning('ws exception %s' % ws.exception())
    log.info('ws closed')
    return ws


async def index(request):
    return web.FileResponse("static/index.html")


async def periodic(seconds):
    while True:
        #log.debug('periodic')
        await asyncio.sleep(seconds)


loop = asyncio.get_event_loop()
asyncio.ensure_future(periodic(1), loop=loop)

app = web.Application(loop=loop)
app.add_routes([
    web.get("/", index),
    web.get("/ws", websocket),
])
app.router.add_static("/", path="./static")


with open("config.json", "r") as f:
    config = json.load(f)

with CNC(config, dummy="--dummy" in sys.argv) as cnc:
    app["cnc"] = cnc
    web.run_app(app)
