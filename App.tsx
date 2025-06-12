import React from 'react';
import { Linking, SafeAreaView } from 'react-native';
import WebView from 'react-native-webview';
import {
  SafeAreaView
} from 'react-native';

function App(): React.JSX.Element {

  return (
    <SafeAreaView style={{flex: 1}} >
        <WebView
            source={{
                uri: 'https://mobile.wiselabpms.co.kr',          
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' },
            }}
            allowFileAccess={true}
            scalesPageToFit={true}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
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
        />
    </SafeAreaView>
  );
}

export default App;
