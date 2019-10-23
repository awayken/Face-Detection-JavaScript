let faceDetectionSupported = false;
let animationTimer = null;
let numberOfFaces = 0;
let emojiBoxes = [];

// Our <video> element
const video = document.getElementById('webcam');

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

// Instantiate our preferred face detector
const faceDetector = new faceapi.TinyFaceDetectorOptions();

function showEmoji(index, expression, x = 0, y = 0, height, width) {
    // Get emoji Unicode for our expression
    const emoji = emojiMap[expression] || emojiMap.neutral;

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
    emojiBox.style.top = `${y - topAdjustment}px`;
    emojiBox.style.left = `${x}px`;
    emojiBox.style.width = `${width}px`;
    emojiBox.style.height = `${height}px`;
    emojiBox.style.fontSize = `${fontSize}vh`;
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
        if (faceDetectionSupported) {
            // Detect all possible faces
            const rawFaces = await faceapi.detectAllFaces(video, faceDetector).withFaceLandmarks().withFaceExpressions();

            // Clean-up extra emoji boxes if people left
            numberOfFaces = rawFaces.length;
            cleanupBoxes(numberOfFaces);

            if (numberOfFaces) {
                const videoSize = video.getBoundingClientRect();

                // face-api can resize detection boxes for our <video> size
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
                    showEmoji(index, expression, box.left + videoSize.left, box.top, box.height, box.width);
                });
            }
        }

        // Do it again
        animateFace();
    });
}

function startVideo() {
    if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({
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
    startVideo();
}

function somethingFailed(reason) {
    console.error(reason);
    faceDetectionSupported = false;
    startVideo();
}

// <video> event listeners
video.addEventListener('play', animateFace);
video.addEventListener('pause', () => cancelAnimationFrame(animationTimer));
video.addEventListener('error', () => cancelAnimationFrame(animationTimer));

// Load all our ML models to kick things off
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
])
.then(everythingWorked)
.catch(somethingFailed);
