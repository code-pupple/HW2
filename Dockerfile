# ---------------------------------------------------------
# 배포와 보안이 최적화된 Dockerfile (Production Ready)
# ---------------------------------------------------------
FROM python:3.10-slim

# 환경 변수 설정
# PYTHONDONTWRITEBYTECODE: 파이썬이 .pyc 파일을 생성하지 않게 하여 공간 절약
# PYTHONUNBUFFERED: 파이썬 로그가 버퍼링 없이 즉시 터미널에 출력되게 하여 컨테이너 로그 추적 용이
# TF_CPP_MIN_LOG_LEVEL: 텐서플로우 불필요한 경고 메시지 방지
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2

# 권한 분리: 루트(root)로 컨테이너가 실행되는 것을 방지하기 위한 유저 생성
RUN adduser --disabled-password --gecos '' appuser

WORKDIR /app

# 시스템 의존성 설치 밑 패키지 캐시 즉시 제거 (도커 이미지 레이어 크기 축소 핵심)
# --no-install-recommends 로 불필요한 부가 패키지 설치 차단
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 의존성 파일(requirements.txt)만 먼저 복사
# 이유: 소스 코드가 변경되더라도 의존성이 변경되지 않으면 이 밑의 레이어는 캐시를 재사용 (빌드 속도 최적화)
COPY requirements.txt .

# 파이썬 패키지 설치
# --no-cache-dir 옵션으로 pip 로컬 임시 캐시를 남기지 않음
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 애플리케이션 소스 코드 복사
COPY . .

# 보안: 앱 디렉토리의 소유권을 새로 만든 비권한 사용자로 변경
RUN chown -R appuser:appuser /app

# 생성한 비권한 계정으로 사용자 전환
USER appuser

EXPOSE 8000

# 컨테이너 실행 명령어 명시 (작업자 1개 설정 - MLOps 리소스 제어 시)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
