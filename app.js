const listensContainer = document.getElementById('listens-container');
const addButton = document.getElementById('add-button');
const selectAllCheckbox = document.createElement('input');

// Variables to hold user input values
let listenBrainzToken = '';
let playlistMbid = '';
let numRecentListens = 10;  // Default value to fetch 10 recent listens
let username = '';

// Function to fetch listens from ListenBrainz
async function fetchListens() {
  // Get values from input fields
  username = document.getElementById('username').value;
  listenBrainzToken = document.getElementById('api-token').value;
  playlistMbid = document.getElementById('playlist-mbid').value;
  numRecentListens = document.getElementById('num-listens').value;

  const debugContainer = document.createElement('div');  // For displaying debug info
  listensContainer.appendChild(debugContainer);          // Append debug container to listens container

  if (!username || !listenBrainzToken || !playlistMbid) {
    alert('Please enter all required fields: Username, API Token, and Playlist MBID.');
    return;
  }

  // Clear any previous debug info
  debugContainer.innerHTML = '';

  try {
    const response = await fetch(`https://api.listenbrainz.org/1/user/${username}/listens?count=${numRecentListens}`, {
      headers: {
        'Authorization': `Token ${listenBrainzToken}`
      }
    });

    // Log response status and headers for further debugging
    console.log('Status Code:', response.status);
    console.log('Headers:', response.headers);

    // Display response status on the page
    debugContainer.innerHTML = `<p>Status Code: ${response.status}</p>`;

    // Check if response status is not OK (200)
    if (!response.ok) {
      throw new Error(`API request failed with status code: ${response.status}`);
    }

    // Parse the response as JSON
    const data = await response.json();

    // Display the full API response on the page for debugging
    debugContainer.innerHTML += `<pre>Full API Response: ${JSON.stringify(data, null, 2)}</pre>`;

    // Log the full API response to console for debugging
    console.log('Full API Response:', data);

    // Now fetch the listens from the correct payload field
    if (data && data.payload && data.payload.listens) {
      displayListens(data.payload.listens);
      addButton.style.display = 'block';  // Show 'Add to Playlist' button once listens are displayed
    } else {
      throw new Error('No listens found or incorrect response structure.');
    }

  } catch (error) {
    // Display the error message on the page
    debugContainer.innerHTML += `<p>Error: ${error.message}</p>`;
    console.error('Error:', error);
  }
}

// Function to display listens in the UI, differentiating between mapped and unmapped listens
function displayListens(listens) {
  listensContainer.innerHTML = '';  // Clear previous listens

  if (listens.length === 0) {
    listensContainer.innerHTML = '<p>No listens found for this user.</p>';
    return;
  }

  // Create "Select All" checkbox
  selectAllCheckbox.type = 'checkbox';
  selectAllCheckbox.id = 'select-all';
  selectAllCheckbox.onclick = toggleSelectAll;
  const selectAllLabel = document.createElement('label');
  selectAllLabel.innerHTML = 'Select All';
  selectAllLabel.htmlFor = 'select-all';
  
  const selectAllContainer = document.createElement('div');
  selectAllContainer.classList.add('listen-item');
  selectAllContainer.appendChild(selectAllCheckbox);
  selectAllContainer.appendChild(selectAllLabel);
  listensContainer.appendChild(selectAllContainer);

  // Render each listen
  listens.forEach((listen, index) => {
    const trackMetadata = listen.track_metadata;
    const recordingMbid = trackMetadata.mbid_mapping ? trackMetadata.mbid_mapping.recording_mbid : null;
    const artistName = trackMetadata.artist_name;
    const trackName = trackMetadata.track_name;

    // Check if the listen is mapped or unmapped (no recording MBID)
    const isMapped = recordingMbid !== null;

    const listenItem = document.createElement('div');
    listenItem.classList.add('listen-item');
    
    if (isMapped) {
      listenItem.innerHTML = `
        <input type="checkbox" class="listen-checkbox" id="listen-${index}" value="${recordingMbid}">
        <label for="listen-${index}"><strong>${trackName}</strong> by ${artistName}</label>
      `;
    } else {
      listenItem.innerHTML = `
        <input type="checkbox" class="listen-checkbox" id="listen-${index}" disabled>
        <label for="listen-${index}" style="color: #999;"><strong>${trackName}</strong> by ${artistName} (Unmapped)</label>
      `;
    }

    listensContainer.appendChild(listenItem);
  });
}

// Function to toggle select/deselect all checkboxes
function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('.listen-checkbox');
  const isChecked = selectAllCheckbox.checked;
  checkboxes.forEach(checkbox => {
    if (!checkbox.disabled) {
      checkbox.checked = isChecked;
    }
  });
}

// Function to add selected listens to playlist
async function addToPlaylist() {
  const selectedListens = [];
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');

  checkboxes.forEach((checkbox) => {
    selectedListens.push(checkbox.value);  // Grab the recording MBID
  });

  if (selectedListens.length > 0) {
    console.log("Selected listens:", selectedListens);  // Log the selected listens for debugging
    await sendToPlaylist(selectedListens);
  } else {
    alert('No listens selected!');
  }
}

// Function to send selected listens to the playlist using the JSPF format
async function sendToPlaylist(selectedListens) {
  const JSPFPlaylistData = {
    playlist: {
      track: selectedListens.map(recordingMBID => {
        return { identifier: [`https://musicbrainz.org/recording/${recordingMBID}`] };
      })
    }
  };

  try {
    const response = await fetch(`https://api.listenbrainz.org/1/playlist/${playlistMbid}/item/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${listenBrainzToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSPFPlaylistData)
    });

    if (response.ok) {
      alert('Successfully added to playlist!');
    } else {
      const responseText = await response.text(); // Get the error text if available
      console.error("Response Error Text:", responseText);  // Log the error text
      throw new Error(`Failed to add to playlist: ${response.status} - ${responseText}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
    console.error('Error:', error);
  }
}
