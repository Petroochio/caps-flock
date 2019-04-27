# cv libs
import cv2
from cv2 import aruco

# socket libs
import socketio
import engineio
import eventlet

# CV STUFF

# init camera
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FPS, 60)

# set aruco dictionary
dictionary_name = aruco.DICT_4X4_50
dictionary = aruco.getPredefinedDictionary(dictionary_name)

w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)

def get_keys():
  ret, frame = cap.read()

  # process key here
  corners, ids, rejectedImgPoints = aruco.detectMarkers(frame, dictionary)
  frame = aruco.drawDetectedMarkers(frame, corners, ids, borderColor=(0, 0, 255))
  
  k = cv2.waitKey(16) # 60 fps?

  if ids is not None:
    print(ids)
    return ids
  
  return []

# create a Socket.IO server
sio = socketio.Server()

# wrap with a WSGI application
app = socketio.WSGIApp(sio, static_files={
  '/': {'content_type': 'text/html', 'filename': 'index.html'}
})

@sio.on('connect')
def connect(sid, environ):
  print('connect ', sid)

@sio.on('disconnect')
def disconnect(sid):
  print('disconnect ', sid)

@sio.on('get keys')
def send_keys(sid):
  # print(map(lambda k: k[0], get_keys()))
  sio.emit('send keys', { 'data': map(lambda k: k[0], get_keys()) })

eventlet.wsgi.server(eventlet.listen(('', 5000)), app)
