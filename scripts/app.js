let animationTimer = null;
let faceDetectionSupported = false;
let numberOfFaces = 0;
let emojiBoxes = [];

const video = document.getElementById('webcam');
const screenCanvas = document.getElementById('screen')
const screen = screenCanvas.getContext('2d');

const emojiMap = {
    happy: '😄',
    sad: '😭',
    surprised: '😯',
    angry: '😡',
    fearful: '😱',
    neutral: '🎃',
    disgusted: '🤢'
}

const emojiImageMap = {
    happy: 'images/happy.png',
    sad: 'images/sad.png',
    surprised: 'images/surprised.png',
    angry: 'images/angry.png',
    fearful: 'images/fearful.png',
    neutral: 'images/neutral.png',
    disgusted: 'images/disgusted.png'
}

const faceDetector = new faceapi.TinyFaceDetectorOptions();

function showEmoji(index, expression, x = 0, y = 0, height, width, videoSize) {
    const emoji = emojiMap[expression] || emojiMap.neutral;
    const emojiImage = emojiImageMap[expression] || emojiImageMap.neutral;
    const topAdjustment = 75;
    const fontSize = height / 8;

    let emojiBox = emojiBoxes[index];

    if (!emojiBox) {
        emojiBox = document.createElement('span');
        emojiBox.classList.add('emojibox');
        document.body.appendChild(emojiBox);
        
        emojiBoxes[index] = emojiBox;
    }

    emojiBox.innerHTML = emoji;
    emojiBox.style.top = `${y + topAdjustment}px`;
    emojiBox.style.left = `${x + videoSize.x}px`;
    emojiBox.style.width = `${width}px`;
    emojiBox.style.height = `${height}px`;
    emojiBox.style.fontSize = `${fontSize}vh`;

    screen.fillText(emoji, x, y - topAdjustment);
    screen.fillText(emoji, 0, 0);
    screen.fillText('emoji', 0, 0);

    const image = new Image();
    image.onload = function() {
        screen.drawImage(this, x, y, width, height);
    };
    image.src = emojiImage;
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
        const videoSize = video.getBoundingClientRect();
        const screenSize = screenCanvas.getBoundingClientRect();

        screen.drawImage(video, 0, 0);
        
        if (faceDetectionSupported) {
            const rawFaces = await faceapi.detectAllFaces(video, faceDetector).withFaceLandmarks().withFaceExpressions();
            numberOfFaces = rawFaces.length;

            cleanupBoxes(numberOfFaces);

            if (numberOfFaces) {
                const faces = faceapi.resizeResults(rawFaces, {
                    height: videoSize.height,
                    width: videoSize.width
                });

                faces.forEach((face, index) => {
                    const emotion = face.expressions.asSortedArray()[0];
                    const expression = emotion.probability > .5 ? emotion.expression : '';
                    const box = face.detection.box;

                    showEmoji(index, expression, box.left, box.top, box.height, box.width, videoSize);
                });
            }
        }

        animateFace();
    });
}

function startVideo() {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user' } }).then(stream => video.srcObject = stream).catch(err => console.error(err))
}

function everythingWorked() {
    faceDetectionSupported = true;
    startVideo()
    .then(() => {
        console.log(screenCanvas.width, screenCanvas.height);
        screenCanvas.width = video.width;
        screenCanvas.height = video.height;
        console.log(screenCanvas.width, screenCanvas.height);
    });
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
