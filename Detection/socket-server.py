import socketio

import engineio
import eventlet

# create a Socket.IO server
sio = socketio.Server()

# wrap with a WSGI application
app = socketio.WSGIApp(sio, static_files={
  '/': {'content_type': 'text/html', 'filename': 'index.html'}
})

@sio.on('connect')
def connect(sid, environ):
  print('connect ', sid)

@sio.on('my message')
def message(sid, data):
  print('message ', data)

@sio.on('disconnect')
def disconnect(sid):
  print('disconnect ', sid)


eventlet.wsgi.server(eventlet.listen(('', 5000)), app)
