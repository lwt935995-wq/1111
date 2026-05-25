/**
 * Main Application
 * Orchestrates speech recognition, hand tracking, physics simulation, and rendering
 */

class SpeakAndPullApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.getElementById('webcam');

        // Setup canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Initialize components
        this.ribbon = new VerletRibbon({
            gravity: 0.5,
            damping: 0.98,
            charSpacing: 15,
            springStiffness: 0.92
        });

        this.speech = new SpeechEngine({
            flowRate: 30,
            onFlowPaused: () => console.log('Auto-flow paused'),
            onFlowResumed: () => console.log('Auto-flow resumed')
        });

        this.handTracker = new HandTracker({
            onPinchStart: (hand) => this.handlePinchStart(hand),
            onPinchEnd: () => this.handlePinchEnd(),
            onMouthDetected: (x, y) => this.updateMouthAnchor(x, y)
        });

        // State
        this.isGrabbing = false;
        this.grabbedParticleIndex = -1;
        this.mouthAnchorX = this.canvas.width / 2;
        this.mouthAnchorY = this.canvas.height / 2;
        this.infiniteLoopMode = false;
        this.infiniteLoopIndex = 0;

        // Animation
        this.lastTime = performance.now();
        this.isRunning = false;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async initialize() {
        // Start video capture
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            this.video.onloadedmetadata = () => {
                this.video.play();
            };
        } catch (err) {
            console.error('Failed to access camera:', err);
            alert('Camera access required. Please enable camera permissions.');
            return;
        }

        // Initialize hand tracking
        await this.handTracker.initialize(this.video);

        // Start speech recognition
        this.speech.start();

        // Add initial anchor particle at mouth
        this.ribbon.addCharacter('•', this.mouthAnchorX, this.mouthAnchorY, true);

        // Start animation loop
        this.isRunning = true;
        this.animate();
    }

    updateMouthAnchor(x, y) {
        this.mouthAnchorX = x;
        this.mouthAnchorY = y;

        // Pin the root particle to mouth position
        if (this.ribbon.particles.length > 0) {
            this.ribbon.particles[0].pin(x, y);
        }
    }

    handlePinchStart(hand) {
        const pinchPos = this.handTracker.getPinchPosition();
        if (!pinchPos) return;

        // Find closest particle to pinch
        const particleIndex = this.ribbon.getParticleAtPosition(
            pinchPos.x,
            pinchPos.y,
            150
        );

        if (particleIndex !== null) {
            // Verify it's grabbable (within acceptable radius)
            const particle = this.ribbon.particles[particleIndex];
            if (this.handTracker.isGrabbable(particle.position.x, particle.position.y, this.mouthAnchorX, this.mouthAnchorY)) {
                this.isGrabbing = true;
                this.grabbedParticleIndex = particleIndex;
                this.ribbon.pinParticleToMouse(particleIndex, pinchPos.x, pinchPos.y);
                this.speech.pauseFlow();
                console.log('Grabbed particle at index:', particleIndex);
            }
        }
    }

    handlePinchEnd() {
        if (this.isGrabbing) {
            this.ribbon.unpinParticle(this.grabbedParticleIndex);
            this.grabbedParticleIndex = -1;
            this.isGrabbing = false;
            this.speech.resumeFlow();
            this.infiniteLoopMode = false;
            console.log('Released particle');
        }
    }

    animate() {
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.016);
        this.lastTime = currentTime;

        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update hand position if grabbing
        if (this.isGrabbing) {
            const pinchPos = this.handTracker.getPinchPosition();
            if (pinchPos && this.grabbedParticleIndex >= 0) {
                this.ribbon.pinParticleToMouse(this.grabbedParticleIndex, pinchPos.x, pinchPos.y);

                // Check if user is pulling all queued characters
                if (this.speech.getQueueLength() === 0 && this.isGrabbing) {
                    this.handleInfiniteLoopMode();
                }
            }
        }

        // Add new characters from speech queue
        const nextChar = this.speech.getNextCharacter(currentTime);
        if (nextChar) {
            this.ribbon.addCharacter(
                nextChar,
                this.mouthAnchorX,
                this.mouthAnchorY,
                false
            );
        }

        // Update physics
        this.ribbon.update(deltaTime);

        // Draw
        this.ribbon.draw(this.ctx);

        if (this.isRunning) {
            requestAnimationFrame(() => this.animate());
        }
    }

    handleInfiniteLoopMode() {
        if (!this.infiniteLoopMode) {
            this.infiniteLoopMode = true;
            this.infiniteLoopIndex = 0;
        }

        // Get the phrase to loop
        const phrase = this.speech.getLastPhrase();
        if (phrase && phrase.length > 0) {
            const char = phrase[this.infiniteLoopIndex % phrase.length];
            this.ribbon.addCharacter(char, this.mouthAnchorX, this.mouthAnchorY, false);
            this.infiniteLoopIndex++;
        }
    }
}

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
    const app = new SpeakAndPullApp();
    await app.initialize();
});
