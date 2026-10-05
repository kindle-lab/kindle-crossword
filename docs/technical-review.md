# 기술 검토 — v0.4.0 재설계

## 왜 다시 설계했나

v0.3.x는 CloudFront의 실제 퍼즐 응답을 찾고 Mesquite 독립 앱까지 연결했지만, 구현 목표가 KPM/Library/Mesquite 통합에 치우쳤다. 단어별 답안을 따로 저장해 교차점 상태가 모순될 수 있었고, `articleUrl`을 읽고도 UI에서 버렸으며, Kindle 로컬 날짜를 퍼즐 날짜처럼 캐시 키에 사용했다.

v0.4.0은 `docs/product-contract.md`를 제품 기준으로 삼고, 데이터 해독과 Kindle 패키징 사이의 게임 코어를 재작성한다.

## 실제 데이터 경로

앱은 다음 endpoint를 직접 읽는다.

```text
https://d3owq5b4yti859.cloudfront.net/puzzle.json
```

`encode_data`가 있으면 JWT 형태의 가운데 Base64URL 구간을 UTF-8 JSON으로 해독한다. 일반 JSON과 문자열 `body`도 처리한다.

## 새 코어

`app/core.js`는 Kindle 앱과 Node 회귀 테스트가 함께 사용하는 단일 로직이다.

- 10×10 좌표 검증
- 가로/세로 교차 문자 검증
- `clue`, `definition`, `articleUrl` 보존
- source ID/date 추출
- content fingerprint 생성
- cell-centric 진행상태
- 현재 칸 상태 기반 정답 판정

기존 C 파서는 실제 Kindle 런타임과 다른 중복 구현이어서 제거한다.

## 캐시

v4 키 공간을 사용한다.

```text
crossword:v4:puzzle:<puzzle-id>
crossword:v4:progress:<puzzle-id>
crossword:v4:index
```

동일 퍼즐은 동일 ID로 갱신되므로 Kindle 날짜가 바뀌었다고 중복 저장되지 않는다. 원본 응답에 날짜가 없으면 UI는 날짜를 추정하지 않고 `저장본`이라고 표시한다.

v0.3.x `crossword:puzzle:*` raw 캐시는 읽어서 v4로 옮길 수 있지만, 단어별 `:answers` 진행상태는 이관하지 않는다.

## 입력

UI의 canonical selection은 칸이다. 표준 HTML `#cell-input`이 native focus를 제공하고, 한글 조합이 끝난 문자를 선택 칸에 넣은 뒤 현재 단어의 다음 칸으로 이동한다. 교차점에서 방향을 바꿀 수 있다.

## 기사 연결

문제의 `articleUrl`이 HTTP(S) URL이면 `관련 기사에서 힌트 찾기` 링크를 표시한다. 퍼즐이 뉴스 기사와 연결된 원제품 성격을 제거하지 않는다.

## 오프라인

manifest의 `internetRequired`는 `no`다. 앱 실행과 최신 퍼즐 확인을 분리하며, 다운로드 실패 시 로컬에 저장된 퍼즐을 계속 사용할 수 있다.

## 2026-10-05 배포 검증

- `make test`와 KPM package verifier를 통과한 v0.4.0 Release를 생성했다.
- Release의 `korean-crossword-kindlehf.kpkg` 크기는 751126 bytes, SHA-256은 `edd6b01367335e096f9187213b0c95987456b317684c260fc364bda3c26f06b9`다.
- `kindle-lab/kpm-repo`가 동일 Release asset을 `packages/korean-crossword/artifacts/korean-crossword_0.4.0_kindlehf.kpkg`로 미러링했고 checksum이 Release와 일치한다.
- GitHub Actions에서 현재 CloudFront `puzzle.json`을 직접 내려받아 **배포와 동일한 `app/core.js`**로 `buildPuzzle()`하는 live-source smoke를 통과했다. 따라서 현재 서버 응답 형식과 v0.4.0 production parser의 호환성은 확인됐다.
- 이 검증은 Kindle Mesquite의 HTTPS/XHR/CORS와 native input을 대신하지 않는다.

## 남은 실기기 검증

1. Vera 탈옥 Kindle Basic 11세대에서 Library 항목과 Mesquite 실행
2. Mesquite에서 CloudFront HTTPS XHR/CORS
3. `kindle-korean-ime` 조합 이벤트가 `#cell-input`에 전달되는지
4. 터치 후 포커스와 자동 다음 칸 이동
5. 기사 링크가 Kindle에서 열리고 퍼즐로 복귀 가능한지
6. E-Ink 화면 갱신과 격자 크기
