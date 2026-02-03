import React, { useRef, useState, useEffect } from 'react';
import WebView from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview'; 
import {
  Linking, 
  SafeAreaView,
  BackHandler,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';

function App(): React.JSX.Element {

  const webViewRef = useRef<WebViewType>(null);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  
  // 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        // WebView에서 뒤로가기 가능한 경우
        webViewRef.current.goBack();
        return true;
      } else {
        // WebView에서 뒤로가기 불가능한 경우 앱 종료 확인
        Alert.alert(
          'Wiselabpms',
          '앱을 종료하시겠습니까?',
          [
            {
              text: '취소',
              onPress: () => null,
              style: 'cancel',
            },
            { text: '종료', onPress: () => BackHandler.exitApp() },
          ]
        );
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  function receivePostMessage(event: any) {
    const data = JSON.parse(event.nativeEvent.data);
      switch (data.callModuleType) {
        case 'SAVE_TOKEN':
          saveToken(data.token);
          break;
        case 'CALL_TEL':
          break;
        case 'LOGOUT_TOKEN':
          removeToken();
          break;
        case 'WEBVIEW_READY':
          sendToken();
          break;
        case 'REQUEST_LOCATION_PERMISSION':
          requestLocationAndSendToWebView();
          break;
      }
  }

  //토큰 웹뷰로 전송
  async function sendToken() {
    const token = await AsyncStorage.getItem('token');
    if (token && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'AUTH_TOKEN', token }));
    }
  }

  //로그인 토큰 저장
  async function saveToken(jwtToken: string) {
    await AsyncStorage.setItem('token', jwtToken);
  }

  //로그아웃 시 토큰 삭제
  async function removeToken() {
    await AsyncStorage.removeItem('token');
  }

  // (1) 권한 팝업 요청 → (2) 현재 위치 얻기 → (3) WebView로 전송
  async function requestLocationAndSendToWebView() {
    try {
      // 1) 권한 확보
      if (Platform.OS === 'android') {
        const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
        const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

        const hasFine = await PermissionsAndroid.check(fine);
        const hasCoarse = await PermissionsAndroid.check(coarse);

        if (!hasFine && !hasCoarse) {
          const results = await PermissionsAndroid.requestMultiple([fine, coarse]);
          const fineRes = results[fine];
          const coarseRes = results[coarse];

          const granted =
            fineRes === PermissionsAndroid.RESULTS.GRANTED ||
            coarseRes === PermissionsAndroid.RESULTS.GRANTED;

          if (!granted) {
            const neverAskAgain =
              fineRes === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
              coarseRes === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
            // WebView가 "취소/거부" 케이스를 즉시 처리할 수 있도록 결과를 전달
            const permissionStatus = neverAskAgain ? 'never_ask_again' : 'denied';
            if (webViewRef.current) {
              webViewRef.current.postMessage(
                JSON.stringify({
                  type: 'GPS_PERMISSION_RESULT',
                  status: permissionStatus,
                  fine: fineRes,
                  coarse: coarseRes,
                })
              );
            }

            if (neverAskAgain) {
              Alert.alert(
                '위치 권한 필요',
                '설정에서 위치 권한을 허용해야 합니다.',
                [
                  { text: '취소', style: 'cancel' },
                  { text: '설정 열기', onPress: () => Linking.openSettings() },
                ]
              );
            } else {
              Alert.alert(
                '위치 권한 필요',
                '위치 서비스를 사용하려면 위치 권한이 필요합니다.',
                [{ text: '확인', style: 'default' }]
              );
            }

            if (webViewRef.current) {
              webViewRef.current.postMessage(
                JSON.stringify({
                  type: 'GPS_ERROR',
                  code: 'PERMISSION_DENIED',
                  status: permissionStatus,
                  message: 'Location permissions denied',
                })
              );
            }
            return;
          }
        }
        
      } else if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        if (auth !== 'granted') {
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'GPS_PERMISSION_RESULT',
                status: auth,
              })
            );
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'GPS_ERROR',
                code: 'PERMISSION_DENIED',
                status: auth,
                message: 'Location permissions denied',
              })
            );
          }
          return;
        }
      }

      // 2) 현재 위치 얻기
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // 3) WebView로 전송
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({ type: 'CURRENT_POSITION', latitude, longitude })
            );
          }
        },
        (error) => {
          console.warn('GPS Error: ', error);
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({ type: 'GPS_ERROR', message: error.message || 'Failed to get location' })
            );
          }
        },
      );
    } catch (err) {
      console.error('requestLocationAndSendToWebView error:', err);
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({ type: 'GPS_ERROR', message: err instanceof Error ? err.message : 'Unknown error' })
        );
      }
    }
  }

  return (
    <SafeAreaView style={{flex: 1}} >
        <WebView
            ref={webViewRef}
            source={{
                // uri: 'http://127.0.0.1:8090/',                   //로컬
                // uri: 'http://localhost:8090/',                   //아이폰 로컬
                // uri: 'http://172.16.11.223:8090/',                     //안드로이드 로컬
                // uri: 'http://dev.mobile.wiselabpms.co.kr:9091/', //개발
                uri: 'https://mobile.wiselabpms.co.kr',          //운영
                
                
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' },
            }}
            allowFileAccess={true}
            scalesPageToFit={true}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback={true}
            geolocationEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error: ', nativeEvent);
            }}
            onShouldStartLoadWithRequest={event => {
              const url = event.url;
              // mailto: 또는 tel: 링크는 WebView 대신 네이티브로 오픈
              if (url.startsWith('mailto:') || url.startsWith('tel:')) {
                Linking.canOpenURL(url)
                  .then(supported => supported && Linking.openURL(url))
                  .catch(err => console.warn('Linking error', err));
                return false; // WebView 로 로드 차단
              }
              return true;  // 그 외는 WebView 로 정상 로드
            }}
            onMessage={receivePostMessage}
        />
    </SafeAreaView>
  );
}

export default App;
