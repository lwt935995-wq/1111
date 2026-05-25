/**
 * Speech Recognition Engine
 * Continuously listens to user speech and manages transcribed text flow
 */

class SpeechEngine {
    constructor(config = {}) {
        // Speech Recognition Setup
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = config.language || 'en-US';

        // State
        this.isListening = false;
        this.interimTranscript = '';
        this.finalTranscript = '';
        this.wordQueue = []; // Queue of words not yet extruded
        this.flowRate = config.flowRate || 30; // characters per second
        this.lastFlowTime = 0;
        this.isAutoFlowing = true;
        this.lastSpokenPhrase = ''; // For infinite loop fallback

        // Callbacks
        this.onWordExtruded = config.onWordExtruded || (() => {});
        this.onFlowPaused = config.onFlowPaused || (() => {});
        this.onFlowResumed = config.onFlowResumed || (() => {});

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('Speech recognition started');
        };

        this.recognition.onresult = (event) => {
            this.interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    this.finalTranscript += transcript + ' ';
                    this.lastSpokenPhrase = transcript; // Store for infinite loop
                } else {
                    this.interimTranscript += transcript;
                }
            }

            // Add final transcript to queue for extrusion
            if (this.finalTranscript) {
                this.enqueueText(this.finalTranscript);
                this.finalTranscript = '';
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log('Speech recognition ended');
        };
    }

    enqueueText(text) {
        // Reverse the text for correct reading order
        // (oldest chars pushed to hand, newest at mouth)
        const reversed = text.split('').reverse().join('');
        
        // Split into individual characters for the queue
        for (let char of reversed) {
            this.wordQueue.push(char);
        }
    }

    start() {
        if (!this.isListening) {
            this.recognition.start();
        }
    }

    stop() {
        this.recognition.stop();
        this.isListening = false;
    }

    pauseFlow() {
        this.isAutoFlowing = false;
        this.onFlowPaused();
    }

    resumeFlow() {
        this.isAutoFlowing = true;
        this.lastFlowTime = performance.now();
        this.onFlowResumed();
    }

    // Get next character to extrude based on flow rate
    getNextCharacter(currentTime) {
        if (!this.isAutoFlowing || this.wordQueue.length === 0) {
            return null;
        }

        // Check if enough time has passed based on flow rate
        const timeSinceLastFlow = currentTime - this.lastFlowTime;
        const timePerChar = 1000 / this.flowRate; // ms per character

        if (timeSinceLastFlow >= timePerChar) {
            this.lastFlowTime = currentTime;
            return this.wordQueue.shift();
        }

        return null;
    }

    // Consume queued characters when user manually pulls
    consumeQueuedCharacters(count) {
        const consumed = [];
        for (let i = 0; i < count && this.wordQueue.length > 0; i++) {
            consumed.push(this.wordQueue.shift());
        }
        return consumed.join('');
    }

    // Get queued character count
    getQueueLength() {
        return this.wordQueue.length;
    }

    // Get text for infinite loop mode
    getLastPhrase() {
        return this.lastSpokenPhrase;
    }

    // Clear queue
    clearQueue() {
        this.wordQueue = [];
    }
}
