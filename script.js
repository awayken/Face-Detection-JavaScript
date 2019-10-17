const video = document.getElementById('video')
const emoji_img = document.getElementById('expression_emoji')

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo)

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}
/*
video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video)
  document.body.append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    console.log(resizedDetections.expressions)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
  }, 100)
})
*/
const emotion_dict = {
  'happy': "./happy.png",
  'sad': "./sad.png",
  "surprised": "./surprised.png",
  "angry": "./angry.png",
  "fearful": "./fearful.png",
  "neutral": "./neutral.png",
  "disgusted": "./disgusted.png"
}
video.addEventListener('play', () =>
{
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    //const resizedDetections = faceapi.resizeResults(detections, displaySize)
    console.log(detections[0]["expressions"].asSortedArray()[0].expression)
    const highest_prob = detections[0]["expressions"].asSortedArray()[0].expression
    //const emotions = detections[0]["expressions"];
    emoji_img.src = emotion_dict[highest_prob]
  }, 1000)
})