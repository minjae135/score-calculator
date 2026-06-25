# Google Antigravity Project Rules (프로젝트 규칙)

이 파일은 이 워크스페이스 내에서 에이전트가 준수해야 할 개발 규칙과 선호도를 정의합니다.

## 🛠️ 기술 및 스택 선호도 (Technology Preferences)
- **TypeScript (TS) 우선 사용**:
  - 단순 JavaScript(JS) 대신 **TypeScript(TS)**를 기본 프로그래밍 언어로 우선 적용합니다.
  - 새 프로젝트나 코드를 작성할 때 엄격한 타입 정의와 `tsconfig.json` 설정을 기본으로 제공합니다.
- **React + Vite 프레임워크 우선 사용**:
  - 웹 애플리케이션 개발 시 바닐라(Vanilla) HTML/CSS/JS 대신 **Vite + React** 환경을 기본 템플릿으로 채택합니다.
  - 최신 React 베스트 프랙티스(함수형 컴포넌트, Hook 활용)를 준수하며 빌드 및 배포에 용이한 구성을 지원합니다.

## 💬 의사소통 및 주석 선호도 (Communication & Comment Preferences)
- **한국어 기본 소통**:
  - 사용자와의 대화 및 설명은 항상 **한국어**로 작성합니다.
- **영어 주석 선호 (English Comments)**:
  - 코드 내부의 주석(Comments) 및 개발 문서 주석(JSDoc 등)은 한국어 대신 항상 **영어(English)**로 작성합니다.

## 🚀 GitHub Pages 배포 자동화 (CI/CD)
- **GitHub Actions 설정 자동화**:
  - React + Vite 프로젝트를 GitHub Pages에 배포할 때, 빌드 및 배포 과정을 자동화하는 GitHub Actions 워크플로우 파일(`.github/workflows/deploy.yml`)을 반드시 함께 설정합니다.
  - 별도의 빌드물 커밋 없이 main 브랜치 푸시만으로 자동 빌드 및 배포가 완료되는 최신 GitHub Pages 배포 규격을 사용합니다.
