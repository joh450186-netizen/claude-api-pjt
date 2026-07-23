# claude-api-pjt

냉장고 사진을 업로드하면 AI가 재료를 인식하고, 인식된 재료로 새 레시피를 생성해주는 실험용 웹 서비스입니다. [OpenRouter](https://openrouter.ai)의 무료 모델을 사용합니다.

## 주요 기능

- **재료 인식** (`POST /api/inventory/recognize`): 이미지 URL을 비전 지원 모델(`nvidia/nemotron-nano-12b-v2-vl:free`)에 전달해, 사전에 정의된 목록에 제한되지 않고 사진 속에 실제로 보이는 식재료를 자유롭게 인식합니다.
- **레시피 생성** (`POST /api/recipes/recommend`): 인식된 재료 목록을 텍스트 생성 모델(`openai/gpt-oss-20b:free`)에 전달해, 기존 레시피를 검색하는 것이 아니라 그 재료로 만들 수 있는 새로운 레시피 3가지를 직접 생성합니다.
- 간단한 웹 UI(`public/index.html`)에서 이미지 URL 입력/파일 업로드 → 인식 → 레시피 생성까지 한 번에 테스트할 수 있습니다.
- Vercel 서버리스 배포 지원(`api/index.js`, `vercel.json`) — `app.js`에 Express 앱을 정의하고, 로컬 실행용 `server.js`와 Vercel 서버리스 진입점 `api/index.js`가 이를 공유합니다.

## 시작하기

```bash
npm install
cp .env.example .env
# .env 파일에 OPENROUTER_API_KEY 입력
npm run dev
```

기본적으로 `http://localhost:3000` 에서 서버가 실행되며, 같은 주소에서 웹 UI를 바로 사용할 수 있습니다.

## Vercel 배포

1. GitHub 저장소를 Vercel 프로젝트로 import
2. Vercel 프로젝트 설정 → Environment Variables에 `OPENROUTER_API_KEY` 등록 (`.env`는 커밋되지 않으므로 로컬 값과 별개로 반드시 설정 필요)
3. `vercel.json`이 `api/index.js`를 서버리스 함수로 빌드하도록 지정되어 있어 별도 설정 없이 배포됩니다.

## 프로젝트 구조

```
app.js                  # Express 앱 정의 (라우터 등록)
server.js               # 로컬 개발용 진입점 (app.listen)
api/index.js            # Vercel 서버리스 진입점
vercel.json             # Vercel 빌드/라우팅 설정
config.js               # 환경 변수 로드 및 검증
routes/inventory.js     # 재료 인식 API
routes/recipes.js       # 레시피 생성 API
services/openrouter.js  # OpenRouter API 호출 (vision 인식, 텍스트 생성)
public/index.html       # 테스트용 웹 UI
docs/                   # 기능별 PRD 문서 (초기 rerank/임베딩 기반 설계 기록 — 현재 구현과 다를 수 있음)
```

## 참고 사항

- OpenRouter 무료 모델은 계정당 **하루 50회 요청** 한도가 있습니다. 재료 인식 1회 + 레시피 생성 1회로 요청 2건이 소모됩니다.
- `.env`는 커밋되지 않습니다. API 키는 `config.validateEnv()`를 통해 앱 시작 시 존재 여부만 검증되며 로그에 노출되지 않습니다.
- `docs/PRD_01.md`, `docs/PRD_02.md`는 초기 rerank/임베딩 기반 설계를 검증하며 작성된 기록으로, 현재는 비전 인식 + 레시피 생성 방식으로 전환되어 일부 내용이 실제 구현과 다릅니다.
