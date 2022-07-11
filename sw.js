// ブラウザーアクションでのイベント発火
chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    async function waiting() {
      return Promise.all(
        tabs.map(async (tab) => {
          return new Promise((resolve) => {
            if (tab.highlighted || tab.discarded) {
              resolve("Skip");
            } else {
              chrome.tabs.discard(tab.id, (d_tab) => {
                // callback after discard is completed.
                console.log("discarded id:", d_tab.id);
                resolve("Success");
              });
            }
          });
        })
      );
    }
    waiting().then((value) => {
      //console.log(value);
      const discarded = value.filter((n) => n === "Success").length;
      console.log(discarded);
      updateDiscardsCount((notify = true), discarded);
    });
  });
});

// 拡張機能ロード時に更新
chrome.runtime.onInstalled.addListener(() => {
  updateDiscardsCount();
});

// タブ切り替え時に更新
chrome.tabs.onActivated.addListener(() => {
  //console.log("tab actived fire");
  updateDiscardsCount();
});

// ウインドウを閉じた時に更新
chrome.windows.onRemoved.addListener(() => {
  //console.log("windows removed fire");
  updateDiscardsCount();
});

// Discard数の更新
function updateDiscardsCount(notify = false, discarded = 0) {
  chrome.tabs.query({}, (tabs) => {
    const discards = tabs.filter((tab) => tab.discarded === true).length;
    //console.log(discards);
    // chrome.action.setBadgeText({ text: discards.toString() });
    // chrome.action.setTitle({
    //   title: "Now discarding " + discards.toString() + " of " + tabs.length,
    // });

    if (notify) {
      const notifyOption = {
        type: "basic",
        iconUrl: "icon128.png",
        title: "",
        message:
          discarded.toString() +
          " tabs discarded\n" +
          "Now discarding " +
          discards.toString() +
          " of " +
          tabs.length,
      };
      chrome.notifications.create((NotificationOptions = notifyOption));
    }
  });
}

// test
async function updateBadges(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const heapSize = await getTotalJSHeapSize(tab.id);

  chrome.action.setBadgeText({
    text: addSIunit(heapSize),
    tabId: tab.id,
  });

  chrome.action.setTitle({
    title: `Total JS heap size: ${heapSize} bytes`,
    tabId: tab.id,
  });
}

async function getTotalJSHeapSize(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      return performance.memory.totalJSHeapSize;
    },
  });

  for (const frameResult of results) {
    console.log(frameResult);
    return frameResult.result;
  }
}

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

  const unitPoint = (t, mod) => {
    switch (mod) {
      case 1:
        return `${t.slice(0, 1)}.${t.slice(1, 3)}`;
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
}
