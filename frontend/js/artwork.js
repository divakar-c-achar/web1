const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const artworkId = urlParams.get('id');
    
    if (artworkId) {
        loadArtworkDetails(artworkId);
    } else {
        showError('No artwork specified. Please scan a QR code or enter an artwork ID.');
    }
});

async function loadArtworkDetails(artworkId) {
    try {
        const response = await fetch(`${API_BASE}/api/artworks/${artworkId}`);
        
        if (!response.ok) {
            throw new Error('Artwork not found');
        }
        
        const artwork = await response.json();
        displayArtworkDetails(artwork);
        
    } catch (error) {
        showError('Artwork not found. The requested artwork could not be located.');
    }
}

function displayArtworkDetails(artwork) {
    const display = document.getElementById('artworkDisplay');
    
    display.innerHTML = `
        <div class="artwork-detail">
            <div>
                <img src="${artwork.imageUrl}" alt="${artwork.title}" class="artwork-detail-image"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFydHdvcmsgSW1hZ2U8L3RleHQ+PC9zdmc+'">
            </div>
            <div class="artwork-info">
                <h1>${artwork.title}</h1>
                <h2 style="color: var(--primary-light); margin-bottom: 1.5rem;">By ${artwork.artist}</h2>
                
                <div class="artwork-meta">
                    <div class="meta-item">
                        <span class="meta-label">Year Created</span>
                        <span class="meta-value">${artwork.year}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Medium</span>
                        <span class="meta-value">${artwork.medium}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Dimensions</span>
                        <span class="meta-value">${artwork.dimensions}</span>
                    </div>
                </div>
                
                <div style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem;">About this Artwork</h3>
                    <p style="line-height: 1.8; font-size: 1.1rem;">${artwork.description}</p>
                </div>
                
                <div style="margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                    <a href="scanner.html" class="btn btn-primary">
                        <i class="fas fa-redo"></i>
                        Scan Another Artwork
                    </a>
                    <button class="btn btn-secondary" onclick="shareArtwork('${artwork.id}')">
                        <i class="fas fa-share"></i>
                        Share this Artwork
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.title = `${artwork.title} by ${artwork.artist} - ArtView Museum`;
}

function showError(message) {
    const display = document.getElementById('artworkDisplay');
    display.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 3rem;">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Unable to Load Artwork</h3>
            <p>${message}</p>
            <a href="scanner.html" class="btn btn-primary" style="margin-top: 1rem;">
                <i class="fas fa-qrcode"></i>
                Go to Scanner
            </a>
        </div>
    `;
}

function shareArtwork(artworkId) {
    const url = `${window.location.origin}/artwork.html?id=${artworkId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this artwork!',
            text: 'I found this interesting artwork at the museum',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Artwork link copied to clipboard!');
        }).catch(() => {
            prompt('Copy this link to share:', url);
        });
    }
}