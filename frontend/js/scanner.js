const API_BASE = window.location.origin;

let scannerEngagementId = null;
let scannerStartTime = null;
let scannerInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    setupScannerOptions();
    
    const urlParams = new URLSearchParams(window.location.search);
    const artworkId = urlParams.get('id');
    
    if (artworkId) {
        loadArtworkDetails(artworkId);
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
});

function setupScannerOptions() {
    const optionCards = document.querySelectorAll('.option-card');
    const sections = document.querySelectorAll('.scanner-section');
    
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            const target = this.id.replace('option', '').toLowerCase() + 'Section';
            
            optionCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(section => {
                section.style.display = section.id === target ? 'block' : 'none';
            });
        });
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const uploadArea = document.getElementById('uploadArea');
    const originalContent = uploadArea.innerHTML;
    
    uploadArea.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>Processing QR Code</h3>
            <p>Analyzing uploaded image...</p>
        </div>
    `;
    
    processUploadedImage(file)
        .then(artworkId => {
            if (artworkId) {
                loadArtworkDetails(artworkId);
            } else {
                showManualInput(uploadArea, file);
            }
        })
        .catch(error => {
            console.error('Error processing image:', error);
            showManualInput(uploadArea, file);
        });
}

function processUploadedImage(file) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const fileName = file.name.toLowerCase();
            
            if (fileName.includes('qr') || fileName.includes('code')) {
                const match = fileName.match(/(artwork|art|id)[_-]?([a-z0-9-]+)/i);
                if (match && match[2]) {
                    resolve(match[2]);
                    return;
                }
            }
            
            resolve(null);
        }, 2000);
    });
}

function showManualInput(uploadArea, file) {
    uploadArea.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-qrcode" style="font-size: 3rem; margin-bottom: 1rem; color: var(--primary);"></i>
            <h3>QR Code Detected</h3>
            <p>We found a QR code in your image. Please enter the artwork ID below:</p>
            <div style="margin-top: 1.5rem;">
                <div class="input-group">
                    <input type="text" id="extractedCode" placeholder="Enter artwork ID from QR code" 
                           style="flex: 1; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius);">
                    <button onclick="loadArtworkFromExtracted()" class="btn btn-primary">
                        <i class="fas fa-search"></i>
                        Load Artwork
                    </button>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-light); margin-top: 1rem;">
                    File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)
                </p>
            </div>
        </div>
    `;
}

function loadArtworkFromExtracted() {
    const extractedCodeInput = document.getElementById('extractedCode');
    if (!extractedCodeInput) return;
    
    const artworkId = extractedCodeInput.value.trim();
    if (!artworkId) {
        alert('Please enter an artwork ID');
        return;
    }
    
    loadArtworkDetails(artworkId);
}

function loadArtworkManually() {
    const manualCode = document.getElementById('manualCode');
    if (!manualCode) return;
    
    const artworkId = manualCode.value.trim();
    if (!artworkId) {
        alert('Please enter an artwork ID');
        return;
    }
    
    loadArtworkDetails(artworkId);
}

async function loadArtworkDetails(artworkId) {
    try {
        const scannerResult = document.getElementById('scannerResult');
        const errorMessage = document.getElementById('errorMessage');
        
        if (scannerResult) {
            scannerResult.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Loading artwork details...</p>
                </div>
            `;
            scannerResult.style.display = 'block';
        }
        if (errorMessage) errorMessage.style.display = 'none';
        
        const response = await fetch(`${API_BASE}/api/artworks/${artworkId}`);
        
        if (!response.ok) {
            throw new Error('Artwork not found');
        }
        
        const artwork = await response.json();
        displayArtworkDetails(artwork);
        
    } catch (error) {
        console.error('Error loading artwork:', error);
        showError();
    }
}

function displayArtworkDetails(artwork) {
    const scannerResult = document.getElementById('scannerResult');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!scannerResult) return;
    
    scannerResult.innerHTML = `
        <div class="artwork-detail">
            <div>
                <img src="${artwork.imageUrl}" alt="${artwork.title}" class="artwork-detail-image"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFydHdvcmsgSW1hZ2U8L3RleHQ+PC9zdmc+'">
            </div>
            <div class="artwork-info">
                <h2>${artwork.title}</h2>
                <h3 style="color: var(--primary-light); margin-bottom: 1.5rem;">By ${artwork.artist}</h3>
                
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
                    <div class="meta-item">
                        <span class="meta-label">Artwork ID</span>
                        <span class="meta-value">${artwork.id}</span>
                    </div>
                </div>
                
                <!-- Engagement Time Display -->
                <div id="scannerEngagementTime" style="margin: 1.5rem 0; padding: 1rem; background: var(--gray-light); border-radius: var(--radius); display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 500;">Time spent viewing:</span>
                        <span id="scannerTimeDisplay" style="font-weight: bold; color: var(--primary);">0s</span>
                    </div>
                </div>
                
                <div style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem;">About this Artwork</h4>
                    <p style="line-height: 1.8;">${artwork.description}</p>
                </div>
                
                <div style="margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="scanAnother()">
                        <i class="fas fa-redo"></i>
                        Scan Another
                    </button>
                    <button class="btn btn-secondary" onclick="shareArtwork('${artwork.id}')">
                        <i class="fas fa-share"></i>
                        Share
                    </button>
                </div>
            </div>
        </div>
    `;
    
    scannerResult.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
    scannerResult.scrollIntoView({ behavior: 'smooth' });
    
    startScannerEngagement(artwork.id);
}

async function startScannerEngagement(artworkId) {
    try {
        scannerStartTime = new Date();
        
        const sessionId = localStorage.getItem('museum_session_id') || generateScannerSessionId();
        localStorage.setItem('museum_session_id', sessionId);
        
        const response = await fetch(`${API_BASE}/api/engagement/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': sessionId
            },
            body: JSON.stringify({ artworkId, pageType: 'scanner' })
        });

        if (response.ok) {
            const data = await response.json();
            scannerEngagementId = data.engagementId;
            
            const engagementDiv = document.getElementById('scannerEngagementTime');
            if (engagementDiv) {
                engagementDiv.style.display = 'block';
            }
            
            scannerInterval = setInterval(updateScannerTimeDisplay, 1000);
            
            setupScannerEngagementCleanup();
        }
    } catch (error) {
        console.error('Error starting scanner engagement:', error);
    }
}

function generateScannerSessionId() {
    return 'scanner_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateScannerTimeDisplay() {
    if (!scannerStartTime) return;
    
    const now = new Date();
    const duration = Math.floor((now - scannerStartTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    const timeDisplay = document.getElementById('scannerTimeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = `${minutes}m ${seconds}s`;
    }
}

function setupScannerEngagementCleanup() {
    window.scannerEngagementCleanup = async function() {
        if (scannerEngagementId) {
            try {
                const sessionId = localStorage.getItem('museum_session_id');
                await fetch(`${API_BASE}/api/engagement/end`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-ID': sessionId
                    },
                    body: JSON.stringify({ engagementId: scannerEngagementId })
                });
            } catch (error) {
                console.error('Error ending scanner engagement:', error);
            }
            
            scannerEngagementId = null;
            scannerStartTime = null;
            
            if (scannerInterval) {
                clearInterval(scannerInterval);
                scannerInterval = null;
            }
        }
    };
}

function showError() {
    const scannerResult = document.getElementById('scannerResult');
    const errorMessage = document.getElementById('errorMessage');
    
    if (scannerResult) scannerResult.style.display = 'none';
    if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.scrollIntoView({ behavior: 'smooth' });
    }
}

function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) errorMessage.style.display = 'none';
}

function scanAnother() {
    if (window.scannerEngagementCleanup) {
        window.scannerEngagementCleanup();
    }
    
    const scannerResult = document.getElementById('scannerResult');
    const manualCode = document.getElementById('manualCode');
    const uploadArea = document.getElementById('uploadArea');
    
    if (scannerResult) scannerResult.style.display = 'none';
    if (manualCode) manualCode.value = '';
    
    if (uploadArea) {
        uploadArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <h3>Upload QR Code Image</h3>
            <p>Drag & drop or click to select a file</p>
            <span>Supports JPG, PNG, GIF</span>
            <input type="file" id="fileInput" accept="image/*">
        `;
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    const manualSection = document.getElementById('manualSection');
    if (manualSection) manualSection.style.display = 'block';
    
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        card.classList.remove('active');
        if (card.id === 'optionManual') {
            card.classList.add('active');
        }
    });
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