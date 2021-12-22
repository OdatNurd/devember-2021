// Track whether or not the current file buffer is dirty or not; this is
// used to determine what controls should be active.
let isDirty = false;

// Capture the select elements that we're going to be manipulating.
const itemGroups = document.querySelector('#itemGroups');
const itemList = document.querySelector('#itemList');
const saveBtn = document.querySelector('#saveBtn');
const discardBtn = document.querySelector('#discardBtn');
const refreshOnSave = document.querySelector('#refreshOnSave');

// Capture elements in the status bar
const statusBar = document.querySelector('#statusBar');
const editorStatus = document.querySelector('#editor-status');
const editorFile = document.querySelector('#editor-file');

// This sets up a status bar that provides some contextual editor
// information such as editor location and the like.
function enableStatusBar(editor) {
  let lang = ace.require("ace/lib/lang");
  let statusUpdate = lang.delayedCall(function(){
      let status = [];
      function add(str, separator) {
          str && status.push(str, separator || " | ");
      }

      let sel = editor.selection;
      let cursor = sel.getSelectionLead();
      // console.log(sel.getAllRanges());

      // Cursor location; this is always the last one if there are many.
      add(`Line ${cursor.row + 1}, Column ${cursor.column + 1}`);

      // Display status information from the editor, including whether it
      // is currently recording a macro or not.
      add(editor.keyBinding.getStatusText(editor));
      if (editor.commands.recording) add("REC");

      // If there is some selected text, say how many are selected.
      //
      // It transpires that the only way to calculate selection length
      // using the API seems to be by extracting the text and checking
      // it's length; there is no conversion between row/col and offset
      // as far as I can see. So this is currently disabled because that
      // seems like a nonsensical thing to do.
      // if (!sel.isEmpty()) {
      //     let r = editor.getSelectionRange();
      //     // let selected = range
      //     add(`<${r.end.row - r.start.row}:${r.end.column - r.start.column}>`);
      // }

      // Display the selection count if there's more than one.
      if (sel.rangeCount) {
        add(`${sel.rangeCount} selection regions`);
      }

      // Update now; we need to discard the last separator first, since
      // every add includes one.
      status.pop();
      editorStatus.textContent = status.join("");
    }.bind(this)).schedule.bind(null, 100);

    editor.on("changeStatus", statusUpdate);
    editor.on("changeSelection", statusUpdate);
    editor.on("keyboardActivity", statusUpdate);

    // Trigger an initial update
    statusUpdate();
}

// Set the text that's being displayed in the editor to the provided text.
// This also changes the readonly state to the one provided.
function setEditorText(editor, filename, text, readOnly) {
  // Update to display the name of the file that we're editing.
  editorFile.innerText = filename;

  editor.setOption('readOnly', readOnly);
  editor.setValue(text);

  // The inserting selects the text, so reset the cursor. Also,
  // resetting the cursor loses the focus because reasons.
  editor.clearSelection();
  editor.moveCursorTo(0, 0);
  editor.scrollToLine(0, false, true);
  editor.focus();

  // Since we just put some new data into the file, it's by definition
  // no longer dirty
  markDirty(false);

  // Reset the undo state; now that we've specifically set text, we
  // don't want to be able to undo that to go back to a previous
  // poimt
  editor.session.getUndoManager().reset();
}

// Mark the buffer as being either dirty or clean; this also updates all
// controls based on the new status to make sure that the visual display
// and controls are appropriate to the situation.
function markDirty(makeDirty) {
  // If the new state is the state we're already in, do nothing.
  if (isDirty === makeDirty) {
    return;
  }

  // Update the flag and change classes as appropriate.
  isDirty = makeDirty;
  if (isDirty === true) {
    statusBar.classList.add('isDirty')
  } else {
    statusBar.classList.remove('isDirty')
  }

  // Disable selecting a new file if the current one is modified to avoid
  // losing changes.
  itemGroups.disabled = isDirty;
  itemList.disabled = isDirty;

  // The save and discard buttons should only be enabled while the file
  // is dirty; otherwise they would be saving and discarding nothing of
  // interest.
  saveBtn.disabled = !isDirty;
  discardBtn.disabled = !isDirty;
}

// This is invoked to save the text currently in the editor back to the
// server.
async function saveEditorText() {
  // Do nothing if the file is not currently dirty, since there's nothing
  // of any interest to send back.
  if (isDirty === false) {
    return;
  }

  try {
    const response = await window.fetch(`/files/${itemGroups.value}/${itemList.value}`, {
      method: 'put',
      body: editor.getValue(),
      headers: {'Content-Type': 'text/javascript'}
    });

    if (response.success === false) {
      throw new Error('Error saving file');
    }

    markDirty(false);

    if (refreshOnSave.checked) {
      window.fetch(`/files/${itemGroups.value}/${itemList.value}/reload`, {
        method: 'post'
      });
    }
  }
  catch (e) {
    nodecg.log.error(`Error saving file contents: ${e}`);
  }
}

// This is invoked to discard the contents of the buffer and put it back
// into the state needed for the current file.
function discardEditorText() {
  // Do nothing if the file is not currently dirty, since there is nothing
  // that would require us to revert.
  if (isDirty === false) {
    return;
  }

  // Re-load the currentl selected item from the select lists, clobbering
  // over any existing text. This will also change the dirty state as
  // needed.
  if (confirm('This will discard all current changes; are you sure?')) {
    loadEditorText(itemGroups.value, itemList.value);
  }
}

// Make a request to the server to load the editor with the content for
// the specific item given.
async function loadEditorText(itemType, itemID) {
   try {
    const response = await fetch(`/files/${itemType}/${itemID}`);
    const content = await response.text();
    const filename = response.headers.get('x-item-filename');
    setEditorText(editor, filename, content, false);
  }
  catch (e) {
    nodecg.log.error(`Error fetching file contents: ${e}`);
  }
}

saveBtn.addEventListener('click', () => saveEditorText());
discardBtn.addEventListener('click', () => discardEditorText());

// This does the work of setting up the file editor and connecting all of the
// events. If this fails for any reason, the editor will do nothing.
const setupFileEditor = () => {
  // Set up the editor component now
  const editor = ace.edit("editor");
  enableStatusBar(editor);

  // We want the good Sublime Text keyboard action
  editor.setKeyboardHandler("ace/keyboard/sublime");

  // Add in a stub command for being able to handle the save key and
  // trigger a send back to the server. This is currently stubbed out.
  editor.commands.addCommand({
    name: "save_file",
    bindKey: { win: "Ctrl-S", mac: "Command-S" },
    exec: () => saveEditorText()
  });

  // Whenever the editor mode changes, if it changes to JavaScript set
  // up the expected JS version for the linting tools.
  editor.session.on('changeMode', (e, session) => {
    if ("ace/mode/javascript" === session.getMode().$id) {
      if (!!session.$worker) {
        session.$worker.send("setOptions", [{
          "esversion": 9,
          "esnext": false,
        }]);
      }
    }
  });

  // Mark the editor as dirty any time there's a change made to the
  // buffer.
  editor.session.on('change', (e) => {
    markDirty(true);
    // markDirty(editor.session.getUndoManager().hasUndo());

  })

  // Set up our editor configuration now. We need to pull in the language
  // tools to be able to have snippets and autocomplete in the editor.
  ace.require("ace/ext/language_tools");
  editor.setOptions({
    "theme": "ace/theme/cobalt",
    "mode": "ace/mode/javascript",
    "copyWithEmptySelection": true,
    "showPrintMargin": true,
    "printMarginColumn": 100,
    "fontSize": 16,
    "fontFamily": "iosevka_ss09regular",
    // pages you can scroll past the end; fractional between 0 and 1.
    "scrollPastEnd": 1,
    "dragEnabled": false,
    "tabSize": 4,
    "wrap": "off",
    "foldStyle": "markbeginend",
    // If false, the gutter grows and shrinks as you scroll in longer documents
    "fixedWidthGutter": true,
    "enableBasicAutocompletion": true,
    "enableSnippets": true,
    "enableLiveAutocompletion": false,
  });

  // Update the line height on the editor to give us a bit more spacing; without
  // this ascenders tend to get cut off with the default line height.
  editor.container.style.lineHeight = 1.2;
  editor.renderer.updateFontSize()

  return editor;
}

// Initialize the file editor
const editor = setupFileEditor();

// Fetch all of the items of a given type from the back end and return
// them.
//
// The result is an object whose keys are the names of the unique files
// that implement items of that type, and whose values are arrays that
// contain all of the items stored within those files.
//
// These can later be displayed in the select grouped up by the file that
// items are implemented inside of.
const fetchItems = async (itemType) => {
  try {
    const response = await fetch(`/${itemType}`)
    if (!response.ok) {
        throw new Error(`Request for ${itemType} failed`)
    }
    const items = await response.json();
    const retVal = new Map();

    items.forEach(item => {
      if (retVal.has(item.sourceFile) === false) {
        // console.log(`Add new key for ${item.sourceFile}`);
        retVal.set(item.sourceFile, []);
      }
      // console.log(`Storing item for ${item.sourceFile}`);
      retVal.get(item.sourceFile).push(item);
    });

    // If we were returning objects, this is an example of doing the same
    // as the above, but in a single line.
    // items.reduce((acc,item)=>{acc[item.sourceFile] = acc[item.sourceFile]?[...acc[item.sourceFile],item]:[item]; return acc;},{})
    return retVal;
  }
  catch (e) {
      nodecg.log.error(`Error fetching items: ${e}`);
  }
}

// Update the provided select tag with all of the items of the given type,
// which should be one of "commands", "events" or "channelpoints". This
// makes a network request to collect the items and then populates them
// into the select field.
//
// Whenever this triggers, the editor control will be auto-loaded with
// the first item in the select.
const setItems = async (selectTag, itemType) => {
  const items = await fetchItems(itemType);

  // Clobber the existing items
  selectTag.innerHTML = '';


  // Stores the ID of the first item we add to the list, so that we can
  // load it up.
  let firstID = null;

  // Add an option group for each file, and inside of the group all of the
  // items contained within that file.
  items.forEach((items, file) => {
    const group = document.createElement('optgroup');
    group.label = file;

    items.forEach(item => {
      const tag = document.createElement('option');
      tag.value = item.id;
      tag.innerText = itemType === 'channelpoints' ? item.aliases[0] || item.name : item.name;

      group.append(tag);

      if (firstID === null) {
        firstID = item.id;
      }
    })

    selectTag.append(group);
  });

  // If we loaded anything, fill the buffer with the contents of the
  // file associated with that item.
  if (firstID !== null) {
    loadEditorText(itemType, firstID);
  }
};

// When the type of item changes, make a request to fetch the items of the
// new type and populate them into the item list.
itemGroups.addEventListener('change', async (evt) => setItems(itemList, evt.target.value));

// When the selected item in the list of items changes, load the contents
// for that file into the editor.
itemList.addEventListener('change', async (evt) => loadEditorText(itemGroups.value, evt.target.value));

// Kick things off by adding items to the item dropdown for commands,
// which are the items that are there by default.
setItems(itemList, 'commands');
