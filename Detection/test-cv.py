import cv2
from cv2 import aruco

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FPS, 60)

dictionary_name = aruco.DICT_4X4_50
dictionary = aruco.getPredefinedDictionary(dictionary_name)

w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
print(w, h)

while True:
  ret, frame = cap.read()
  corners, ids, rejectedImgPoints = aruco.detectMarkers(frame, dictionary)
  frame = aruco.drawDetectedMarkers(frame, corners, ids, borderColor=(0, 0, 255))
  cv2.imshow('Frame', frame)

  k = cv2.waitKey(30)
  if k == 27:
    break

cap.release()
cv2.destroyAllWindows()