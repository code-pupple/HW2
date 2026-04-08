from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = FastAPI(
    title="Mushroom Recognition API", 
    description="가벼운 모델(MobileNetV2)을 활용한 버섯 이미지 분류 API"
)

# 모델 로드: MLOps 파이프라인에서 실제 학습된 버섯 전용 모델(.h5, .keras 또는 SavedModel)로 교체 예정
# 데모 및 개발 환경 테스트를 위해 ImageNet으로 사전 학습된 가벼운 모델인 MobileNetV2를 예시로 사용합니다.
model = tf.keras.applications.MobileNetV2(weights='imagenet')
decode_predictions = tf.keras.applications.mobilenet_v2.decode_predictions
preprocess_input = tf.keras.applications.mobilenet_v2.preprocess_input

def process_image(image_bytes: bytes):
    # 이미지 열기 및 RGB 변환
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    # MobileNetV2 입력 크기에 맞게 리사이징 (224x224)
    image = image.resize((224, 224))
    image_array = np.array(image)
    image_array = np.expand_dims(image_array, axis=0)
    # 모델에 맞는 전처리 (Scaling)
    return preprocess_input(image_array)

@app.post("/predict", summary="버섯 이미지 인식 및 예측")
async def predict_mushroom(file: UploadFile = File(...)):
    """
    버섯 이미지를 업로드받아 어떤 종류(또는 가장 유사한 객체)인지 예측합니다.
    """
    try:
        contents = await file.read()
        processed_img = process_image(contents)
        
        # 모델 예측 수행
        preds = model.predict(processed_img)
        # 상위 3개의 예측 결과 디코딩
        results = decode_predictions(preds, top=3)[0] 
        
        predictions = [{"label": label, "probability": round(float(prob), 4)} for (_, label, prob) in results]
        best_match = predictions[0]["label"]
        
        return {
            "status": "success",
            "filename": file.filename,
            "predicted_label": best_match,
            "confidence": predictions[0]["probability"],
            "top_predictions": predictions
        }
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": f"이미지 처리 중 오류가 발생했습니다: {str(e)}"})

@app.get("/", summary="헬스체크 API")
def health_check():
    return {
        "status": "ok", 
        "message": "버섯 인식 API 서버가 정상적으로 실행 중입니다."
    }
