const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', function() {
    loadFeaturedArtworks();
});

async function loadFeaturedArtworks() {
    try {
        const response = await fetch(`${API_BASE}/api/artworks`);
        
        if (!response.ok) {
            throw new Error('Failed to load artworks');
        }
        
        const artworks = await response.json();
        displayFeaturedArtworks(artworks.slice(0, 6));
    } catch (error) {
        console.error('Error loading artworks:', error);
        document.getElementById('featuredArtworks').innerHTML = 
            '<div class="error-message">Unable to load artworks at this time. Please try again later.</div>';
    }
}

function displayFeaturedArtworks(artworks) {
    const grid = document.getElementById('featuredArtworks');
    
    if (!artworks || artworks.length === 0) {
        grid.innerHTML = '<p class="loading">No artworks available yet. Check back soon!</p>';
        return;
    }
    
    grid.innerHTML = artworks.map(artwork => `
        <div class="artwork-card">
            <img src="${artwork.imageUrl}" alt="${artwork.title}" class="artwork-image" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFydHdvcmsgSW1hZ2U8L3RleHQ+PC9zdmc+'">
            <div class="artwork-info">
                <h3 class="artwork-title">${artwork.title}</h3>
                <p class="artwork-artist">By ${artwork.artist}</p>
                <p class="artwork-description">${artwork.description.substring(0, 100)}...</p>
                <div class="artwork-actions">
                    <small>Scan QR code at museum</small>
                </div>
            </div>
        </div>
    `).join('');
}