const twitchButton = document.getElementById("twitch-button");
const youtubeButton = document.getElementById("youtube-button");
const contentSection = document.getElementById("content");

const handleButtonSetup = () => {
  chrome.storage.local.get("selectedPlatform", (res) => {
    if (res.selectedPlatform === "TWITCH") {
      twitchButton.style.pointerEvents = "none";
      youtubeButton.style.pointerEvents = null;
    } else if (res.selectedPlatform === "YOUTUBE") {
      twitchButton.style.pointerEvents = null;
      youtubeButton.style.pointerEvents = "none";
    }
  });
};

const createLoginButton = (platform) => {
  const loginButton = document.createElement("button");
  loginButton.setAttribute("class", "login-button");
  loginButton.setAttribute("id", "login-button");
  loginButton.innerHTML = "Authenticate";
  loginButton.onclick = () =>
    chrome.runtime.sendMessage({ message: `fetch-${platform}-auth-token` });
  contentSection.replaceChildren(loginButton);
};

const loadTwitchContent = () => {
  const storageItems = [
    "twitchIsValidated",
    "twitchAccessToken",
    "twitchStreams",
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
        viewCount.setAttribute("class", "stream-stats");
        viewCount.innerHTML =
          stream.viewerCount + " viewers, " + stream.liveTime;
        streamDetails.appendChild(viewCount);
      });
      contentSection.replaceChildren(...streamList);
    } else if (!res.twitchIsValidated || !res.twitchAccessToken)
      createLoginButton("twitch");
  });
};

const refreshTwitchStreams = () => {
  chrome.runtime.sendMessage({ message: "refresh-twitch-streams" });
};
setInterval(refreshTwitchStreams, 1000 * 15);

const loadYoutubeContent = () => {
  const storageItems = ["youtubeAccessToken", "youtubeStreams"];
  chrome.storage.local.get(storageItems, (res) => {
    if (res.youtubeStreams && res.youtubeAccessToken) {
      const streamList = [];
      res.youtubeStreams.map((stream) => {
        const streamContainer = document.createElement("div");
        streamContainer.setAttribute("class", "stream-container");
        streamContainer.onclick = () => {
          browser.tabs.create({
            url: `https://www.youtube.com/channel/${stream.channelId}/live`,
          });
        };
        streamList.push(streamContainer);

        const thumbnail = document.createElement("img");
        thumbnail.setAttribute("class", "stream-thumbnail");
        thumbnail.src = stream.thumbnail;
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

        const viewCount = document.createElement("span");
        viewCount.setAttribute("class", "stream-stats");
        viewCount.innerHTML =
          stream.viewerCount + " viewers, " + stream.liveTime;
        streamDetails.appendChild(viewCount);
      });
      contentSection.replaceChildren(...streamList);
    } else if (!res.youtubeAccessToken) createLoginButton("youtube");
  });
};

const refreshYoutubeStreams = () => {
  chrome.runtime.sendMessage({ message: "refresh-youtube-streams" });
};
refreshYoutubeStreams();
setInterval(refreshYoutubeStreams, 1000 * 15);

const loadContent = () => {
  handleButtonSetup();
  chrome.storage.local.get("selectedPlatform", (res) => {
    if (res.selectedPlatform === "TWITCH") {
      loadTwitchContent();
    } else if (res.selectedPlatform === "YOUTUBE") {
      contentSection.replaceChildren();
      loadYoutubeContent();
    }
  });
};

const setActiveTab = (platform) => {
  chrome.storage.local.set({ selectedPlatform: platform });
  handleButtonSetup();
  loadContent();
};

twitchButton.onclick = () => setActiveTab("TWITCH");
youtubeButton.onclick = () => setActiveTab("YOUTUBE");

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "refresh-page") {
    loadContent();
  }
});

loadContent();
