// Listen for messages that can alter the contents of the log panel.
//
// As currently defined, only one set of logs at a time can be present; this
// should probably make this such that it has a scroll panel and we just tack
// data onto the end of it, but this is an initial draft.
function setupLogPanel(type) {
  // Get the element that will contain our logger output.
  const logPanel = document.getElementById(`${type}-data`);

  nodecg.listenFor(`set-${type}-log`, text => logPanel.innerText = text);
  nodecg.listenFor(`clear-${type}-log`, () => logPanel.innerText = 'No log data');

  // Ask for the initial startup log when the page loads.
  nodecg.sendMessage(`get-initial-${type}-log`);
}