const API_BASE = window.location.origin;

class EngagementTracker {
    constructor() {
        this.currentEngagementId = null;
        this.sessionId = localStorage.getItem('museum_session_id');
        this.startTime = null;
        this.isTracking = false;
        this.pauseTime = null;
        
        if (!this.sessionId) {
            this.sessionId = this.generateSessionId();
            localStorage.setItem('museum_session_id', this.sessionId);
        }
        
        this.init();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const artworkId = urlParams.get('id');
        
        if (artworkId) {
            await this.startEngagement(artworkId);
        }

        this.setupPageUnloadTracking();
        this.setupVisibilityTracking();
    }

    async startEngagement(artworkId) {
        try {
            this.startTime = new Date();
            
            const response = await fetch(`${API_BASE}/api/engagement/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify({ 
                    artworkId, 
                    pageType: window.location.pathname.includes('artwork') ? 'artwork' : 'scanner' 
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentEngagementId = data.engagementId;
                this.isTracking = true;
                console.log('Engagement tracking started:', data.engagementId);
                
                this.addEngagementTimeDisplay();
            }
        } catch (error) {
            console.error('Error starting engagement tracking:', error);
        }
    }

    async endEngagement() {
        if (!this.isTracking || !this.currentEngagementId) return;

        try {
            const response = await fetch(`${API_BASE}/api/engagement/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify({ engagementId: this.currentEngagementId })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Engagement tracking ended. Duration:', data.duration, 'seconds');
                this.isTracking = false;
                this.currentEngagementId = null;
            }
        } catch (error) {
            console.error('Error ending engagement tracking:', error);
        }
    }

    setupPageUnloadTracking() {
        window.addEventListener('beforeunload', () => {
            this.endEngagement();
        });

        window.addEventListener('pagehide', () => {
            this.endEngagement();
        });
    }

    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseEngagement();
            } else {
                this.resumeEngagement();
            }
        });
    }

    pauseEngagement() {
        if (this.isTracking && this.startTime) {
            this.pauseTime = new Date();
            console.log('Engagement paused');
        }
    }

    resumeEngagement() {
        if (this.isTracking && this.pauseTime) {
            const pauseDuration = new Date() - this.pauseTime;
            this.startTime = new Date(this.startTime.getTime() + pauseDuration);
            this.pauseTime = null;
            console.log('Engagement resumed');
        }
    }

    getCurrentDuration() {
        if (!this.startTime) return 0;
        const now = new Date();
        return Math.floor((now - this.startTime) / 1000);
    }

    addEngagementTimeDisplay() {
        if (document.getElementById('engagementTimeDisplay')) return;

        const engagementDisplay = document.createElement('div');
        engagementDisplay.id = 'engagementTimeDisplay';
        engagementDisplay.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(139, 90, 43, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            z-index: 1000;
            backdrop-filter: blur(10px);
            display: none;
        `;
        
        document.body.appendChild(engagementDisplay);

        setInterval(() => {
            if (this.isTracking) {
                const duration = this.getCurrentDuration();
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                
                engagementDisplay.textContent = `Viewing time: ${minutes}m ${seconds}s`;
                engagementDisplay.style.display = 'block';
            }
        }, 1000);
    }
}

// Initialize engagement tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.engagementTracker = new EngagementTracker();
});