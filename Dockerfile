# 파이썬 3.10 슬림 이미지 (경량형 베이스 이미지 사용)
FROM python:3.10-slim

# 컨테이너 내 환경 변수 최적화
# PYTHONDONTWRITEBYTECODE: 파이썬이 .pyc 파일을 생성하지 않도록 하여 용량 절약
# PYTHONUNBUFFERED: 로그가 버퍼링 없이 즉시 출력되도록 설정 (로깅 모니터링에 유리)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# opencv-python-headless 패키지를 사용하므로, 
# 별도의 OS 그래픽 라이브러리(libgl1 등)는 설치할 필요가 없습니다.

# 루트(Root) 권한 실행 방지를 위한 비권한 유저 생성 (보안 모범 사례 적용)
RUN useradd -m appuser

# 패키지 요구사항 목록만 먼저 복사하여 레이어 캐싱 활용 (코드가 변경되어도 패키지 재설치를 피함)
COPY requirements.txt .

# pip 패키지 설치 (--no-cache-dir 로 캐시가 이미지 용량을 차지하는 것을 방지)
RUN pip install --no-cache-dir -r requirements.txt

# 어플리케이션 계정으로 전환
USER appuser

# 작업 디렉토리에 전체 코드 복사 (소유권을 appuser로 지정)
COPY --chown=appuser:appuser . .

# (참고: 빌드 시점의 모델 사전 다운로드는 GitHub Actions(Ubuntu)의 
# 가상 환경과 TensorFlow 충돌 버그가 있어 제거했습니다. 
# 대신 서버 구동 후 첫 번째 Predict 요청 시 자동으로 가중치가 다운로드됩니다.)

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
