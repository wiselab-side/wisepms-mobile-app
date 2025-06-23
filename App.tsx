import React, { useRef, useState, useEffect } from 'react';
import WebView from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview'; 
import {
  Linking, 
  SafeAreaView,
  BackHandler,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      console.log(data);
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
 

  return (
    <SafeAreaView style={{flex: 1}} >
        <WebView
            ref={webViewRef}
            source={{
                // uri: 'http://localhost:8090/',                   //아이폰 로컬
                // uri: 'http://10.0.2.2:8090',                     //안드로이드 로컬
                // uri: 'http://dev.mobile.wiselabpms.co.kr:9092/', //개발
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
