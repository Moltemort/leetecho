import * as React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import './storage/electron-store';
import './index.less';
import App from './app';
import { HashRouter } from 'react-router-dom';
import AppStoreProvider from './store/appStore';
import { Global } from '@emotion/react';
import globalStyles from './style';
import to from 'await-to-js';

const { bridge: { removeLoading, ipcRenderer } } = window;


ReactDOM.render(
  <AppStoreProvider>
    <Global styles={globalStyles}></Global>
    <HashRouter>
      <App />
    </HashRouter>,
  </AppStoreProvider>,
  document.getElementById('root'),
  () => {
    removeLoading();
  },
);


// -----------------------------------------------------------

// console.log('contextBridge ->', window.bridge);

// Use ipcRenderer.on
// ipcRenderer.on('main-process-message', (_event, ...args) => {
//   console.log('[Receive Main-process message]:', ...args);
// });

// const home = ipcRenderer.sendSync('get-path', 'home');

// console.log('%c get-path home >>>', 'background: yellow; color: blue', home ?? undefined);

/** Test api from main process */
(async () => {
  const [loginErr, _] = await to(ipcRenderer.invoke('login', { usrName: 'yourUsrName', pwd: 'yourUsrPwd' } as LoginReq)) as [ErrorResp | null, LoginResp];
  if (loginErr) {
    console.log('%c err >>>', 'background: yellow; color: blue', loginErr);
  }

  const [getAllProblemsErr, res] = await to(ipcRenderer.invoke('getAllProblems')) as [ErrorResp | null, GetAllProblemsResp];
  if (getAllProblemsErr) {
    console.log('%c err >>>', 'background: yellow; color: blue', loginErr);
  }
  debugger;
  console.log('%c res >>>', 'background: yellow; color: blue', res);

  const { data: { problems } } = res;
  debugger;
  console.log('%c  problems>>>', 'background: yellow; color: blue', problems);


})();