from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os

app = FastAPI(
    title="Mushroom Recognition API", 
    description="가벼운 모델(MobileNetV2)을 활용한 버섯 이미지 분류 API"
)

# 모델 로드 (가벼운 데모용 MobileNetV2)
model = tf.keras.applications.MobileNetV2(weights='imagenet')
decode_predictions = tf.keras.applications.mobilenet_v2.decode_predictions
preprocess_input = tf.keras.applications.mobilenet_v2.preprocess_input

def process_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((224, 224))
    image_array = np.array(image)
    image_array = np.expand_dims(image_array, axis=0)
    return preprocess_input(image_array)

@app.post("/predict", summary="버섯 이미지 인식 및 예측")
async def predict_mushroom(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        processed_img = process_image(contents)
        
        preds = model.predict(processed_img)
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
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.get("/health", summary="헬스체크 API")
def health_check():
    return {
        "status": "ok", 
        "message": "버섯 인식 API 서버가 정상적으로 실행 중입니다."
    }

# 프론트엔드 연결 (가장 아래에 위치해야 기존 API 경로를 덮어쓰지 않습니다)
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
