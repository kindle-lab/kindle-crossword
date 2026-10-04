# Kindle 앱 제작 필수 규칙

이 저장소의 Kindle 앱 작업에서는 아래 항목을 구현하지 않은 상태를 완료로 표시하지 않는다.

1. KPM `.kpkg`만 사용하고 KUAL 실행 경로를 만들지 않는다.
2. Kindle Library에서 책처럼 보이고 실행되도록 `/mnt/us/documents/<앱 제목>.sh` Scriptlet을 설치한다. 파일명, Scriptlet의 `Name`·`Title`, manifest의 `name`을 같은 사용자-facing 제목으로 맞춘다.
3. Scriptlet에는 `Name`, `Author`, `Icon` 주석을 넣고, 아이콘 파일을 패키지와 `/mnt/us`에 함께 포함한다.
4. 아이콘은 Kindle Library에서 식별 가능한 고대비 흑백 PNG로 만들고 패키지 검증기에서 크기와 존재 여부를 검사한다.
5. 앱은 KTerm·터미널이 아니라 `/usr/bin/mesquite`가 여는 독립 local HTML 앱으로 구현한다. Library Scriptlet은 등록된 app id를 `appmgrd`로 실행한다.
6. 한글 입력은 앱 안에 실제로 보이는 표준 HTML `input`을 두고 포커스한다. KTerm 입력 릴레이나 앱 자체 가상 키보드만으로 대체하지 않는다. 기존 `kindle-korean-ime` 네이티브 브리지가 이 포커스를 사용할 수 있어야 한다.
7. 설치·업데이트 실패 시 기존 Scriptlet과 앱 디렉터리를 복구하고, 제거 시 캐시·설정·진행 상태를 삭제하지 않는다.
8. `make test`, KPM archive 검사, 실제 Release asset 접근 확인을 모두 수행한다.
9. 기기에서 Library 항목 표시, 독립 앱 실행, 네트워크 다운로드, 오프라인 캐시, 기존 IME 포커스를 확인하기 전에는 실기기 완료로 표현하지 않는다.
