const contentSection = document.getElementById("content");

const loadContent = () => {
  const storageItems = [
    "twitchIsValidated",
    "twitchAccessToken",
    "twitchStreams",
    "selectedPlatform",
  ];
  chrome.storage.local.get(storageItems, (res) => {
    if (res.twitchStreams) {
      const streamList = [];
      res.twitchStreams.map((stream) => {
        const streamContainer = document.createElement("div");
        streamContainer.setAttribute("class", "stream-container");
        streamContainer.onclick = () => {
          browser.tabs.create({
            url: `https://www.twitch.tv/${stream.channelName}`,
          });
        };
        streamList.push(streamContainer);

        const thumbnail = document.createElement("img");
        thumbnail.setAttribute("class", "stream-thumbnail");
        thumbnail.src = stream.thumbnail
          .replace("{width}", "160")
          .replace("{height}", "90");
        streamContainer.appendChild(thumbnail);

        const streamDetails = document.createElement("div");
        streamDetails.setAttribute("class", "stream-details");
        streamContainer.appendChild(streamDetails);

        const title = document.createElement("span");
        title.setAttribute("class", "stream-title");
        title.innerHTML = stream.title;
        streamDetails.appendChild(title);

        const channel = document.createElement("span");
        channel.setAttribute("class", "stream-channel-name");
        channel.innerHTML = stream.channelName;
        streamDetails.appendChild(channel);

        const category = document.createElement("span");
        category.setAttribute("class", "stream-game-name");
        category.innerHTML = stream.gameName;
        streamDetails.appendChild(category);

        const viewCount = document.createElement("span");
        viewCount.setAttribute("class", "stream-view-count");
        viewCount.innerHTML = "viewers: " + stream.viewerCount;
        streamDetails.appendChild(viewCount);
      });
      contentSection.replaceChildren(...streamList);
    } else if (!res.twitchIsValidated || !res.twitchAccessToken) {
      const loginButton = document.createElement("button");
      loginButton.setAttribute("class", "login-button");
      loginButton.setAttribute("id", "login-button");
      loginButton.innerHTML = "Authenticate";
      loginButton.onclick = () =>
        chrome.runtime.sendMessage({ message: "fetch-twitch-auth-token" });
      contentSection.replaceChildren(loginButton);
    }
  });
};

const refreshTwitchStreams = () => {
  chrome.runtime.sendMessage({ message: "refresh-twitch-streams" });
};

setInterval(refreshTwitchStreams, 1000 * 10);

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "refresh-page") {
    loadContent();
  }
});

loadContent();
