import aiohttp
from aiohttp import web


async def websocket(request):

    ws = web.WebSocketResponse()
    await ws.prepare(request)

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            if msg.data == 'close':
                await ws.close()
            else:
                await ws.send_str(msg.data + '/answer')
        elif msg.type == aiohttp.WSMsgType.ERROR:
            print('ws connection closed with exception %s' % ws.exception())

    print('websocket connection closed')

    return ws

app = web.Application()
app.add_routes([
    web.get('/ws', websocket)
])
app.router.add_static('/', path='./static', show_index=True)

web.run_app(app)
