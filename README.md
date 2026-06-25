# 🎓 성적 커트라인 시뮬레이터 (Target Grade Calculator)

지필평가(중간/기말고사)와 수행평가 점수 및 반영 비율을 입력하고, 원하는 목표 성적(커트라인)을 달성하기 위해 **특정 평가 항목에서 몇 점 이상을 받아야 하는지** 역산해주는 웹 애플리케이션입니다.

GitHub Pages를 통해 간편하게 호스팅할 수 있도록 빌드 과정이 없는 순수 HTML, CSS, JavaScript로 개발되었습니다.

---

## 🎨 주요 특징

- **실시간 역산 시뮬레이터**: 값을 비워둔 항목(X)에 대해 필요한 점수를 즉시 계산합니다.
- **반영 비율 유효성 검사**: 반영 비율의 합계가 100%인지 검사하고 시각화된 경고를 제공합니다.
- **직관적인 점수 현황 바**: 이미 확보한 점수 기여도와 목표 달성에 필요한 점수 영역을 한눈에 보여줍니다.
- **듀얼 테마 지원**: 눈이 편안한 다크 모드와 심플한 라이트 모드를 토글할 수 있습니다.
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 등 모든 디바이스에서 최적화된 레이아웃을 제공합니다.

---

## 📐 성적 계산 공식

최종 점수 $S$는 각 평가 항목의 점수($Score_i$), 만점 기준($Max_i$), 반영 비율($Weight_i$)에 따라 다음과 같이 계산됩니다:

$$S = \sum_{i} \left( \frac{Score_i}{Max_i} \times Weight_i \right)$$

점수를 모르는 항목 $X$가 하나만 존재하고 목표 점수가 $Target$일 때, 필요한 기여도 $C_{needed}$는 다음과 같습니다:

$$C_{needed} = Target - \sum_{i \ne X} \left( \frac{Score_i}{Max_i} \times Weight_i \right)$$

이때, 항목 $X$에서 받아야 하는 최소 점수 $Score_X$는 다음과 같이 역산됩니다:

$$Score_X = \frac{C_{needed}}{Weight_X} \times Max_X$$

---

## 🚀 GitHub Pages 호스팅 방법

이 저장소는 추가적인 빌드 과정 없이 정적 파일(Static Files)로만 이루어져 있으므로, GitHub Pages를 통해 무료로 바로 웹에 배포할 수 있습니다.

1. 이 소스 코드를 본인의 **GitHub 저장소(Repository)**에 푸시합니다.
2. GitHub 저장소 페이지 상단의 **Settings** 메뉴로 이동합니다.
3. 왼쪽 사이드바에서 **Pages** 탭을 클릭합니다.
4. **Build and deployment** 섹션의 Source에서 `Deploy from a branch`를 선택합니다.
5. Branch 설정에서 배포할 브랜치(예: `main` 또는 `master`)와 폴더(`/ (root)`)를 지정한 후 **Save** 버튼을 누릅니다.
6. 약 1~2분 후 제공되는 URL(예: `https://<username>.github.io/<repository-name>/`)로 접속하여 사용합니다.
