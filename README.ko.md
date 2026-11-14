<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/icon/open-ui-light.svg">
  <img src="assets/icon/open-ui-dark.svg" alt="open-ui" width="96" height="96">
</picture>

# open-ui

**내 PC에서 실행되는 AI와 편안하게 대화하기 위한 데스크톱 채팅 앱.**<br>
LM Studio, Ollama, llama.cpp, vLLM 같은 OpenAI 호환 서버에 연결하기만 하면 됩니다.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Harukotokoto/open-ui)](https://github.com/Harukotokoto/open-ui/releases/latest)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

[다운로드](https://github.com/Harukotokoto/open-ui/releases/latest) · [특징](#특징) · [설치](#설치) · [시작하기](#시작하기) · [사용법](#사용법) · [문제 해결](#문제-해결) · [로드맵](#로드맵)

[日本語](README.md) · [English](README.en.md) · [한국어](README.ko.md)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/screenshots/chat-dark.png">
  <img src="assets/screenshots/chat-light.png" alt="open-ui 채팅 화면" width="860">
</picture>

</div>

---

## 개요

open-ui는 내 PC나 네트워크에서 실행되는 AI 서버를 편리한 채팅 화면으로 사용할 수 있게 해 주는 앱입니다. AI 모델은 포함되어 있지 않습니다. LM Studio나 Ollama 같은 도구로 모델을 실행하고, 그 서버에 연결해서 사용합니다.

- **설치하면 바로 사용**: Windows·macOS·Linux용 데스크톱 앱입니다.
- **대화는 내 PC 안에만**: 기록과 설정은 PC에 저장합니다. 통신하는 곳은 직접 설정한 서버뿐입니다.
- **보기 편하고 가볍게**: 라이트·다크 테마를 지원하며, 답변을 실시간으로 표시합니다.

> [!NOTE]
> 개발 중인 프로젝트입니다. 기본 채팅, 대화 기록, 여러 연결 대상, 파일 첨부, 자동 업데이트까지 동작합니다. 아직 지원하지 않는 기능은 [로드맵](#로드맵)에 있습니다.

## 특징

- **실시간 표시**: 답변을 받는 즉시 표시하며, 생성 중에는 언제든지 멈출 수 있습니다.
- **추론 표시**: 추론(reasoning)을 반환하는 모델은 추론을 접이식 영역에 따로 표시하고, 걸린 시간도 함께 보여 줍니다.
- **읽기 쉬운 답변**: 코드 색상 강조와 복사, 표, 수식, 다이어그램(Mermaid)을 지원합니다. 한국어·일본어 같은 문자도 깨지지 않습니다.
- **파일 첨부**: 텍스트·코드, 이미지, PDF를 드래그 앤 드롭, 붙여넣기, 파일 선택 중 어느 방법으로든 전달할 수 있습니다.
- **여러 연결 대상**: LM Studio, Ollama, llama.cpp, vLLM, 그 밖의 OpenAI 호환 서버를 등록해 두고 전환해서 쓸 수 있습니다.
- **검색 가능한 모델 선택**: 모든 연결 대상의 모델을 하나의 목록으로 모아, 입력해서 좁힐 수 있습니다.
- **대화 기록**: 자동으로 저장합니다. 제목은 AI가 붙이며, 검색·이름 변경·삭제를 할 수 있습니다.
- **출력 속도 표시**: 답변 아래에 `42.3 tokens/s` 같은 속도를 표시합니다.
- **자동 업데이트**: 새 버전이 나오면 알려 주고, 승인하면 업데이트한 뒤 다시 시작합니다.
- **화면 설정**: 라이트·다크·자동, 8가지 강조 색. 좁은 창에서도 사용할 수 있습니다.

## 스크린샷

| 설정(일반)                                                                           | 설정(연결)                                                                                    |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| ![일반 설정: 테마와 강조 색을 고를 수 있음](assets/screenshots/settings-general.png) | ![연결 설정: 연결 대상을 추가하고 편집할 수 있음](assets/screenshots/settings-connection.png) |

| 모델 선택                                                                                  |
| ------------------------------------------------------------------------------------------ |
| ![검색 가능한 모델 선택. 연결 대상별로 모델이 나열됨](assets/screenshots/model-picker.png) |

## 설치

[최신 릴리스](https://github.com/Harukotokoto/open-ui/releases/latest)의 "Assets"에서 사용 중인 OS용 파일을 다운로드합니다. `<버전>`은 릴리스 번호입니다.

| OS      | 다운로드할 파일                                                                            |
| ------- | ------------------------------------------------------------------------------------------ |
| Windows | `open-ui_<버전>_x64-setup.exe`(설치 프로그램) 또는 `open-ui_<버전>_x64_en-US.msi`          |
| macOS   | `open-ui_<버전>_universal.dmg`(Apple Silicon과 Intel 모두 지원)                            |
| Linux   | `open-ui_<버전>_amd64.AppImage`, `open-ui_<버전>_amd64.deb`, `open-ui-<버전>-1.x86_64.rpm` |

설치 후에는 앱이 시작할 때 새 버전을 확인합니다. 설정의 "버전 정보"에서 언제든지 직접 확인할 수도 있습니다.

> [!WARNING]
> 이 앱은 OS 코드 서명을 하지 않았습니다. 처음 열 때 다음과 같은 경고가 나올 수 있습니다.
>
> - **Windows**: "Windows의 PC 보호" 화면이 나오면 "추가 정보" → "실행"을 선택합니다.
> - **macOS**: "개발자를 확인할 수 없음"이 나오면 한 번 닫고 "시스템 설정" → "개인정보 보호 및 보안"을 열어 "그래도 열기"를 선택합니다.
> - **Linux(AppImage)**: 파일에 실행 권한을 준 뒤 실행합니다(`chmod +x open-ui_*.AppImage`).

## 시작하기

1. **AI 서버를 준비하고 실행합니다.** LM Studio, Ollama처럼 OpenAI 호환 API를 제공하는 것이면 됩니다. 모델 다운로드와 서버 실행은 각 도구의 안내를 따르세요.
2. **open-ui에서 연결 대상을 설정합니다.** 왼쪽 아래의 "설정" → "연결"을 엽니다. 처음 실행하면 LM Studio(`http://localhost:1234/v1`) 연결 대상이 1개 준비되어 있습니다. 다른 서버는 "연결 대상 추가"에서 프리셋을 골라 추가합니다.
3. **모델을 고르고 말을 걸어 보세요.** 입력창 오른쪽 아래의 모델 이름을 눌러 모델을 고른 뒤 메시지를 보냅니다.

프리셋의 기본 URL은 다음과 같습니다. 포트를 바꾼 경우에는 URL을 고쳐서 사용하세요.

| 프리셋      | 기본 URL                                |
| ----------- | --------------------------------------- |
| LM Studio   | `http://localhost:1234/v1`              |
| Ollama      | `http://localhost:11434/v1`             |
| llama.cpp   | `http://localhost:8080/v1`              |
| vLLM        | `http://localhost:8000/v1`              |
| 사용자 지정 | `http://localhost:8080/v1`(고쳐서 사용) |

연결 대상 편집 화면의 "연결 테스트"로 서버에 연결되는지 확인할 수 있습니다. 연결되면 발견된 모델이 후보로 표시됩니다. 서버에 API 키가 필요하면 같은 화면에서 입력합니다.

## 사용법

### 채팅

- 메시지는 `Enter`로 전송하고 `Shift+Enter`로 줄바꿈합니다. 설정의 "일반" → "입력"에서 둘을 바꿀 수 있습니다.
- 한글·일본어 입력 변환을 확정하는 `Enter`로는 전송되지 않습니다.
- 생성 중에는 전송 버튼이 정지 버튼으로 바뀝니다. 다른 대화로 전환해도 생성은 계속됩니다.
- 추론을 반환하는 모델은 답변 위에 "N초 동안 생각했습니다"가 표시됩니다. 누르면 추론 내용을 읽을 수 있습니다. 추론은 서버로 다시 보내지 않습니다.
- 표시할 수 있는 서식에 대한 지시를 자동으로 추가하여, AI가 알맞은 서식을 쓰도록 합니다.

### 파일 첨부

입력창의 "+" 버튼으로 고르거나, 파일을 창에 드롭하거나, 이미지 등을 붙여넣습니다.

| 종류                      | 전달 방식                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| 텍스트·코드(UTF-8)        | 메시지 앞에 파일 이름과 함께 끼워 넣습니다                                                     |
| 이미지(PNG·JPEG·GIF·WebP) | 이미지로 보냅니다. 긴 변이 2048px를 넘으면 축소합니다. **이미지를 지원하는 모델이 필요합니다** |
| PDF                       | 글자를 추출해서 끼워 넣습니다. 스캔한 이미지뿐인 PDF는 글자를 추출할 수 없습니다               |

파일 하나는 10MB까지, 한 번에 10개·합계 25MB까지입니다. 확장자가 아니라 내용으로 종류를 판별합니다.

### 대화 기록

- 사이드바에 대화가 날짜(오늘 / 어제 / 지난 7일 / 그 이전)별로 나열됩니다.
- 위쪽 검색창에서 제목으로 찾을 수 있습니다.
- 대화 오른쪽의 "…"에서 이름 변경과 삭제(확인 포함)를 할 수 있습니다.
- 첫 대화가 끝나면 AI가 제목을 붙입니다. 실패하면 첫 발언이 제목이 됩니다.

### 설정

왼쪽 아래의 "설정"(`Ctrl+,` / `⌘,`)에서 엽니다. 설정 안에서도 검색할 수 있습니다.

| 카테고리  | 할 수 있는 일                                                                     |
| --------- | --------------------------------------------------------------------------------- |
| 일반      | 테마(자동 / 라이트 / 다크), 강조 색, Shift+Enter 동작                             |
| 연결      | 연결 대상 추가·편집·삭제·전환, API 키 설정, 연결 테스트                           |
| 생성      | 시스템 프롬프트, temperature, 최대 토큰 수(모든 대화 공통. 비워 두면 서버 기본값) |
| 버전 정보 | 버전 확인, 업데이트 확인                                                          |

### 단축키

macOS에서는 `Ctrl` 대신 `⌘`를 사용합니다.

| 동작               | 키       |
| ------------------ | -------- |
| 새 채팅            | `Ctrl+N` |
| 기록 검색          | `Ctrl+F` |
| 사이드바 열기/닫기 | `Ctrl+B` |
| 설정 열기          | `Ctrl+,` |

## 개인정보와 보안

- **대화와 설정은 PC 안에 저장합니다.** 앱의 데이터 폴더에 대화마다 하나의 파일로 저장하며, 클라우드로는 보내지 않습니다.
- **통신하는 곳은 직접 설정한 서버뿐입니다.** 사용 정보(텔레메트리)는 보내지 않습니다. 예외는 업데이트 확인으로, GitHub 릴리스에 문의합니다.
- **API 키는 OS의 안전한 저장소에 넣습니다.** Windows 자격 증명 관리자, macOS 키체인, Linux Secret Service입니다. 설정 파일에는 쓰지 않습니다.
- **답변 속의 외부 이미지는 불러오지 않고, 링크를 눌러도 이동하지 않습니다.** 답변에 숨겨진 이미지나 링크로 정보가 밖으로 나가는 것을 막기 위해서입니다.
- 업데이트 파일은 서명으로 검증합니다.

데이터 폴더의 위치는 다음과 같습니다.

| OS      | 위치                                                               |
| ------- | ------------------------------------------------------------------ |
| Windows | `%APPDATA%\io.github.harukoto-project.open-ui`                     |
| macOS   | `~/Library/Application Support/io.github.harukoto-project.open-ui` |
| Linux   | `~/.local/share/io.github.harukoto-project.open-ui`                |

## 문제 해결

**연결 테스트가 실패하거나 모델이 나오지 않아요**<br>
서버가 실행 중인지, URL의 포트 번호가 맞는지, URL이 `/v1`로 끝나는지 확인하세요. API 키가 필요한 서버라면 키도 입력합니다.

**모델 목록에 "모델 목록을 가져오지 못했습니다."가 나와요**<br>
해당 연결 대상의 그룹 안에 이유가 표시됩니다. 서버가 실행 중인지 확인한 뒤 "다시 시도"나 목록 아래의 "목록 새로고침"을 누르세요. 다른 연결 대상의 모델은 그대로 사용할 수 있습니다.

**이미지를 첨부했는데 AI가 읽지 못해요**<br>
이미지를 지원하는 모델이 필요합니다. 텍스트 전용 모델은 이미지를 이해하지 못합니다.

**답변이 중간에 끝나요**<br>
설정의 "생성"에서 "최대 토큰 수"가 너무 작지 않은지 확인하세요. 비워 두면 서버 기본값이 사용됩니다.

**업데이트를 확인할 수 없어요**<br>
네트워크에 연결되어 있는지 확인하세요. 계속 실패하면 [릴리스 페이지](https://github.com/Harukotokoto/open-ui/releases/latest)에서 최신 파일을 다시 설치할 수 있습니다. 대화는 지워지지 않습니다.

버그와 요청은 [Issues](https://github.com/Harukotokoto/open-ui/issues)에 남겨 주세요.

## 로드맵

| 상태    | 내용                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| 구현됨  | 채팅, 추론 표시, Markdown 표시, 여러 연결 대상, 검색 가능한 모델 선택, 대화 기록, 파일 첨부, 설정, 자동 업데이트 |
| 준비 중 | 음성 입력(입력창의 마이크 버튼은 아직 사용할 수 없습니다)                                                        |
| 미구현  | Anthropic API 지원                                                                                               |
| 미구현  | 개인화, 메모리, MCP                                                                                              |
| 미구현  | 가벼운 애니메이션                                                                                                |
| 미구현  | 화면 다국어화(영어·한국어)                                                                                       |

## 개발에 참여하기

<details>
<summary>소스에서 빌드하기 · 개발 명령어</summary>

### 필요한 것

- Node.js 22 이상
- pnpm(`package.json`의 `packageManager` 참고)
- Rust(stable)
- [Tauri 사전 요구 사항](https://v2.tauri.app/start/prerequisites/). Linux에서는 `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf` 등

### 빌드

```bash
git clone https://github.com/Harukotokoto/open-ui.git
cd open-ui
pnpm install

# 개발용으로 실행(프런트엔드는 localhost:1420)
pnpm tauri dev

# 설치 프로그램 만들기
pnpm tauri build
```

### 명령어

| 목적           | 명령어                                                   |
| -------------- | -------------------------------------------------------- |
| 포맷           | `pnpm format`(Biome), `pnpm rust:fmt`                    |
| Lint·타입 검사 | `pnpm lint`, `pnpm typecheck`, `pnpm rust:lint`          |
| 테스트         | `pnpm test`(Vitest), `pnpm rust:test`                    |
| IPC 타입 생성  | `pnpm bindings`(`src/types/bindings.ts`를 갱신하고 커밋) |

- Rust 명령이 Tauri의 빌드 결과물(`dist/`)을 참조하므로, `cargo clippy`나 `cargo test` 전에 `pnpm build`를 실행하세요.
- Windows에서는 Tauri를 링크한 크레이트의 단위 테스트가 시작되지 않습니다. Rust 테스트가 필요한 로직은 `crates/core/`에 두었습니다.
- `src/components/ui/`는 UI 컴포넌트 라이브러리의 생성물이므로 직접 수정하지 않습니다.

### 구성

WebView(React)는 표시와 입력만 담당하고, 서버와의 통신, API 키, 파일 읽기·쓰기는 Rust가 담당합니다.

| 디렉터리             | 내용                                                                        |
| -------------------- | --------------------------------------------------------------------------- |
| `src/`               | 프런트엔드(React): `components/`, `hooks/`, `services/`, `pages/`           |
| `crates/core/`       | Tauri에 의존하지 않는 Rust 로직과 타입(API·프로필·기록·설정·첨부·비밀 정보) |
| `src-tauri/`         | Tauri 앱. 명령 진입점과 IPC 타입 생성                                       |
| `assets/`            | 앱 아이콘 SVG와 README의 스크린샷                                           |
| `.github/workflows/` | CI와 릴리스 워크플로                                                        |

### 릴리스

버전 3곳(`package.json`·`src-tauri/tauri.conf.json`·`Cargo.toml`)을 맞춰 올리고 `v*` 태그를 푸시하면, GitHub Actions가 3개 OS용 설치 프로그램을 서명해서 빌드하고 초안 릴리스를 만듭니다. 초안을 공개하면 앱의 자동 업데이트가 새 버전을 찾습니다.

</details>

## 라이선스

[MIT License](LICENSE)
