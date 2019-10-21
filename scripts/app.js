let animationTimer = null;
let faceDetectionSupported = false;
let numberOfFaces = 0;
let emojiBoxes = [];

const video = document.getElementById('webcam');
const emoji_img = document.getElementById('expression_emoji');

const emojiMap = {
    happy: '😄',
    sad: '😭',
    surprised: '😯',
    angry: '😡',
    fearful: '😱',
    neutral: '🎃',
    disgusted: '🤢'
}

const faceDetector = new faceapi.TinyFaceDetectorOptions();

function showEmoji(index, expression, x = 0, y = 0, height, width) {
    const emoji = emojiMap[expression] || emojiMap.neutral;
    const topAdjustment = 0;
    const fontSize = height / 10;

    let emojiBox = emojiBoxes[index];

    if (!emojiBox) {
        emojiBox = document.createElement('span');
        emojiBox.classList.add('emojibox');
        document.body.appendChild(emojiBox);
        
        emojiBoxes[index] = emojiBox;
    }

    emojiBox.innerHTML = emoji;
    emojiBox.style.top = `${y - topAdjustment}px`;
    emojiBox.style.left = `${x}px`;
    emojiBox.style.width = `${width}px`;
    emojiBox.style.height = `${height}px`;
    emojiBox.style.fontSize = `${fontSize}vh`;
}

function cleanupBoxes(numberOfBoxes) {
    if (emojiBoxes.length > numberOfBoxes) {
        for (let i = numberOfBoxes; i < emojiBoxes.length; i++) {
            const emojiBox = emojiBoxes[i];
            emojiBox.remove();
        }

        emojiBoxes = emojiBoxes.slice(0, numberOfBoxes);
    }
}

function animateFace() {
    animationTimer = requestAnimationFrame(async () => {
        if (faceDetectionSupported) {
            const rawFaces = await faceapi.detectAllFaces(video, faceDetector).withFaceLandmarks().withFaceExpressions();
            numberOfFaces = rawFaces.length;

            cleanupBoxes(numberOfFaces);

            if (numberOfFaces) {
                const videoSize = video.getBoundingClientRect();

                const faces = faceapi.resizeResults(rawFaces, {
                    height: videoSize.height,
                    width: videoSize.width
                });

                faces.forEach((face, index) => {
                    const emotion = face.expressions.asSortedArray()[0];
                    const expression = emotion.probability > .5 ? emotion.expression : '';
                    const box = face.detection.box;

                    showEmoji(index, expression, box.left + videoSize.left, box.top, box.height, box.width);
                });
            }
        }

        animateFace();
    });
}

function startVideo() {
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user' } }).then(stream => video.srcObject = stream).catch(err => console.error(err))
}

function everythingWorked() {
    faceDetectionSupported = true;
    startVideo();
}

function somethingFailed(reason) {
    console.error(reason);
    faceDetectionSupported = false;
    startVideo();
}

video.addEventListener('play', animateFace);
video.addEventListener('pause', () => cancelAnimationFrame(animationTimer));
video.addEventListener('error', () => cancelAnimationFrame(animationTimer));

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(everythingWorked).catch(somethingFailed);
