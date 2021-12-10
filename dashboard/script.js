function refreshAuthURL() {
  nodecg.sendMessage('get-twitch-auth-url');
  window.setTimeout(refreshAuthURL, 60000);
}

// Rewrite the authorization button's href property with the proper auth link
// every time the back end tells us what the URL is.
nodecg.listenFor('auth-redirect-url', url => {
  const link = document.getElementById('auth-link');
  link.href = url;
});

// Ask for an auth URL.
refreshAuthURL();
