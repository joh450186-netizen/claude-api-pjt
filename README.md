# claude-api-pjt

냉장고 사진을 업로드하면 재료를 인식하고, 인식된 재료를 바탕으로 레시피를 추천해주는 실험용 웹 서비스입니다. [OpenRouter](https://openrouter.ai)의 무료 모델(rerank / embedding)을 사용합니다.

## 주요 기능

- **재료 인식** (`POST /api/inventory/recognize`): 냉장고 사진 URL을 입력하면, 미리 정의된 재료 사전(`data/ingredientVocabulary.js`)의 각 항목과 사진 간 관련도 점수를 `nvidia/llama-nemotron-rerank-vl-1b-v2:free` 모델로 계산해 상위 5개를 반환합니다.
- **레시피 추천** (`POST /api/recipes/recommend`): 인식된 재료 목록을 임베딩(`nvidia/nemotron-3-embed-1b:free`)으로 변환한 뒤, 사전 계산된 레시피 임베딩과 코사인 유사도를 비교해 상위 3개 레시피를 추천합니다.
- 간단한 웹 UI(`public/index.html`)에서 이미지 URL 입력/파일 업로드 → 인식 → 추천까지 한 번에 테스트할 수 있습니다.

각 기능의 설계 배경과 실제 검증된 제약사항(무료 티어 일일 한도, API 스펙 등)은 `docs/PRD_01.md`, `docs/PRD_02.md`, `docs/PRD_03.md`에 정리되어 있습니다.

## 시작하기

```bash
npm install
cp .env.example .env
# .env 파일에 OPENROUTER_API_KEY 입력
npm run dev
```

기본적으로 `http://localhost:3000` 에서 서버가 실행되며, 같은 주소에서 웹 UI를 바로 사용할 수 있습니다.

### 레시피 임베딩 생성

레시피 추천 기능은 `data/recipeEmbeddings.json`에 사전 계산된 임베딩이 필요합니다(요청마다 재계산하지 않기 위함). 이 파일은 저장소에 포함되어 있지 않으므로, 최초 실행 전에 한 번 생성해야 합니다.

```bash
node scripts/embedRecipes.js
```

레시피 목록(`data/recipes.js`)을 수정한 경우에도 위 명령을 다시 실행해 임베딩을 갱신해야 합니다.

## 프로젝트 구조

```
server.js                     # Express 앱 진입점
config.js                     # 환경 변수 로드 및 검증
routes/inventory.js           # 재료 인식 API
routes/recipes.js             # 레시피 추천 API
services/openrouter.js        # OpenRouter API 호출 (rerank, embedding)
data/ingredientVocabulary.js  # 재료 사전
data/recipes.js               # 레시피 시드 데이터
scripts/embedRecipes.js       # 레시피 임베딩 생성 스크립트
public/index.html             # 테스트용 웹 UI
docs/                         # 기능별 PRD 문서
```

## 참고 사항

- OpenRouter 무료 모델은 계정당 **하루 50회 요청** 한도가 있습니다. 재료 사전 크기만큼 인식 요청마다 호출이 발생하므로 사전을 늘릴수록 하루에 처리 가능한 사진 수가 줄어듭니다(자세한 내용은 `docs/PRD_01.md` 참고).
- `.env`는 커밋되지 않습니다. API 키는 `config.validateEnv()`를 통해 서버 시작 시 존재 여부만 검증되며 로그에 노출되지 않습니다.
