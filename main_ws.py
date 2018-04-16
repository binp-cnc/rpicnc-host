import json
import traceback

import aiohttp
from aiohttp import web

import logging as log

import cnc


async def ahandle(req, ws):
    try:
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
            await ahandle(msg.data, ws)
        elif msg.type == aiohttp.WSMsgType.ERROR:
            log.warning('ws exception %s' % ws.exception())
    log.info('ws closed')
    return ws

async def index(request):
    return web.FileResponse("static/index.html")

app = web.Application()
app.add_routes([
    web.get("/", index),
    web.get("/ws", websocket),
])
app.router.add_static("/", path="./static")

try:
    cnc.init()
except:
    log.error(traceback.format_exc())

web.run_app(app)
cnc.quit()
