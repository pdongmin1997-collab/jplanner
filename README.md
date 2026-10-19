# J플래너 (설치형 앱 / PWA)

폴더 안 파일 전부를 같은 위치에 올려야 해요.
index.html · manifest.webmanifest · sw.js · icon-192.png · icon-512.png · icon-512-maskable.png · apple-touch-icon.png

## 1. 폰에 앱으로 설치하는 법 (무료)
1. cloudflare.com 가입 → Workers & Pages → Create → Upload assets
2. 이 폴더의 파일을 전부 끌어다 놓고 Deploy (또는 GitHub Pages / Netlify Drop 도 가능)
3. 생성된 https 주소를 폰에서 열기
   - 아이폰: Safari → 공유 → "홈 화면에 추가"
   - 안드로이드: Chrome 메뉴 → "앱 설치" (앱 설정의 [설치] 버튼도 가능)
※ 서비스워커는 https 주소에서만 동작해요. 파일을 그냥 더블클릭해서 열면 일반 웹페이지로 동작합니다.

## 2. 진짜 앱(APK / 스토어 등록)으로 만들고 싶다면
Capacitor로 감싸면 돼요 (PC에 Node.js 필요, 안드로이드는 Android Studio 필요).

    mkdir jplanner-app && cd jplanner-app
    npm init -y
    npm i @capacitor/core @capacitor/cli @capacitor/android
    npx cap init "J플래너" com.example.jplanner --web-dir=www
    mkdir www && cp ../jplanner/* www/
    npx cap add android
    npx cap sync
    npx cap open android      # Android Studio에서 Run / Build APK

iOS는 `@capacitor/ios` + Mac의 Xcode가 필요해요.

## 참고
- 데이터는 기기 localStorage에 저장돼요. 폰을 바꿀 땐 설정 → JSON 내보내기로 백업하세요.
- 지도·경로·위치 검색은 인터넷이 필요해요 (앱 화면 자체는 오프라인에서도 열려요).
