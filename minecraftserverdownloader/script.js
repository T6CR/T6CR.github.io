document.addEventListener('DOMContentLoaded', () => {
    // Version tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    let activeVersionType = 'all'; 
    let isDownloading = false; 
    
    // Set the "All" tab as active by default
    document.querySelector('.tab-btn[data-type="all"]').classList.add('active');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeVersionType = button.dataset.type;
            loadVersions(activeVersionType);
        });
    });
    
    // Version search
    const searchInput = document.getElementById('version-search');
    searchInput.addEventListener('input', filterVersions);
    
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', downloadServer);
    
    // Add reference to cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.addEventListener('click', cancelDownload);
    
    // Load versions on startup
    loadManifest();
    
    // Variables for version data
    let versionManifest = null;
    let selectedVersion = null;
    let downloadAbortController = null;
    
    // Fetch the version manifest from Mojang
    async function loadManifest() {
        try {
            const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
            versionManifest = await response.json();
            loadVersions('all'); 
        } catch (error) {
            console.error('Failed to load version manifest:', error);
            showError('Failed to load version data. Please try again later.');
        }
    }
    
    // Load versions into the UI
    function loadVersions(type) {
        const versionList = document.getElementById('version-list');
        versionList.innerHTML = ''; 
        
        if (!versionManifest) {
            versionList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading versions...</p></div>';
            return;
        }
        
        let versions = versionManifest.versions;
        
        // Filter versions by type
        if (type !== 'all') {
            versions = versions.filter(version => {
                if (type === 'old_alpha') {
                    return version.type === 'old_alpha' || version.type === 'old_beta';
                }
                return version.type === type;
            });
        }
        
        if (versions.length === 0) {
            versionList.innerHTML = '<p class="empty-message">No versions found for this category.</p>';
            return;
        }
        
        // Create version items
        versions.forEach(version => {
            const versionItem = document.createElement('div');
            versionItem.className = 'version-item';
            if (isDownloading) {
                versionItem.classList.add('disabled');
            }
            versionItem.dataset.id = version.id;
            versionItem.dataset.type = version.type;
            versionItem.dataset.url = version.url;
            versionItem.dataset.releaseTime = version.releaseTime;
            
            versionItem.innerHTML = `
                <span class="version-name">${version.id}</span>
                <span class="version-type">${formatVersionType(version.type)}</span>
            `;
            
            versionItem.addEventListener('click', () => {
                if (!isDownloading) {
                    selectVersion(version);
                }
            });
            versionList.appendChild(versionItem);
        });
        
        // Re-apply search filter if there's text in the search box
        if (searchInput.value.trim() !== '') {
            filterVersions();
        }
    }
    
    // Format version type for display
    function formatVersionType(type) {
        switch (type) {
            case 'release': return 'Release';
            case 'snapshot': return 'Snapshot';
            case 'old_alpha': return 'Alpha';
            case 'old_beta': return 'Beta';
            default: return type;
        }
    }
    
    // Format date for display
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            });
        } catch (e) {
            return 'Unknown';
        }
    }
    
    // Filter versions based on search input
    function filterVersions() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const versionItems = document.querySelectorAll('.version-item');
        
        versionItems.forEach(item => {
            const versionName = item.querySelector('.version-name').textContent.toLowerCase();
            if (versionName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Handle version selection
    function selectVersion(version) {
        selectedVersion = version;
        
        // Update UI
        document.getElementById('selected-version').textContent = version.id;
        document.getElementById('release-date').textContent = formatDate(version.releaseTime);
        downloadBtn.disabled = false;
        
        // Update selected class
        const versionItems = document.querySelectorAll('.version-item');
        versionItems.forEach(item => {
            if (item.dataset.id === version.id) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // Reset progress
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-text').textContent = 'Ready to download';
    }
    
    // Download the server.jar file
    async function downloadServer() {
        if (!selectedVersion) return;
        
        try {
            // Set downloading flag
            isDownloading = true;
            
            // Update UI
            downloadBtn.disabled = true;
            cancelBtn.style.display = 'flex'; // Show cancel button
            document.getElementById('progress-text').textContent = 'Fetching version data...';
            
            // Disable all version items
            document.querySelectorAll('.version-item').forEach(item => {
                item.classList.add('disabled');
            });
            
            // Create a new AbortController for this download
            downloadAbortController = new AbortController();
            const signal = downloadAbortController.signal;
            
            // Fetch the version details
            const versionResponse = await fetch(selectedVersion.url, { signal });
            const versionData = await versionResponse.json();
            
            if (!versionData.downloads || !versionData.downloads.server) {
                throw new Error('Server download not available for this version');
            }
            
            const serverUrl = versionData.downloads.server.url;
            
            // Fetch the server jar file
            document.getElementById('progress-text').textContent = 'Downloading server.jar...';
            
            const response = await fetch(serverUrl, { signal });
            const contentLength = response.headers.get('content-length');
            const total = parseInt(contentLength, 10);
            
            let loaded = 0;
            const reader = response.body.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                loaded += value.length;
                
                // Update progress
                const percentComplete = Math.round((loaded / total) * 100);
                document.getElementById('progress-fill').style.width = `${percentComplete}%`;
                document.getElementById('progress-text').textContent = `Downloading: ${percentComplete}%`;
            }
            
            // Create blob and download
            const blob = new Blob(chunks);
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `minecraft_server.${selectedVersion.id}.jar`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Update UI
            document.getElementById('progress-text').textContent = 'Download complete!';
            downloadBtn.disabled = false;
            cancelBtn.style.display = 'none'; // Hide cancel button
            
            // Show confetti
            const confettiCanvas = document.createElement('canvas');
            confettiCanvas.id = 'confetti-canvas';
            confettiCanvas.style.position = 'fixed';
            confettiCanvas.style.top = '0';
            confettiCanvas.style.left = '0';
            confettiCanvas.style.width = '100%';
            confettiCanvas.style.height = '100%';
            confettiCanvas.style.pointerEvents = 'none';
            confettiCanvas.style.zIndex = '1000';
            document.body.appendChild(confettiCanvas);
            
            const confettiSettings = { 
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            };
            
            const confetti = window.confetti;
            if (confetti) {
                confetti(confettiSettings);
                
                setTimeout(() => confetti({
                    particleCount: 80,
                    spread: 100,
                    origin: { y: 0.7, x: 0.1 }
                }), 500);
                
                setTimeout(() => confetti({
                    particleCount: 80,
                    spread: 100,
                    origin: { y: 0.7, x: 0.9 }
                }), 1000);
            }
            
            setTimeout(() => {
                document.body.removeChild(confettiCanvas);
            }, 5000);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Download was canceled');
                document.getElementById('progress-text').textContent = 'Download canceled';
            } else {
                console.error('Download failed:', error);
                document.getElementById('progress-text').textContent = `Download failed: ${error.message}`;
            }
            downloadBtn.disabled = false;
            cancelBtn.style.display = 'none'; // Hide cancel button
        } finally {
            downloadAbortController = null;
            isDownloading = false;
            document.querySelectorAll('.version-item').forEach(item => {
                item.classList.remove('disabled');
            });
        }
    }
    
    // Add function to cancel download
    function cancelDownload() {
        if (downloadAbortController) {
            downloadAbortController.abort();
            downloadAbortController = null;
            
            isDownloading = false;
            document.getElementById('progress-text').textContent = 'Download canceled';
            document.getElementById('progress-fill').style.width = '0%';
            downloadBtn.disabled = false;
            cancelBtn.style.display = 'none';
            
            document.querySelectorAll('.version-item').forEach(item => {
                item.classList.remove('disabled');
            });
        }
    }
    
    // Show error message
    function showError(message) {
        const versionList = document.getElementById('version-list');
        versionList.innerHTML = `<div class="error-message">${message}</div>`;
    }
});