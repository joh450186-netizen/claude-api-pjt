# PRD_01: 냉장고 사진 기반 재료 인식

## 1. 개요
사용자가 냉장고 내부 사진을 업로드하면, 사진 속에 어떤 재료가 있는지 자동으로 인식하여 재료 목록(inventory)으로 변환하는 기능. 인식된 재료 목록은 [[PRD_02]] 레시피 추천 단계의 입력으로 사용된다.

## 2. 사용 모델 및 확인된 제약사항
- 모델: `nvidia/llama-nemotron-rerank-vl-1b-v2:free` (OpenRouter, NVIDIA)
- 엔드포인트: `POST https://openrouter.ai/api/v1/rerank` (실제 호출 테스트로 확인됨. `/chat/completions`에서는 404 발생 — 이 모델은 chat completion을 지원하지 않음)
- 모델 특성: 쿼리와 후보 문서(document) 목록 간 관련도 점수(`relevance_score`)를 매기는 **크로스인코더 재랭킹 모델**. document는 텍스트(`{"text": "..."}`) 또는 이미지(`{"image": "url 또는 base64"}`) 형태를 지원하며 혼합도 가능.
- **중요한 제약**: 이 모델은 이미지를 보고 자유 텍스트 설명("우유, 계란이 있습니다")을 생성하지 못한다. 사진 속 내용을 "인식"하려면 **미리 정의된 재료 후보 목록(사전)**을 사용해 각 후보와의 관련도 점수를 비교하는 방식으로만 동작한다. 사전에 없는 재료는 인식할 수 없다.
- **API 제약(실제 호출로 검증됨)**: `query` 필드는 반드시 문자열(string)만 허용하며 이미지 객체나 배열을 넣으면 400 에러가 발생한다. 즉 "이미지를 query로, 재료 후보들을 documents로" 넣는 방식은 **불가능**하다. 실제로 동작하는 유일한 방식은 그 반대로, **`query`에 재료 후보 이름(텍스트)을 하나씩 넣고, `documents`에 사진 1장(`{"image": url}`)만 넣어 관련도 점수를 받는 것**이며, 사전 항목 수만큼 호출을 반복해야 한다(배치/배열 쿼리 미지원, 400 확인됨). 실제 테스트에서 동일한 사진에 대해 관련 있는 단어(예: `coyote` 0.027, `dog` 0.016)와 무관한 단어(예: `milk carton` 0.0036, `invoice paper` 0.0029)가 점수로 명확히 구분됨을 확인함.
- **free tier 일일 한도(실제로 걸림, 확인됨)**: OpenRouter 무료 모델은 계정당 **하루 50회 요청** 한도가 있다(`Rate limit exceeded: free-models-per-day`, "Add 10 credits to unlock 1000 free model requests per day"). 재료 사전 항목 수만큼 매 인식 요청마다 호출이 발생하므로, 사전 크기가 곧 "하루에 인식 가능한 사진 장수"를 결정한다. 43개 항목으로 테스트했을 때 사진 1장 인식만으로 하루 한도가 거의 소진됨을 실제로 확인함.

## 3. 범위
### In Scope
- 냉장고 내부 사진 1장 업로드
- 미리 정의된 재료 사전(초기 버전은 자주 쓰이는 식재료 100~300개 수준)과 사진을 `/rerank`로 비교
- 관련도 점수 상위 N개(또는 임계값 이상)를 "인식된 재료"로 반환
- 인식 결과에 대한 사용자 수동 수정(추가/삭제) UI

### Out of Scope (이번 단계 제외)
- 재료의 정확한 수량/유통기한 자동 인식 (사용자가 수동 입력)
- 사전에 없는 재료의 자유 인식 (필요 시 별도 비전-언어 모델 도입을 향후 검토)
- 다중 사진(여러 칸 촬영) 스티칭

## 4. 재료 사전(Vocabulary) 설계
- 저장 위치(현재 구현): `data/ingredientVocabulary.js` (id 대신 name, category 필드만 사용하는 간단한 정적 배열). 추후 DB 테이블 `ingredient_vocabulary`로 이관 가능.
- **일일 요청 한도(50회/free tier) 때문에 초기 사전을 12개로 축소 결정**: 우유, 계란, 치즈, 소고기, 양파, 당근, 상추, 토마토, 사과, 바나나, 두부, 김치. 카테고리별 대표 품목 1~3개 수준.
- 확장: 사용자가 "사전에 없는 재료"를 수동 추가하면 사전에 반영(관리자 승인 또는 자동 추가 정책은 추후 결정). 단, 사전을 늘릴수록 인식 1회당 소모되는 일일 한도가 커지므로, OpenRouter 유료 크레딧 충전(하루 1000회로 확장) 여부와 함께 검토해야 함.
- 후보 개수가 많아질 경우 `/rerank` 호출 횟수가 선형으로 늘어나 비용/속도/일일 한도에 직접적 영향을 줌(검증됨).

## 5. API 설계 (검증된 방식으로 수정됨)
```
POST /api/inventory/recognize
Body: { imageUrl: string } 또는 multipart 이미지 파일
Flow:
  1. 이미지를 접근 가능한 URL로 변환(업로드 스토리지) 또는 base64 인코딩
  2. ingredient_vocabulary(전체 또는 카테고리 필터링된 서브셋)의 각 항목에 대해:
     POST https://openrouter.ai/api/v1/rerank
       { model, query: <ingredient name(text)>, documents: [{ image: <imageUrl> }] }
     → 항목당 1회 호출, 동시성 제한(예: 5~10개 병렬)을 두고 반복
  3. 항목별 relevance_score를 모아 정렬
  4. 상위 N개(또는 threshold 이상)를 "인식된 재료"로 채택
  5. 응답: { recognizedIngredients: [{ name, score }], imageId }
```
- 사전 크기가 커질수록 호출 횟수가 선형으로 증가하므로(예: 사전 50개 = 사진 1장당 50회 호출), 초기 사전 규모를 작게 유지하거나 카테고리 필터링으로 호출 범위를 줄이는 최적화가 필요.

## 6. 에러 처리
- 외부 이미지 URL 사용 시 호스트별 제약 존재 확인됨(예: 위키미디어는 특정 썸네일 크기 요구 — 400 에러 발생 이력). 자체 업로드 스토리지를 사용해 이미지 크기/포맷을 사전 정규화할 것.
- OpenRouter 응답 실패 시(모델 rate limit, provider 오류) 재시도 정책 및 사용자에게 "수동 입력" 폴백 제공

## 7. Acceptance Criteria
- [x] `POST /api/inventory/recognize`가 실제 냉장고 사진으로 정상 동작함 (실제 실행 결과: 토마토 0.022, 치즈 0.020, 오렌지 0.019, 사과 0.016 등 — 사진 내용과 그럴듯하게 일치)
- [x] free tier에서 비용 없이 동작함이 확인됨 (`cost: 0`)
- [ ] 사용자가 사진을 업로드하면 5초 이내 인식 결과가 반환된다 (현재 12개 항목 기준 실측 필요 — 43개 기준 17.3초였음)
- [ ] 재료 사전에 있는 항목은 정확도 기준(내부 QA 셋) 70% 이상 재현율로 인식된다
- [ ] 사용자가 인식 결과를 수동으로 수정할 수 있다

## 8. Open Questions
- 관련도 점수 임계값(threshold)은 어떻게 튜닝할 것인가? (현재는 threshold 없이 top-5만 채택)
- 사전에 없는 재료가 반복적으로 나타날 때 이를 자동으로 사전에 추가할 것인가?
- OpenRouter 유료 크레딧(하루 1000회) 충전 여부를 언제 결정할 것인가? 무료 한도만으로는 하루 인식 가능 횟수가 매우 제한적임(사전 12개 기준 하루 약 4장).

## 9. 구현 현황
- `server.js`, `routes/inventory.js`, `services/openrouter.js`, `data/ingredientVocabulary.js`로 구현 완료 및 실제 API 호출로 검증됨.
- 실행: `npm install && npm start` 후 `POST http://localhost:3000/api/inventory/recognize` (`{ "imageUrl": "..." }`)
