# 기술 검토 기록

## 확인됨

- 공개 Organization은 `kindle-lab`이며 기존 배포 방식은 KPM v2 `.kpkg`입니다.
- `kpm-repo`는 `kindlehf` artifact와 `kterm` 의존성을 사용하는 구조입니다.
- KUAL은 이 클라이언트의 설치·실행 경로에서 사용하지 않습니다.
- 현재 퍼즐 응답은 CloudFront의 `puzzle.json`에서 내려오며, `encode_data`의 두 번째 Base64URL 구간을 웹 클라이언트가 서명 검증 없이 디코드합니다.
- 디코드된 문항의 `row`, `col`, `answer`로 10×10 격자를 만들고, 교차 문자의 충돌을 검증할 수 있습니다.
- 응답에는 퍼즐 날짜나 과거 문제 ID가 없으므로, 파일명 날짜는 다운로드 날짜로만 취급해야 합니다.

## 결정

- 패키지 ID: `korean-crossword`
- 표시 이름: `한국일보 크로스워드`
- 대상 플랫폼: `kindlehf`
- KPM 의존성: KTerm만 사용하며 한국어 IME는 자동 설치하지 않음
- 저장 위치: `/var/local/korean-crossword`, 대체 위치 `/mnt/us/korean-crossword`
- 저장 단위: `puzzles/YYYY-MM-DD.json`, 최신 선택용 `current.json`
- 점수 등록 API는 1차 구현에서 제외

## 추가 확인 필요

- Kindle Basic 11세대 2024 실기기의 화면 해상도와 E-Ink 갱신 비용
- KTerm 터미널 입력 포커스가 `kindle-korean-ime`의 네이티브 입력 브리지와 실제로 조합되는지
- 기존 KPM 저장소에서 `kterm` 의존성을 해석할 수 있는지
- Kindle ARM 하드플로트 크로스 컴파일러 및 릴리스 서명 환경
- 현재 입력 화면은 터치 네이티브 UI가 아니라 KTerm 기반 터미널 MVP이므로, 실기기에서 터치 요구를 충족하는 후속 UI 작업

실물 기기 검증은 사용자 결정에 따라 이번 단계에서 건너뛰며, 위 항목을 확인하지 않은 상태로 완료됐다고 표시하지 않습니다.
