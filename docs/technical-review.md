# 기술 검토

## 이전 구현의 문제

이전 `v0.1.x`는 KTerm을 실행하고 터미널 입력을 화면으로 사용했습니다. 따라서 Kindle Library에서 책처럼 열리는 독립 앱이 아니었고, `kindle-korean-ime`가 기대하는 기본 Kindle 입력 포커스도 만들지 못했습니다. 이 버전은 이전 아키텍처를 유지보수하지 않고 `v0.2.0`에서 교체합니다.

## 현재 구조

`kpm/install.sh`는 `app/`을 `/var/local/mesquite/korean-crossword`에 설치하고 `appreg.db`에 다음 등록을 만듭니다.

```text
app id:  kindle.lab.korean.crossword
command: /usr/bin/mesquite -l kindle.lab.korean.crossword -c file:///var/local/mesquite/korean-crossword/
```

Library Scriptlet은 KPM을 통해 `appmgrd`의 `app://kindle.lab.korean.crossword`를 실행합니다. KTerm, KUAL, 터미널 relay는 패키지 실행 경로에 없습니다.

## 한글 입력 경로

앱은 `#answer-input`이라는 표준 HTML text input을 화면에 표시하고, 단서 칸을 선택할 때 `.focus()`합니다. 이 입력창이 Kindle의 native focus window가 되면 기존 `kindle-korean-ime` X11/native bridge가 조합한 한글을 앱 입력값으로 전달할 수 있습니다.

이 연결은 코드상 입력창과 포커스까지 마련한 상태입니다. Kindle WebKit/펌웨어별 focus window 전달과 실제 조합은 실기기에서 확인해야 합니다.

## 퍼즐 데이터

앱 JS는 현재 endpoint의 `encode_data` 래퍼와 일반 JSON 응답을 모두 처리합니다. 가로 단서는 `(row, col+i)`, 세로 단서는 `(row+i, col)`로 10×10 격자에 배치하고, 교차 문자가 다르면 해당 퍼즐을 거부합니다.

호스트 C parser는 응답 형식과 좌표 규칙을 별도로 회귀 테스트하는 용도이며 Kindle에서 실행되지 않습니다.

## 남은 실기기 검증

1. Library에 세로 표지와 `Korean Crossword` 항목이 표시되는지
2. Scriptlet이 Mesquite 화면을 여는지
3. 표준 입력창을 눌렀을 때 기본 Kindle 입력 경로가 활성화되는지
4. `kindle-korean-ime`로 한글을 입력하고 교차 칸에 반영되는지
5. 네트워크 실패 후 캐시 퍼즐과 답안이 열리는지
