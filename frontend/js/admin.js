const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', function() {
    const user = checkAdminAuth();
    if (!user) return;
    
    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome) {
        userWelcome.textContent = user.username;
    }
    
    setupEventListeners();
    loadAdminArtworks();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

function setupEventListeners() {
    const uploadForm = document.getElementById('uploadForm');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('image');
    const downloadQRBtn = document.getElementById('downloadQR');
    const addAnotherBtn = document.getElementById('addAnother');
    
    if (uploadForm) uploadForm.addEventListener('submit', handleArtworkUpload);
    if (fileUploadArea) fileUploadArea.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    if (downloadQRBtn) downloadQRBtn.addEventListener('click', downloadQRCode);
    if (addAnotherBtn) addAnotherBtn.addEventListener('click', resetForm);
    
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = 'var(--primary)';
            fileUploadArea.style.background = 'var(--gray-light)';
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.style.borderColor = 'var(--border)';
            fileUploadArea.style.background = 'var(--white)';
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = 'var(--border)';
            fileUploadArea.style.background = 'var(--white)';
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect();
            }
        });
    }
}

function handleFileSelect() {
    const fileInput = document.getElementById('image');
    const filePreview = document.getElementById('filePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            filePreview.innerHTML = `
                <div style="text-align: center; margin-top: 1rem;">
                    <img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 8px;">
                    <p style="margin-top: 0.5rem; font-size: 0.9rem;">${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                </div>
            `;
        };
        
        reader.readAsDataURL(file);
    }
}

async function handleArtworkUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const submitBtn = this.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/artworks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }
        
        const artwork = await response.json();
        showUploadResult(artwork);
        loadAdminArtworks();
        
    } catch (error) {
        alert('Error uploading artwork: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Artwork & Generate QR Code';
    }
}

function showUploadResult(artwork) {
    const uploadForm = document.getElementById('uploadForm');
    const uploadResult = document.getElementById('uploadResult');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    
    qrCodeContainer.innerHTML = `
        <div class="qr-code" style="text-align: center;">
            <h4 style="color: var(--primary); margin-bottom: 1rem;">
                <i class="fas fa-check-circle"></i> QR Code Generated
            </h4>
            <img src="${artwork.qrCodeUrl}?t=${Date.now()}" 
                 alt="QR Code for ${artwork.title}" 
                 style="max-width: 250px; border: 2px solid #ddd; border-radius: 8px; padding: 10px; background: white;"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlFSIENvZGU8L3RleHQ+PC9zdmc+'">
            <div style="margin-top: 1rem;">
                <p><strong>Artwork ID:</strong> <code>${artwork.id}</code></p>
                <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                    Visitors can scan this code or enter the ID manually
                </p>
            </div>
        </div>
    `;
    
    uploadForm.style.display = 'none';
    uploadResult.style.display = 'block';
    uploadResult.scrollIntoView({ behavior: 'smooth' });
    
    uploadResult.dataset.artworkId = artwork.id;
}

function downloadQRCode() {
    const uploadResult = document.getElementById('uploadResult');
    const artworkId = uploadResult.dataset.artworkId;
    
    if (artworkId) {
        const token = localStorage.getItem('authToken');
        window.open(`${API_BASE}/api/admin/download-qr/${artworkId}?token=${token}`, '_blank');
    }
}

function resetForm() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadResult = document.getElementById('uploadResult');
    const filePreview = document.getElementById('filePreview');
    
    uploadForm.reset();
    uploadForm.style.display = 'block';
    uploadResult.style.display = 'none';
    filePreview.innerHTML = '';
    
    uploadForm.scrollIntoView({ behavior: 'smooth' });
}

async function loadAdminArtworks() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/artworks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load artworks');
        }
        
        const artworks = await response.json();
        displayAdminArtworks(artworks);
        updateArtworkCount(artworks.length);
    } catch (error) {
        console.error('Error loading artworks:', error);
        document.getElementById('adminArtworksGrid').innerHTML = 
            '<div class="error-message">Error loading artworks. Please refresh the page.</div>';
    }
}

function displayAdminArtworks(artworks) {
    const grid = document.getElementById('adminArtworksGrid');
    
    if (!artworks || artworks.length === 0) {
        grid.innerHTML = '<p class="loading">No artworks uploaded yet. Start by uploading your first artwork!</p>';
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
                    <span style="font-size: 0.8rem; background: var(--gray-light); padding: 4px 8px; border-radius: 4px;">
                        ID: ${artwork.id.substring(0, 8)}...
                    </span>
                    <button onclick="deleteArtwork('${artwork.id}')" class="btn" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateArtworkCount(count) {
    const countElement = document.getElementById('artworkCount');
    if (countElement) {
        countElement.textContent = `${count} artwork${count !== 1 ? 's' : ''}`;
    }
}

async function deleteArtwork(artworkId) {
    if (!confirm('Are you sure you want to delete this artwork? This will remove it from the online database and delete all associated images.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/artworks/${artworkId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Delete failed');
        }
        
        alert('Artwork deleted successfully from online database!');
        loadAdminArtworks();
    } catch (error) {
        alert('Error deleting artwork: ' + error.message);
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'login.html';
}