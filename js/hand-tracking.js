/**
 * Hand Tracking Engine
 * Uses MediaPipe Holistic to detect hand positions and pinch gestures
 */

class HandTracker {
    constructor(config = {}) {
        this.holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
            }
        });

        this.holistic.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            refineFaceLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.leftHandLandmarks = null;
        this.rightHandLandmarks = null;
        this.faceLandmarks = null;
        this.mouthPosition = new Vector2(0, 0);

        this.isPinching = false;
        this.activePinchHand = null; // 'left' or 'right'
        this.pinchThreshold = 0.05; // Distance threshold for pinch detection

        // Callbacks
        this.onPinchStart = config.onPinchStart || (() => {});
        this.onPinchEnd = config.onPinchEnd || (() => {});
        this.onHandMove = config.onHandMove || (() => {});
        this.onMouthDetected = config.onMouthDetected || (() => {});
    }

    async initialize(videoElement) {
        this.holistic.onResults(this.onResults.bind(this));
        
        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.holistic.send({ image: videoElement });
            },
            width: videoElement.videoWidth,
            height: videoElement.videoHeight
        });
        
        camera.start();
        this.camera = camera;
    }

    onResults(results) {
        this.faceLandmarks = results.faceLandmarks;
        this.leftHandLandmarks = results.leftHandLandmarks;
        this.rightHandLandmarks = results.rightHandLandmarks;

        // Extract mouth position from face landmarks
        if (this.faceLandmarks && this.faceLandmarks.length > 0) {
            // Mouth center approximation (average of mouth landmarks)
            const mouthLandmarks = this.faceLandmarks.slice(61, 68);
            if (mouthLandmarks.length > 0) {
                let sumX = 0, sumY = 0;
                for (let landmark of mouthLandmarks) {
                    sumX += landmark.x;
                    sumY += landmark.y;
                }
                this.mouthPosition.x = (sumX / mouthLandmarks.length) * window.innerWidth;
                this.mouthPosition.y = (sumY / mouthLandmarks.length) * window.innerHeight;
                this.onMouthDetected(this.mouthPosition.x, this.mouthPosition.y);
            }
        }

        // Check for pinch gestures
        this.updatePinchDetection();
    }

    updatePinchDetection() {
        const wasPinching = this.isPinching;

        // Check left hand pinch
        if (this.leftHandLandmarks) {
            if (this.detectPinch(this.leftHandLandmarks)) {
                this.isPinching = true;
                this.activePinchHand = 'left';
            }
        }

        // Check right hand pinch
        if (this.rightHandLandmarks) {
            if (this.detectPinch(this.rightHandLandmarks)) {
                this.isPinching = true;
                this.activePinchHand = 'right';
            }
        }

        // If no pinch detected
        if (!this.leftHandLandmarks && !this.rightHandLandmarks) {
            this.isPinching = false;
            this.activePinchHand = null;
        }

        // Trigger callbacks on state change
        if (!wasPinching && this.isPinching) {
            this.onPinchStart(this.activePinchHand);
        } else if (wasPinching && !this.isPinching) {
            this.onPinchEnd();
        }
    }

    detectPinch(handLandmarks) {
        if (!handLandmarks || handLandmarks.length < 21) return false;

        // Thumb tip (4) and index finger tip (8)
        const thumbTip = handLandmarks[4];
        const indexTip = handLandmarks[8];

        const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2)
        );

        return distance < this.pinchThreshold;
    }

    getPinchPosition() {
        if (!this.isPinching) return null;

        const landmarks = this.activePinchHand === 'left' 
            ? this.leftHandLandmarks 
            : this.rightHandLandmarks;

        if (!landmarks || landmarks.length < 9) return null;

        // Average of thumb tip and index tip
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];

        return new Vector2(
            ((thumbTip.x + indexTip.x) / 2) * window.innerWidth,
            ((thumbTip.y + indexTip.y) / 2) * window.innerHeight
        );
    }

    getMouthPosition() {
        return this.mouthPosition.clone();
    }

    isGrabbable(x, y, mouthX, mouthY) {
        const ribbonRadius = 150;
        const mouthRadius = 200;
        
        const distToRibbon = Math.sqrt(
            Math.pow(x - this.mouthPosition.x, 2) +
            Math.pow(y - this.mouthPosition.y, 2)
        );
        
        return distToRibbon < ribbonRadius || distToRibbon < mouthRadius;
    }
}
