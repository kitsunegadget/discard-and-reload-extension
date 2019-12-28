// ブラウザーアクションでのイベント発火
chrome.browserAction.onClicked.addListener(() => {
    chrome.tabs.query({}, (tabs) => {
        async function waiting() {
            return await Promise.all(tabs.map(async (tab) => {
                return await new Promise((resolve) => {
                    if (tab.highlighted || tab.discarded) {
                        resolve("Skip");
                    } else {
                        chrome.tabs.discard(tab.id, (d_tab) => {
                            // callback after discard is completed.
                            console.log("discarded id:", d_tab.id);
                            resolve("Success");
                        });
                    };
                });
            }));
        };
        waiting().then((value) => {
            //console.log(value);
            const discarded = value.filter(n => n === "Success").length;
            console.log(discarded);
            updateDiscardsCount(notify=true, discarded);
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
function updateDiscardsCount(notify=false, discarded=0) {
    chrome.tabs.query({}, (tabs) => {
        const discards = tabs.filter(tab => tab.discarded === true).length;
        //console.log(discards);
        chrome.browserAction.setBadgeText({ text: discards.toString() });
        chrome.browserAction.setTitle({title: "Now discarding " + discards.toString() + " of " + tabs.length});

        if (notify) {
            const notifyOption = {
                type: "basic",
                iconUrl: "icon128.png",
                title: "",
                message: discarded.toString() + " tabs discarded\n" 
                    + "Now discarding " + discards.toString() + " of " + tabs.length,
            };
            chrome.notifications.create(NotificationOptions=notifyOption);
        };
    });
};