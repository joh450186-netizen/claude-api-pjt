// OpenRouter free-tier daily limit (50 requests/day) forces a small vocabulary:
// each recognize call makes one request per item, so keep this list short.
module.exports = [
  { name: '우유', category: '유제품' },
  { name: '계란', category: '유제품' },
  { name: '치즈', category: '유제품' },
  { name: '소고기', category: '육류' },
  { name: '양파', category: '채소' },
  { name: '당근', category: '채소' },
  { name: '상추', category: '채소' },
  { name: '토마토', category: '채소' },
  { name: '사과', category: '과일' },
  { name: '바나나', category: '과일' },
  { name: '두부', category: '기타' },
  { name: '김치', category: '기타' },
];
