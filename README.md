# 한국일보 크로스워드 Kindle 독립 클라이언트

`kindle-lab` KPM 방식으로 설치하는 한국일보 크로스워드 앱입니다. KUAL과 KTerm을 사용하지 않습니다.

## 앱 구조

이 앱은 Kindle Library의 `Korean Crossword.sh` 항목을 눌렀을 때 `/usr/bin/mesquite`가 여는 독립 local HTML 앱입니다. KWordle처럼 앱 전용 화면과 Kindle 상단 Chrome bar를 사용합니다.

- `app/`: `config.xml`, HTML, CSS, ES5 호환 JavaScript 앱
- `kpm/`: KPM 설치·실행·삭제 스크립트
- `assets/korean-crossword-cover.png`: Library에서 책처럼 보이는 2:3 세로 표지. 표지 안에는 `Crossword`가 들어 있습니다.
- `src/`: 응답 좌표와 교차 규칙을 확인하는 호스트 테스트용 파서

앱 안에는 화면에 보이는 표준 HTML `input`인 `answer-input`이 있습니다. 칸을 누르면 이 입력창에 포커스가 가고, 기존 `kindle-lab/kindle-korean-ime` 네이티브 브리지가 이 포커스에 한글을 주입할 수 있도록 설계했습니다. 한글 IME 자체를 이 패키지가 자동 설치하지는 않습니다.

## 퍼즐 처리

1. `https://d3owq5b4yti859.cloudfront.net/puzzle.json`을 XHR로 요청합니다.
2. `encode_data`가 있으면 JWT 가운데 부분을 base64url/UTF-8로 해독합니다.
3. 가로·세로 단서를 10×10 좌표로 펼쳐 교차 문자를 검증합니다.
4. 날짜별 원문과 답안을 `localStorage`에 저장합니다.
5. 네트워크가 끊기면 저장된 최신 퍼즐을 열고, 상단 선택 상자에서 과거 캐시도 고를 수 있습니다.

## 빌드와 검사

```sh
make test
make package
```

`make package`는 ARM 실행 파일을 만들지 않습니다. 정적 Mesquite 앱을 KPM archive로 포장하고 다음 파일을 만듭니다.

- `dist/korean-crossword-kindlehf.kpkg`
- `dist/SHA256SUMS`

GitHub의 최신 `v0.3.0` 태그 Release에는 같은 패키지가 올라갑니다. KPM 저장소에 등록된 artifact 경로는 `kpm-repo-entry.json`에 있습니다.

## KPM 설치

```sh
/var/local/kmc/bin/kpm add-repo https://raw.githubusercontent.com/kindle-lab/kpm-repo/main/manifest.json
/var/local/kmc/bin/kpm update
/var/local/kmc/bin/kpm install korean-crossword
```

설치 시 Library Scriptlet은 영문 파일명 `Korean Crossword.sh`로 만들어지고, 표지 파일은 `/mnt/us/korean-crossword-cover.png`에 놓입니다. 제거 시 `/var/local/korean-crossword`의 캐시·진행 데이터는 보존합니다.

## 확인 상태

- 확인됨: KPM/KUAL 분리, Library Scriptlet, 세로 표지, Mesquite app registration, standalone HTML 화면, 표준 입력창, 날짜 캐시, 오프라인 fallback, 호스트 파서 테스트
- 추가 확인 필요: 실제 Kindle에서 Library 카드 표시, Mesquite 실행, 퍼즐 네트워크 권한, `kindle-korean-ime`가 앱 입력창에 포커스를 붙이는지, 터치와 화면 갱신

실기기에서 이 마지막 항목을 확인하기 전에는 한글 입력이 모든 펌웨어에서 동작한다고 단정하지 않습니다.
