let faceDetectionSupported = false;
let animationTimer = null;
let numberOfFaces = 0;
let emojiBoxes = [];

// Our <video> element
const video = document.getElementById('webcam');

// Our <canvas> element
const screenCanvas = document.getElementById('screen');
const screen = screenCanvas.getContext('2d');

// Our snapshot element
const snapshot = document.getElementById('snapshot');

// Mapping expression to emoji
const emojiMap = {
    happy: '😄',
    sad: '😭',
    surprised: '😯',
    angry: '😡',
    fearful: '😱',
    neutral: '🎃',
    disgusted: '🤢'
}

// Mapping expression to images
const emojiImageMap = {
    happy: 'images/happy.png',
    sad: 'images/sad.png',
    surprised: 'images/surprised.png',
    angry: 'images/angry.png',
    fearful: 'images/fearful.png',
    neutral: 'images/neutral.png',
    disgusted: 'images/disgusted.png'
}

// Instantiate our preferred face detector
const faceDetector = new faceapi.TinyFaceDetectorOptions();

function showEmoji(index, expression, x = 0, y = 0, height, width, videoSize) {
    // Get emoji Unicode for our expression
    const emoji = emojiMap[expression] || emojiMap.neutral;

    // Get emoji image for our expression
    const emojiImage = emojiImageMap[expression] || emojiImageMap.neutral;

    // Detected face is roughly 15% of height lower than we want
    const topAdjustment = height * .15;

    // Emoji size is roughly 13% of the height
    const fontSize = height * .13;

    // Look up an existing emojiBox...
    let emojiBox = emojiBoxes[index];

    // ...or create a new one...
    if (!emojiBox) {
        emojiBox = document.createElement('span');
        emojiBox.classList.add('emojibox');
        document.body.appendChild(emojiBox);

        // ...and remember it
        emojiBoxes[index] = emojiBox;
    }

    // Render the emojiBox
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
    // If we're storing more boxes than number of detection boxes...
    if (emojiBoxes.length > numberOfBoxes) {

        // ...loop through the difference...
        for (let i = numberOfBoxes; i < emojiBoxes.length; i++) {
            const emojiBox = emojiBoxes[i];

            // ...and remove them from the DOM
            emojiBox.remove();
        }

        // Forget extra boxes from storage
        emojiBoxes = emojiBoxes.slice(0, numberOfBoxes);
    }
}

function animateFace() {
    // Animation loop
    animationTimer = requestAnimationFrame(async () => {
        const videoSize = video.getBoundingClientRect();
        const screenSize = screenCanvas.getBoundingClientRect();

        screen.drawImage(video, 0, 0);
        
        if (faceDetectionSupported) {
            // Detect all possible faces
            const rawFaces = await faceapi.detectAllFaces(video, faceDetector).withFaceLandmarks().withFaceExpressions();

            // Clean-up extra emoji boxes if people left
            numberOfFaces = rawFaces.length;
            cleanupBoxes(numberOfFaces);

            if (numberOfFaces) {
                const faces = faceapi.resizeResults(rawFaces, {
                    height: videoSize.height,
                    width: videoSize.width
                });

                // Loop through our faces and...
                faces.forEach((face, index) => {
                    // Pick the most likely expression
                    const emotion = face.expressions.asSortedArray()[0];

                    // Only use that emotion if it's pretty likely accurate
                    const expression = emotion.probability > .5 ? emotion.expression : '';

                    // Get dimensions of the face detection
                    const box = face.detection.box;

                    // Show the Emoji box
                    showEmoji(index, expression, box.left, box.top, box.height, box.width, videoSize);
                });
            }
        }

        // Do it again
        animateFace();
    });
}

function startVideo() {
    if (navigator.mediaDevices) {
        return navigator.mediaDevices.getUserMedia({
            // We don't need audio
            audio: false,
    
            // Prefer user-facing camera
            video: { facingMode: 'user' }
        })

        // Pass the stream to our <video>
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
    }
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

function takeSnapshot() {
    const snap = document.createElement('img');
    const dataUrl = screenCanvas.toDataURL('image/png');

    snap.setAttribute('src', dataUrl);
    snap.classList.add('snapshot__image');
    document.body.appendChild(snap);

    // Post dataUrl to endpoint, I think.
    // const url = ''
    // await fetch(url, {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded'
    //     },
    //     body: null
    // });

    // return await response.json();
}

// <video> event listeners
video.addEventListener('play', animateFace);
video.addEventListener('pause', () => cancelAnimationFrame(animationTimer));
video.addEventListener('error', () => cancelAnimationFrame(animationTimer));

// Snapshot event listeners
snapshot.addEventListener('click', takeSnapshot);

// Load all our ML models to kick things off
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
])
.then(everythingWorked)
.catch(somethingFailed);
