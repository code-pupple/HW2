document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadCard = document.getElementById('uploadCard');
    const resultsSection = document.getElementById('resultsSection');
    const imagePreview = document.getElementById('imagePreview');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resetBtn = document.getElementById('resetBtn');
    const dominantEmotionText = document.getElementById('dominantEmotionText');
    const emotionBarsContainer = document.getElementById('emotionBars');

    // Color mapping for different emotions
    const emotionColors = {
        angry: '#ef4444',
        disgust: '#84cc16',
        fear: '#a855f7',
        happy: '#eab308',
        sad: '#3b82f6',
        surprise: '#0ea5e9',
        neutral: '#94a3b8'
    };

    // Browse button triggers file input
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change event
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files; // Assign files to input
            handleFile(files[0]);
        }
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        uploadCard.classList.remove('hidden');
        fileInput.value = '';
        emotionBarsContainer.innerHTML = '';
    });

    // Process the selected file
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        // Generate preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload and Predict
        uploadImage(file);
    }

    async function uploadImage(file) {
        // Show loading and switch views
        uploadCard.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to analyze image');
            }

            displayResults(data);
        } catch (error) {
            alert(error.message);
            resetBtn.click(); // Go back to start
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function displayResults(data) {
        resultsSection.classList.remove('hidden');
        
        dominantEmotionText.textContent = data.dominant_emotion;
        
        const genderText = document.getElementById('dominantGenderText');
        if (genderText && data.dominant_gender) {
            // Include confidence percentage if we have gender_probabilities
            const genderConf = data.gender_probabilities[data.dominant_gender];
            const confText = genderConf ? ` (${genderConf.toFixed(1)}%)` : '';
            genderText.textContent = data.dominant_gender + confText;
        }

        // Clear previous bars
        emotionBarsContainer.innerHTML = '';

        // Sort emotions by probability descending
        const sortedEmotions = Object.entries(data.emotion_probabilities)
            .sort(([,a], [,b]) => b - a);

        // Create bars
        sortedEmotions.forEach(([emotion, probability]) => {
            const percentage = probability.toFixed(1);
            const color = emotionColors[emotion] || emotionColors.neutral;

            const itemHtml = `
                <div class="emotion-item">
                    <div class="emotion-label-row">
                        <span class="emotion-name">${emotion}</span>
                        <span class="emotion-value">${percentage}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="background-color: ${color}; width: 0%;"></div>
                    </div>
                </div>
            `;
            emotionBarsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });

        // Trigger animation after a tiny delay
        setTimeout(() => {
            const fills = emotionBarsContainer.querySelectorAll('.progress-fill');
            sortedEmotions.forEach(([emotion, probability], index) => {
                fills[index].style.width = probability + '%';
            });
        }, 50);
    }
});
