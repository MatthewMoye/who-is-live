const APP_TOKEN = "APP_TOKEN";
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
          getFollowedStreams();
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
    `?client_id=${APP_TOKEN}` +
    `&response_type=token` +
    `&redirect_uri=${redirectURL}` +
    "&scope=user:read:follows&force_verify=true";
  chrome.identity.launchWebAuthFlow(
    { interactive: true, url: authPage },
    storeTwitchToken
  );
};

setInterval(validateTwitchToken, 1000 * 60 * 60);
validateTwitchToken();

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "fetch-twitch-auth-token") {
    getTwitchAuth();
  }
});
