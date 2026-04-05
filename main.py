from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import cv2
import numpy as np
from deepface import DeepFace
app = FastAPI(
    title="Emotion Recognition API", 
    description="가벼운 얼굴 인식 및 감정 예측 API 서버 (MLOps 파이프라인용)"
)

@app.post("/predict")
async def predict_emotion(file: UploadFile = File(...)):
    """
    이미지 파일을 업로드하면 얼굴을 인식하고 감정을 예측합니다.
    """
    # 파일 확장자 검사
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="이미지 파일(.png, .jpg, .jpeg)만 지원합니다.")

    try:
        # 업로드된 이미지를 메모리에서 읽어 OpenCV 형식으로 변환
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("이미지를 읽을 수 없거나 데이터가 손상되었습니다.")

        # DeepFace를 활용한 감정 분석
        # 첫 실행 시 모델 가중치(weights)를 자동으로 ~/.deepface 에 다운로드합니다.
        # enforce_detection=False는 얼굴이 부분적으로 보이거나 작을 때 에러를 피하기 위해 설정
        result = DeepFace.analyze(img_path=img, actions=['emotion'], enforce_detection=False)
        
        # 결과가 여러 얼굴을 찾은 경우 (리스트 형태), 메인 얼굴 하나를 선택
        if isinstance(result, list):
            result = result[0]
            
        dominant_emotion = result.get('dominant_emotion', 'unknown')
        emotion_probabilities = result.get('emotion', {})

        return {
            "filename": file.filename,
            "status": "success",
            "dominant_emotion": dominant_emotion,
            "emotion_probabilities": emotion_probabilities
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 분석 중 오류가 발생했습니다: {str(e)}")

# 정적 파일들을 서빙하기 위한 마운트 (CSS, JS 등)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_index():
    # 사용자가 접속 시 멋진 UI가 담긴 index.html을 반환
    return FileResponse("static/index.html")

if __name__ == "__main__":
    # 로컬 개발/디버깅을 위한 서버 실행
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
