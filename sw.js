/**
 * バッジテキストの更新
 * @param {number} tabId
 */
async function updateBadges(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url == null) {
    return;
  }

  const heapSize = await getJSHeapSize(tabId);

  chrome.action.setBadgeText({
    text: addSIunit(heapSize),
    tabId: tabId,
  });

  // chrome.action.setTitle({
  //   title: `Total JS heap size: ${heapSize} bytes`,
  //   tabId: tab.id,
  // });
}

/**
 * 指定タブのJSヒープサイズを取得
 * @param {number} tabId
 * @returns {Promise<number>} JSヒープサイズ(Byte)。取得できなかった場合は-1を返します。
 */
async function getJSHeapSize(tabId) {
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      return performance.memory.usedJSHeapSize;
    },
  });

  console.log(injectionResult);

  if (injectionResult) {
    return injectionResult.result;
  } else {
    return -1;
  }
}

/**
 * 数値を単位で省略
 * @param {*} num
 * @returns
 */
function addSIunit(num) {
  let text = "";
  if (typeof num === "number") {
    text = num.toString();
  } else if (typeof num === "string") {
    text = num;
  } else {
    throw new TypeError("num is not a number or string");
  }

  const unitMod = text.length % 3;

  /**
   * 数値を先頭文字のみにスライス
   * @param {*} t
   * @param {*} mod
   * @returns
   */
  const unitPoint = (t, mod) => {
    // バッジテキストは4文字までなので、単位を除いて3文字以下にする
    switch (mod) {
      case 1:
        return `${t.slice(0, 1)}.${t.slice(1, 2)}`;
      case 2:
        return `${t.slice(0, 2)}`;
      case 0:
        return `${t.slice(0, 3)}`;
    }
  };

  // 123456 -> 123k
  // 1234567 -> 1.2M
  if (text.length <= 3) {
    return text;
  } else if (text.length <= 6) {
    return `${unitPoint(text, unitMod)}K`;
  } else if (text.length <= 9) {
    return `${unitPoint(text, unitMod)}M`;
  } else if (text.length <= 12) {
    return `${unitPoint(text, unitMod)}G`;
  }

  return "";
}

//     |-------------------------|
//-----| Chrome extension events |-----
//     |-------------------------|

// ブラウザーアクションでのイベント発火
chrome.action.onClicked.addListener(async (activeTab) => {
  const discardedTab = await chrome.tabs.discard(activeTab.id);
  chrome.tabs.reload(discardedTab.id);
});

// タブ切り替え時に更新
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadges(activeInfo.tabId);
});

// タブ更新時に更新
chrome.tabs.onUpdated.addListener((tabId, object, tab) => {
  if (object.status === "complete") {
    updateBadges(tabId);
  }
});

// ウインドウのフォーカスが変更されたときに更新
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  const [tab] = await chrome.tabs.query({
    windowId: windowId,
    active: true,
  });

  // フォーカスにアクセスできない場合、最初のタブが変更される場合があるため
  // completeのタブか確認する
  if (tab.status === "complete") {
    updateBadges(tab.id);
  }
});

// アラームの作成
chrome.alarms.create({
  delayInMinutes: 0,
  periodInMinutes: 1,
});

// アラームイベント
chrome.alarms.onAlarm.addListener(async () => {
  const windows = await chrome.windows.getAll({ populate: true });
  const normalWindows = windows.filter((w) => w.state === "normal");

  normalWindows.forEach((window) => {
    window.tabs.forEach((tab) => {
      if (tab.active === true && tab.status === "complete") {
        updateBadges(tab.id);
      }
    });
  });
});
