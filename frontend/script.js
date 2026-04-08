const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const imagePreview = document.getElementById('imagePreview');
const resetBtn = document.getElementById('resetBtn');
const loadingArea = document.getElementById('loadingArea');
const resultArea = document.getElementById('resultArea');
const resultTitle = document.getElementById('resultTitle');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceText = document.getElementById('confidenceText');

// UI 상태 전환 애니메이션 핸들러
function showState(state) {
    dropZone.style.display = state === 'upload' ? 'block' : 'none';
    previewArea.style.display = (state === 'preview' || state === 'result') ? 'block' : 'none';
    loadingArea.style.display = state === 'loading' ? 'block' : 'none';
    resultArea.style.display = state === 'result' ? 'block' : 'none';
    
    if (state === 'upload') {
        fileInput.value = '';
    }
}

// 업로드 이벤트: 클릭
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

// 업로드 이벤트: 드래그 앤 드롭 지원
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

// 리셋 (다른 사진 버튼)
resetBtn.addEventListener('click', () => {
    showState('upload');
    confidenceFill.style.width = '0%';
});

// 파일 핸들링 및 프리뷰 로드
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('지원되지 않는 형식입니다. 이미지 파일(PNG, JPG 등)만 업로드해주세요.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        showState('loading');
        // 애니메이션 효과를 위해 0.5초 고의 딜레이
        setTimeout(() => uploadAndPredict(file), 500); 
    };
    reader.readAsDataURL(file);
}

// 실제 서버(FastAPI) 전송 로직
async function uploadAndPredict(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('서버와의 통신에 실패했습니다.');

        const data = await response.json();
        
        if (data.status === 'success') {
            displayResult(data.predicted_label, data.confidence);
        } else {
            throw new Error(data.message || '예측 실패');
        }
    } catch (error) {
        alert('오류 발생: ' + error.message);
        showState('upload');
    }
}

// 결과 디자인 렌더링
function displayResult(label, confidence) {
    showState('result');
    resultTitle.textContent = label;
    
    // 확률(0.95 -> 95.0%)
    const percentage = (confidence * 100).toFixed(1);
    
    // 시각적 만족감을 위한 트랜지션 시간차 적용
    setTimeout(() => {
        confidenceFill.style.width = `${percentage}%`;
        confidenceText.textContent = `정확도(Confidence): ${percentage}%`;
    }, 150);
}
