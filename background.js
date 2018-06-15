// ブラウザーアクションでイベント発火
chrome.browserAction.onClicked.addListener(() => {
    chrome.tabs.query({}, (tabs) => {
        let discarded = 0;
        async function waiting() {
            return await Promise.all(tabs.map(async (tab) => {
                if (tab.highlighted || tab.discarded) {
                    return;
                };
                return await new Promise(resolve => {
                    chrome.tabs.discard(tab.id, (d_tab) => {
                        if (d_tab) {
                            console.log("discarded id:", d_tab.id);
                        };
                        if (d_tab.discarded) discarded++;
                        resolve();
                    });
                });
            }));
        };
        waiting().then(() => {
            console.log(discarded);
            updateDiscardsCount(notify=true, discarded);
        });
    });
});

// タブ切り替え時に更新
chrome.tabs.onActivated.addListener(() => {
    updateDiscardsCount();
});

// 拡張機能ロード時に更新
chrome.runtime.onInstalled.addListener(() => {
    updateDiscardsCount();
});

// Discard数の更新
function updateDiscardsCount(notify=false, discarded=0) {
    chrome.tabs.query({}, (tabs) => {
        let discards = 0;
        for (tab of tabs) {
            if (tab.discarded) discards++;
        };
        chrome.browserAction.setBadgeText({ text: discards.toString() });

        if (notify) {
            const notifyOption = {
                type: "basic",
                iconUrl: "icon.png",
                title: "",
                message: discarded.toString() + " tabs discarded\n" 
                    + "Now discarding " + discards.toString() + " of " + tabs.length,
            };
            chrome.notifications.create(NotificationOptions=notifyOption);
        };
    });
};