const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', function() {
    const user = checkAdminAuth();
    if (!user) return;
    
    loadAnalytics();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

async function loadAnalytics() {
    try {
        const timeframe = document.getElementById('timeframe').value;
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/engagement-analytics?timeframe=${timeframe}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load analytics');
        }
        
        const analytics = await response.json();
        displayAnalytics(analytics);
    } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('engagementOverview').innerHTML = 
            '<div class="error-message">Error loading analytics data.</div>';
    }
}

function displayAnalytics(analytics) {
    displayEngagementOverview(analytics);
    displayTopArtworks(analytics);
    displayDetailedAnalytics(analytics);
}

function displayEngagementOverview(analytics) {
    const container = document.getElementById('engagementOverview');
    
    container.innerHTML = `
        <div class="analytics-stats">
            <div class="stat-card">
                <div class="stat-value">${analytics.summary.totalEngagements}</div>
                <div class="stat-label">Total Views</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${analytics.summary.completedEngagements}</div>
                <div class="stat-label">Completed Views</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${analytics.summary.completionRate}%</div>
                <div class="stat-label">Completion Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${analytics.summary.averageDuration}s</div>
                <div class="stat-label">Avg. Duration</div>
            </div>
        </div>
        
        <div style="margin-top: 2rem;">
            <h4 style="margin-bottom: 1rem;">Session Statistics</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">
                        ${analytics.sessionStats.totalSessions}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-light);">Total Sessions</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">
                        ${analytics.sessionStats.avgArtworksPerSession.toFixed(1)}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-light);">Artworks/Session</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">
                        ${Math.round(analytics.sessionStats.avgTimePerSession / 60)}m
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-light);">Avg. Time/Session</div>
                </div>
            </div>
        </div>
    `;
}

function displayTopArtworks(analytics) {
    const container = document.getElementById('topArtworks');
    
    if (!analytics.topArtworks || analytics.topArtworks.length === 0) {
        container.innerHTML = '<p class="loading">No engagement data available yet.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="analytics-list">
            ${analytics.topArtworks.map((artwork, index) => `
                <div class="analytics-item">
                    <div class="artwork-info">
                        <h4>${index + 1}. ${artwork.artworkTitle}</h4>
                        <div class="artwork-meta">
                            <span>by ${artwork.artworkArtist}</span>
                            <span>ID: ${artwork.artworkId.substring(0, 8)}...</span>
                        </div>
                    </div>
                    <div class="engagement-stats">
                        <div class="views-count">${artwork.totalViews}</div>
                        <div class="avg-duration">${artwork.avgDuration || 0}s avg</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function displayDetailedAnalytics(analytics) {
    const container = document.getElementById('detailedAnalytics');
    
    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem;">Engagement Over Time (${analytics.timeframe})</h4>
            <div style="background: var(--gray-light); padding: 1.5rem; border-radius: var(--radius);">
                ${analytics.engagementOverTime.map(day => `
                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="flex: 1;">${day._id}</span>
                        <span style="font-weight: 500;">${day.views} views</span>
                        <span style="margin-left: 1rem; color: var(--text-light);">
                            ${day.avgDuration ? Math.round(day.avgDuration) + 's avg' : 'N/A'}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div>
            <h4 style="margin-bottom: 1rem;">Raw Analytics Data</h4>
            <div style="background: var(--gray-light); padding: 1rem; border-radius: var(--radius); font-family: monospace; font-size: 0.8rem; max-height: 200px; overflow-y: auto;">
                <pre>${JSON.stringify(analytics, null, 2)}</pre>
            </div>
        </div>
    `;
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'login.html';
}