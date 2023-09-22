chrome.storage.local.set({ selectedPlatform: "TWITCH" });

const getLiveTwitchStreams = async () => {
  const storageItems = [
    "twitchIsValidated",
    "twitchAccessToken",
    "twitchUserId",
  ];
  chrome.storage.local.get(storageItems, (res) => {
    if (!res.twitchIsValidated) return;
    const followUrl =
      "https://api.twitch.tv/helix/streams/followed" +
      `?&first=100&user_id=${res.twitchUserId}`;
    fetch(followUrl, {
      headers: {
        Authorization: `Bearer ${res.twitchAccessToken}`,
        "Client-ID": TWITCH_APP_TOKEN,
      },
    })
      .then((response) => {
        if (response.status !== 200) {
          handleTwitchUnauthorized();
          throw new Error("An error occurred");
        }
        return response.json();
      })
      .then((response) => {
        chrome.storage.local.set({
          twitchStreams: response.data.map((stream) => ({
            gameName: stream["game_name"],
            thumbnail: stream["thumbnail_url"],
            title: stream["title"],
            channelName: stream["user_name"],
            viewerCount: stream["viewer_count"],
            liveTime: getTimePassed(stream["started_at"]),
          })),
        });
        chrome.runtime.sendMessage({ message: "refresh-page" });
      })
      .catch((error) => {
        handleTwitchUnauthorized();
        console.error(error);
      });
  });
};

const getLiveYoutubeStreams = async () => {
  let subscriptions = [];
  chrome.storage.local.get("youtubeAccessToken", async (res) => {
    if (!res.youtubeAccessToken) return;
    let nextPageToken = "";
    const subscriptionsUrl =
      "https://www.googleapis.com/youtube/v3/subscriptions" +
      "?part=snippet&maxResults=50&mine=true";
    while (nextPageToken != null) {
      const url =
        subscriptionsUrl + (nextPageToken ? `&pageToken=${nextPageToken}` : "");
      await fetch(url, {
        headers: { Authorization: `Bearer ${res.youtubeAccessToken}` },
      })
        .then((response) => {
          if (response.status === 401) {
            getYoutubeAuth();
          } else if (response.status !== 200) {
            handleYoutubeUnauthorized();
            throw new Error("An error occurred");
          }
          return response.json();
        })
        .then((response) => {
          nextPageToken = response.nextPageToken;
          subscriptions.push(
            ...response.items.map((channel) => ({
              thumbnail: channel.snippet.thumbnails.default.url,
              channelName: channel.snippet.title,
              channelId: channel.snippet.resourceId.channelId,
            }))
          );
          chrome.runtime.sendMessage({ message: "refresh-page" });
        })
        .catch((error) => {
          console.error(error);
          nextPageToken = null;
        });
    }
    let liveStreams = [];
    await Promise.all(
      subscriptions.map(async (sub) => {
        await fetch(`https://www.youtube.com/channel/${sub.channelId}/live`)
          .then((response) => response.text())
          .then((text) => {
            const isPlannedStream = text.includes(
              '"status":"LIVE_STREAM_OFFLINE"'
            );
            const isLiveString = text.includes(
              'link rel="canonical" href="https://www.youtube.com/watch?v='
            );
            if (isLiveString && !isPlannedStream) {
              const title = text
                .split("<title>")[1]
                .split(" - YouTube</title>")[0];
              const liveTime = text
                .split('"simpleText":"Started streaming ')[1]
                .split('"}')[0];
              const viewerCount = text
                .split('"viewCount":{"runs":[{"text":"')[1]
                .split('"}')[0];
              liveStreams.push({ ...sub, title, liveTime, viewerCount });
            }
          });
      })
    );
    chrome.storage.local.set({ youtubeStreams: liveStreams });
    chrome.runtime.sendMessage({ message: "refresh-page" });
  });
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "refresh-twitch-streams") {
    getLiveTwitchStreams();
  } else if (request.message === "refresh-youtube-streams") {
    getLiveYoutubeStreams();
  }
});
