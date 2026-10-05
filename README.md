# 한국일보 크로스워드 Kindle 클라이언트

`kindle-lab` KPM으로 설치하는 Kindle Basic 11세대용 독립 클라이언트입니다. 목표는 **한국일보 PlayGround의 실제 최신 크로스워드를 퍼즐·단서·기사 연결을 보존한 채 Kindle에서 푸는 것**입니다.

제품 기준은 [`docs/product-contract.md`](docs/product-contract.md)에 있습니다.

## 데이터

앱은 한국일보 크로스워드가 사용하는 다음 공개 퍼즐 응답을 직접 읽습니다.

```text
https://d3owq5b4yti859.cloudfront.net/puzzle.json
```

`encode_data` 래퍼와 일반 JSON을 모두 처리하며 가로/세로 문제의 `answer`, `row`, `col`, `clue`, `definition`, `articleUrl`을 보존합니다.

## v0.4 계열

v0.4.0에서 게임 코어를 다시 설계했습니다.

- **칸 중심 상태 모델**: 교차점은 언제나 하나의 문자만 가집니다.
- **현재 격자 기반 판정**: 저장된 `correct` 플래그가 아니라 현재 칸을 읽어 정답을 계산합니다.
- **퍼즐 identity 분리**: Kindle 날짜를 ID로 쓰지 않습니다. 원본 ID/date가 없으면 content fingerprint를 사용합니다.
- **기사 연결 복원**: 관련 기사 URL이 있으면 `관련 기사에서 힌트 찾기`를 표시합니다.
- **정직한 캐시 명칭**: 서버 아카이브가 아니라 로컬에서 받은 항목은 `저장된 퍼즐`이라고 표시합니다.
- **실제 앱 코어 테스트**: `app/core.js`를 Node 회귀 테스트에서도 그대로 사용합니다.
- **구형 WebKit 대응**: 최신 CSS/JavaScript 의존을 피합니다.

### v0.4.1 Mesquite 기동 수정

v0.4.0은 게임 코어 재설계 과정에서 Kindle WAF `config.xml`을 과도하게 단순화해 실제 기기에서 Library 항목을 누르면 `Application Error`가 발생했습니다. v0.4.1은 KWordle/Kindle WAF에서 검증된 Mesquite 설정을 복원합니다.

- cookiejar/network 기본 설정 복원
- Kindle API feature whitelist 전체 복원
- `com.lab126.readnow` messaging 복원
- 검증되지 않은 `<access origin="*">` 제거
- 첫 기동 확인을 위해 `internetRequired=yes`로 원형과 동일하게 설정
- `/mnt/us/korean-crossword-launch.log`에 등록/기동 preflight 기록

게임 상태·퍼즐 해독 코어는 v0.4.0과 동일합니다. 완전 오프라인 기동은 실제 기기에서 v0.4.1 실행을 먼저 확인한 뒤 다시 활성화·검증합니다.

## 구조

- `app/core.js`: 응답 해독, 좌표 검증, fingerprint, cell-centric 상태/판정
- `app/app.js`: XHR, 캐시, 터치/입력 UI
- `app/index.html`, `app/app.css`: Mesquite 화면
- `kpm/`: 설치·실행·삭제 및 app registration
- `tests/test-core.js`: 교차점 일관성, identity, encode_data 회귀 테스트
- `docs/product-contract.md`: 구현보다 우선하는 제품 목표와 완료조건

## 테스트와 패키지

```sh
make test
make package
```

산출물:

- `dist/korean-crossword-kindlehf.kpkg`
- `dist/SHA256SUMS`

태그 `v0.4.6`을 push하면 GitHub Actions가 같은 검증을 거쳐 Release asset을 만듭니다.

## KPM 설치

```sh
/var/local/kmc/bin/kpm add-repo https://raw.githubusercontent.com/kindle-lab/kpm-repo/main/manifest.json
/var/local/kmc/bin/kpm update
/var/local/kmc/bin/kpm install korean-crossword
```

## 현재 확인 상태

코드/호스트에서 확인:

- 실제 endpoint 형식 해독 경로
- 10×10 좌표·교차 검증
- 교차점 단일 상태와 양방향 정답 재계산
- 기사 URL 보존
- 퍼즐 fingerprint/메타데이터 identity
- KPM/Mesquite 패키지 구조
- KWordle 계열과 동일한 WAF 설정 계약

실기기 확인 필요:

- Vera 탈옥 Kindle Basic 11세대에서 v0.4.3 Library 실행
- Mesquite의 CloudFront HTTPS/CORS
- `kindle-korean-ime` 조합 입력
- 터치/포커스/자동 다음 칸
- 기사 링크 이동과 복귀
- 완전 오프라인 시작 재활성화 가능 여부
- E-Ink 화면 갱신

기동 실패 시 USB 저장소의 `/mnt/us/korean-crossword-launch.log`를 확인합니다.
