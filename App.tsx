import React from 'react';
import WebView from 'react-native-webview';
import {
  SafeAreaView
} from 'react-native';

function App(): React.JSX.Element {

  return (
    <SafeAreaView style={{flex: 1}} >
        <WebView
            source={{
                // uri: 'https://dev.mobile.wiselabpms.co.kr:9092'
                uri: 'https://mobile.wiselabpms.co.kr',          
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' },
            }}
            allowFileAccess={true}
            scalesPageToFit={true}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
        />
    </SafeAreaView>
  );
}

export default App;
