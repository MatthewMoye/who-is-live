const TWITCH_APP_TOKEN = "TWITCH_APP_TOKEN";
const YOUTUBE_CLIENT_ID = "YOUTUBE_CLIENT_ID";
const redirectURL = chrome.identity.getRedirectURL();

const handleTwitchUnauthorized = () => {
  chrome.storage.local.set({
    twitchAccessToken: null,
    twitchIsValidated: false,
    twitchUserId: null,
    twitchStreams: null,
  });
};

const validateTwitchToken = async () => {
  chrome.storage.local.get("twitchAccessToken", async (res) => {
    const accessToken = res.twitchAccessToken;
    if (!accessToken) return;
    await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => response.json())
      .then((response) => {
        if (response.expires_in === 0) {
          handleTwitchUnauthorized();
        } else {
          chrome.storage.local.set({
            twitchIsValidated: true,
            twitchUserId: response["user_id"],
          });
          getLiveTwitchStreams();
        }
      })
      .catch((error) => {
        handleTwitchUnauthorized();
        console.error(error);
      });
  });
};

const storeTwitchToken = (url) => {
  const token = url.split("#")[1].split("=")[1].split("&")[0];
  chrome.storage.local.set({ twitchAccessToken: token });
  validateTwitchToken();
};

const getTwitchAuth = () => {
  const authPage =
    `https://id.twitch.tv/oauth2/authorize` +
    `?client_id=${TWITCH_APP_TOKEN}` +
    `&response_type=token` +
    `&redirect_uri=${redirectURL}` +
    "&scope=user:read:follows&force_verify=true";
  chrome.identity.launchWebAuthFlow(
    { interactive: true, url: authPage },
    storeTwitchToken
  );
};

const storeYoutubeToken = (url) => {
  const token = url.split("#")[1].split("=")[1].split("&")[0];
  chrome.storage.local.set({ youtubeAccessToken: token });
  getLiveYoutubeStreams();
};

const getYoutubeAuth = () => {
  const authPage =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${YOUTUBE_CLIENT_ID}` +
    `&response_type=token` +
    `&redirect_uri=${redirectURL}` +
    "&scope=https://www.googleapis.com/auth/youtube.readonly";
  chrome.identity.launchWebAuthFlow(
    { interactive: true, url: authPage },
    storeYoutubeToken
  );
};

setInterval(validateTwitchToken, 1000 * 60 * 60);
validateTwitchToken();

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "fetch-twitch-auth-token") {
    getTwitchAuth();
  } else if (request.message === "fetch-youtube-auth-token") {
    getYoutubeAuth();
  }
});
