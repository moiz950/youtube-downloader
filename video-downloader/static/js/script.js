// Global variables
let currentDownloadId = null;
let progressInterval = null;
let currentVideoInfo = null;

// DOM Elements
const videoUrlInput = document.getElementById('videoUrl');
const analyzeBtn = document.getElementById('analyzeBtn');
const videoInfoSection = document.getElementById('videoInfoSection');
const progressSection = document.getElementById('progressSection');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const closeErrorModal = document.getElementById('closeErrorModal');

// Platform colors and icons
const platformConfig = {
    youtube: {
        color: '#ff0000',
        icon: 'fab fa-youtube',
        name: 'YouTube'
    },
    facebook: {
        color: '#1877f2',
        icon: 'fab fa-facebook',
        name: 'Facebook'
    },
    instagram: {
        color: '#e1306c',
        icon: 'fab fa-instagram',
        name: 'Instagram'
    },
    tiktok: {
        color: '#000000',
        icon: 'fab fa-tiktok',
        name: 'TikTok'
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    startCleanupCycle();
    showWelcomeAnimation();
});

// Event Listeners
function initializeEventListeners() {
    analyzeBtn.addEventListener('click', analyzeVideo);
    videoUrlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') analyzeVideo();
    });
    
    document.getElementById('downloadBtn').addEventListener('click', startDownload);
    document.getElementById('cancelBtn').addEventListener('click', cancelDownload);
    document.getElementById('downloadFileBtn').addEventListener('click', downloadFile);
    closeErrorModal.addEventListener('click', hideErrorModal);
    document.querySelector('.close-modal').addEventListener('click', hideErrorModal);
    
    // Close modal when clicking outside
    errorModal.addEventListener('click', function(e) {
        if (e.target === errorModal) hideErrorModal();
    });
}

// Show welcome animation
function showWelcomeAnimation() {
    const heroTitle = document.querySelector('.hero-title');
    heroTitle.style.opacity = '0';
    heroTitle.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        heroTitle.style.transition = 'all 0.8s ease';
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'translateY(0)';
    }, 500);
    
    // Animate platform icons
    const platformIcons = document.querySelectorAll('.platform-icon');
    platformIcons.forEach((icon, index) => {
        icon.style.opacity = '0';
        icon.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            icon.style.transition = 'all 0.5s ease';
            icon.style.opacity = '1';
            icon.style.transform = 'scale(1)';
        }, 800 + (index * 100));
    });
}

// Analyze video URL
async function analyzeVideo() {
    const url = videoUrlInput.value.trim();
    
    if (!url) {
        showError('Please enter a video URL');
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('Please enter a valid URL');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/get_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentVideoInfo = data;
            displayVideoInfo(data);
        } else {
            showError(data.error || 'Failed to analyze video');
        }
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

// Validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Display video information
function displayVideoInfo(info) {
    const thumbnail = document.getElementById('videoThumbnail');
    const title = document.getElementById('videoTitle');
    const platformBadge = document.getElementById('platformBadge');
    const videoPlatform = document.getElementById('videoPlatform');
    const qualityButtons = document.getElementById('qualityButtons');
    
    // Set thumbnail with fallback
    thumbnail.src = info.thumbnail || '/static/images/default-thumbnail.jpg';
    thumbnail.onerror = function() {
        this.src = '/static/images/default-thumbnail.jpg';
    };
    
    // Set title
    title.textContent = info.title || 'Untitled Video';
    
    // Set platform info
    const platform = info.platform;
    const platformData = platformConfig[platform];
    
    platformBadge.textContent = platformData.name;
    platformBadge.style.background = platformData.color;
    
    videoPlatform.innerHTML = `<i class="${platformData.icon}"></i> ${platformData.name}`;
    videoPlatform.style.color = platformData.color;
    
    // Create quality buttons
    qualityButtons.innerHTML = '';
    const qualities = info.qualities || ['144p', '360p', '480p', '720p', '1080p'];
    
    qualities.forEach((quality, index) => {
        const button = document.createElement('button');
        button.className = `quality-btn ${index === qualities.length - 1 ? 'selected' : ''}`;
        button.textContent = quality;
        button.dataset.quality = quality;
        
        button.addEventListener('click', function() {
            document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
        });
        
        qualityButtons.appendChild(button);
    });
    
    // Show video info section with animation
    videoInfoSection.classList.remove('hidden');
    videoInfoSection.style.opacity = '0';
    videoInfoSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        videoInfoSection.style.transition = 'all 0.5s ease';
        videoInfoSection.style.opacity = '1';
        videoInfoSection.style.transform = 'translateY(0)';
    }, 100);
    
    // Scroll to video info
    videoInfoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Start download process
async function startDownload() {
    if (!currentVideoInfo) {
        showError('No video information available');
        return;
    }
    
    const selectedQuality = document.querySelector('.quality-btn.selected');
    if (!selectedQuality) {
        showError('Please select a quality');
        return;
    }
    
    const quality = selectedQuality.dataset.quality;
    
    showLoading('Starting download...');
    
    try {
        const response = await fetch('/start_download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: videoUrlInput.value.trim(),
                platform: currentVideoInfo.platform,
                quality: quality
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentDownloadId = data.download_id;
            startProgressTracking(data.download_id);
            showProgressSection(data);
        } else {
            showError(data.error || 'Failed to start download');
        }
    } catch (error) {
        console.error('Download start error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

// Show progress section
function showProgressSection(data) {
    progressSection.classList.remove('hidden');
    videoInfoSection.classList.add('hidden');
    
    const fileName = document.getElementById('progressFileName');
    fileName.textContent = data.title || 'Video Download';
    
    // Animate progress section entrance
    progressSection.style.opacity = '0';
    progressSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        progressSection.style.transition = 'all 0.5s ease';
        progressSection.style.opacity = '1';
        progressSection.style.transform = 'translateY(0)';
    }, 100);
    
    // Scroll to progress section
    progressSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Start tracking download progress
function startProgressTracking(downloadId) {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(async () => {
        try {
            const response = await fetch(`/progress/${downloadId}`);
            const progress = await response.json();
            
            updateProgressDisplay(progress);
            
            if (progress.completed || progress.error) {
                clearInterval(progressInterval);
                if (progress.completed) {
                    showDownloadReady();
                }
                if (progress.error) {
                    showError(progress.error);
                }
            }
        } catch (error) {
            console.error('Progress tracking error:', error);
        }
    }, 1000);
}

// Update progress display
function updateProgressDisplay(progress) {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressStatus = document.getElementById('progressStatus');
    const progressETA = document.getElementById('progressETA');
    const progressSize = document.getElementById('progressSize');
    const progressSpeed = document.getElementById('progressSpeed');
    
    // Update progress bar
    const percentage = progress.percentage || 0;
    progressFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage.toFixed(1)}%`;
    
    // Update status
    progressStatus.textContent = progress.status || 'Downloading...';
    
    // Update ETA
    progressETA.textContent = progress.estimated_time || 'Calculating...';
    
    // Update speed
    progressSpeed.textContent = progress.speed || 'Calculating...';
    
    // Update file size
    if (progress.file_size && progress.downloaded_size) {
        const downloadedMB = (progress.downloaded_size / (1024 * 1024)).toFixed(1);
        const totalMB = (progress.file_size / (1024 * 1024)).toFixed(1);
        progressSize.textContent = `${downloadedMB} MB / ${totalMB} MB`;
    }
}

// Show download ready state
function showDownloadReady() {
    const downloadFileBtn = document.getElementById('downloadFileBtn');
    const progressStatus = document.getElementById('progressStatus');
    
    progressStatus.textContent = 'Download Ready!';
    downloadFileBtn.classList.remove('hidden');
    
    // Add celebration effect
    progressSection.style.animation = 'celebrate 0.5s ease';
    setTimeout(() => {
        progressSection.style.animation = '';
    }, 500);
}

// Download the file
function downloadFile() {
    if (currentDownloadId) {
        window.open(`/download/${currentDownloadId}`, '_blank');
        
        // Show success message
        showTemporaryMessage('Download started!', 'success');
        
        // Reset after a delay
        setTimeout(resetDownloader, 2000);
    }
}

// Cancel download
function cancelDownload() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    showTemporaryMessage('Download cancelled', 'info');
    resetDownloader();
}

// Reset downloader to initial state
function resetDownloader() {
    currentDownloadId = null;
    currentVideoInfo = null;
    
    videoInfoSection.classList.add('hidden');
    progressSection.classList.add('hidden');
    
    videoUrlInput.value = '';
    videoUrlInput.focus();
    
    // Reset progress display
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressPercentage').textContent = '0%';
    document.getElementById('progressStatus').textContent = 'Initializing...';
    document.getElementById('progressETA').textContent = 'Calculating...';
    document.getElementById('progressSize').textContent = '0 MB / 0 MB';
    document.getElementById('progressSpeed').textContent = '0 MB/s';
    document.getElementById('downloadFileBtn').classList.add('hidden');
}

// Loading spinner functions
function showLoading(message = 'Processing...') {
    loadingSpinner.classList.remove('hidden');
    if (message) {
        loadingSpinner.querySelector('p').textContent = message;
    }
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

// Error modal functions
function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.remove('hidden');
    
    // Add animation
    errorModal.style.opacity = '0';
    setTimeout(() => {
        errorModal.style.transition = 'opacity 0.3s ease';
        errorModal.style.opacity = '1';
    }, 10);
}

function hideErrorModal() {
    errorModal.style.opacity = '0';
    setTimeout(() => {
        errorModal.classList.add('hidden');
    }, 300);
}

// Show temporary message
function showTemporaryMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `temp-message temp-message-${type}`;
    messageEl.textContent = message;
    
    // Add styles
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    // Set background color based on type
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        info: '#4299e1',
        warning: '#ed8936'
    };
    messageEl.style.background = colors[type] || colors.info;
    
    document.body.appendChild(messageEl);
    
    // Animate in
    setTimeout(() => {
        messageEl.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

// Auto cleanup cycle
function startCleanupCycle() {
    // Cleanup every 5 minutes
    setInterval(async () => {
        try {
            await fetch('/cleanup', { method: 'POST' });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }, 5 * 60 * 1000);
}

// Add celebration animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes celebrate {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
    }
    
    .temp-message {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    /* Platform badge animations */
    .platform-badge {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    /* Progress bar glow effect */
    .progress-fill {
        box-shadow: 0 0 10px rgba(72, 187, 120, 0.5);
    }
    
    /* Progress details grid */
    .progress-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 25px;
    }
    
    .progress-detail {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: #f7fafc;
        border-radius: 8px;
        font-size: 14px;
    }
    
    .progress-detail i {
        color: #667eea;
        width: 16px;
    }
`;
document.head.appendChild(style);

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl + Enter to analyze
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        analyzeVideo();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        hideErrorModal();
        hideLoading();
    }
});

// Add network status monitoring
window.addEventListener('online', function() {
    showTemporaryMessage('Connection restored', 'success');
});

window.addEventListener('offline', function() {
    showTemporaryMessage('You are offline', 'error');
});

// Add page visibility awareness
document.addEventListener('visibilitychange', function() {
    if (document.hidden && progressInterval) {
        // Page is hidden, reduce polling frequency
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            if (currentDownloadId) {
                fetch(`/progress/${currentDownloadId}`).then(r => r.json()).then(updateProgressDisplay);
            }
        }, 5000); // Poll every 5 seconds when page is hidden
    } else if (!document.hidden && progressInterval && currentDownloadId) {
        // Page is visible again, resume normal polling
        clearInterval(progressInterval);
        startProgressTracking(currentDownloadId);
    }
});

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to format time
function formatTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeVideo,
        startDownload,
        cancelDownload,
        showError,
        hideErrorModal
    };
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
    initializeEventListeners();
}