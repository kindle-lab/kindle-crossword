# 한국일보 크로스워드 Kindle 독립 클라이언트

`kindle-lab` KPM 방식으로 설치하는 한국일보 크로스워드 클라이언트입니다. KUAL은 사용하지 않습니다.

현재 소스는 다음 흐름을 구현합니다.

1. `https://d3owq5b4yti859.cloudfront.net/puzzle.json`의 `encode_data` 응답을 직접 해석합니다.
2. 10×10 가로·세로 단어를 검증하고 교차 문자를 구성합니다.
3. 검증된 퍼즐만 `YYYY-MM-DD.json`으로 저장하고 `current.json`으로 지정합니다.
4. 네트워크가 끊겨도 마지막 저장 퍼즐을 다시 열 수 있습니다.
5. 실행 시 저장된 날짜 목록에서 과거 퍼즐을 고를 수 있습니다.
6. KPM Scriptlet에서 KTerm을 열어 터미널 기반 입력 화면을 실행합니다.

한국어 IME는 자동 설치하지 않습니다. 이미 `kindle-lab/kindle-korean-ime`를 사용 중이면 같은 네이티브 입력 경로를 그대로 활용할 수 있도록 KTerm 입력 환경에 의존합니다. IME의 기기별 동작 자체는 이 저장소에서 보증하지 않습니다.

## 개발 테스트

호스트에서 파서와 실제 응답 형식을 검사합니다.

```sh
make test
./build/korean-crossword --summary tests/fixtures/payload.json
```

Kindle 패키지는 `arm-kindlehf-linux-gnueabihf-gcc`가 설치된 환경에서 빌드합니다.

```sh
make package CROSS_CC=arm-kindlehf-linux-gnueabihf-gcc
```

산출물은 `dist/korean-crossword-kindlehf.kpkg`와 `dist/SHA256SUMS`입니다. 현재 작업 환경에는 Kindle ARM 크로스 컴파일러가 없어 실제 `.kpkg` 생성은 기기용 빌드 환경에서 수행해야 합니다.

GitHub에 `v0.1.0` 같은 태그를 push하면 Actions가 ARM 패키지를 만들고 GitHub Release에 `.kpkg`와 체크섬을 올립니다. 그 Release asset을 Kindle로 내려받아 KPM으로 설치할 수 있습니다.

## KPM 설치

KPM 저장소에 패키지 artifact를 등록한 뒤 다음처럼 설치합니다.

```sh
/var/local/kmc/bin/kpm add-repo https://raw.githubusercontent.com/kindle-lab/kpm-repo/main/manifest.json
/var/local/kmc/bin/kpm update
/var/local/kmc/bin/kpm install korean-crossword
```

이 저장소의 `kpm-repo-entry.json`은 `kindle-lab/kpm-repo`에 추가할 항목의 초안입니다. 원격 저장소에는 자동으로 쓰지 않습니다.

## 상태

- 확인됨: 실제 `puzzle.json` 응답 해독, 10×10 좌표·교차 검증, 날짜 캐시 구조, KPM v2 패키지 구조.
- 구현됨: 호스트 파서 테스트, KPM 설치/실행/삭제 스크립트, 날짜별 퍼즐 선택, 오프라인 실행 경로.
- 추가 확인 필요: Kindle Basic 11세대 2024 실기기에서 터치 UI, KTerm 입력 포커스, 기존 한국어 IME 조합, 화면 갱신 속도.
