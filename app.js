const listensContainer = document.getElementById('listens-container');
const addButton = document.getElementById('add-button');
const selectAllCheckbox = document.createElement('input');

// Variables to hold user input values
let listenBrainzToken = '';
let playlistMbid = '';
let numRecentListens = 10;  // Default value to fetch 10 recent listens
let username = '';

// Check for saved credentials when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Load saved credentials from localStorage
  const savedUsername = localStorage.getItem('listenbrainz_username');
  const savedToken = localStorage.getItem('listenbrainz_token');
  
  if (savedUsername) {
    document.getElementById('username').value = savedUsername;
    username = savedUsername;
    document.getElementById('username').classList.add('valid');
  }
  
  if (savedToken) {
    document.getElementById('api-token').value = savedToken;
    listenBrainzToken = savedToken;
    document.getElementById('api-token').classList.add('valid');
  }
  
  // If we have both username and token, enable the fetch playlists button
  if (savedUsername && savedToken) {
    document.getElementById('fetch-playlists-button').classList.add('enabled');
    showNotification('Credentials loaded from your browser storage', 'info');
  }
});

// Function to fetch user's playlists from ListenBrainz
async function fetchPlaylists() {
  username = document.getElementById('username').value;
  listenBrainzToken = document.getElementById('api-token').value;
  
  if (!username || !listenBrainzToken) {
    showNotification('Please enter your Username and API Token first.', 'error');
    return;
  }
  
  // Save credentials to localStorage
  localStorage.setItem('listenbrainz_username', username);
  localStorage.setItem('listenbrainz_token', listenBrainzToken);
  
  showLoading('Fetching your playlists...');
  
  try {
    const response = await fetch(`https://api.listenbrainz.org/1/user/${username}/playlists`, {
      headers: {
        'Authorization': `Token ${listenBrainzToken}`
      }
    });
    
    hideLoading();
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlists: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.playlists && data.playlists.length > 0) {
      displayPlaylists(data.playlists);
      showNotification(`Found ${data.playlists.length} playlists!`, 'success');
    } else {
      showNotification('No playlists found for this user.', 'warning');
    }
    
  } catch (error) {
    hideLoading();
    showNotification(`Error: ${error.message}`, 'error');
    console.error('Error:', error);
  }
}

// Function to display playlists in the dropdown
function displayPlaylists(playlists) {
  const playlistSelect = document.getElementById('playlist-select');
  
  // Clear previous options except the first one
  while (playlistSelect.options.length > 1) {
    playlistSelect.remove(1);
  }
  
  // Add each playlist to the dropdown
  playlists.forEach(playlistObj => {
    // Extract the playlist MBID from the identifier URL
    // Format: "https://listenbrainz.org/playlist/191af5d4-4d57-4ed1-ac03-e31badff7cd2"
    const identifier = playlistObj.playlist.identifier;
    const mbid = identifier.split('/').pop();
    
    const option = document.createElement('option');
    option.value = mbid;
    option.text = playlistObj.playlist.title;
    playlistSelect.appendChild(option);
  });
  
  // Show the dropdown and hide the button
  playlistSelect.style.display = 'block';
  document.getElementById('playlist-select-container').classList.add('active');
  document.getElementById('fetch-playlists-button').style.display = 'none';
  
  // Add event listener to update the playlist MBID input when selection changes
  playlistSelect.addEventListener('change', function() {
    document.getElementById('playlist-mbid').value = this.value;
    document.getElementById('playlist-mbid').dispatchEvent(new Event('input'));
  });
}

// Function to fetch listens from ListenBrainz
async function fetchListens() {
  // Get values from input fields
  username = document.getElementById('username').value;
  listenBrainzToken = document.getElementById('api-token').value;
  playlistMbid = document.getElementById('playlist-mbid').value;
  numRecentListens = document.getElementById('num-listens').value;

  // Save credentials to localStorage
  localStorage.setItem('listenbrainz_username', username);
  localStorage.setItem('listenbrainz_token', listenBrainzToken);

  if (!username || !listenBrainzToken) {
    showNotification('Please enter Username and API Token.', 'error');
    return;
  }

  showLoading('Fetching your recent listens...');

  try {
    const response = await fetch(`https://api.listenbrainz.org/1/user/${username}/listens?count=${numRecentListens}`, {
      headers: {
        'Authorization': `Token ${listenBrainzToken}`
      }
    });

    hideLoading();

    // Check if response status is not OK (200)
    if (!response.ok) {
      throw new Error(`API request failed with status code: ${response.status}`);
    }

    // Parse the response as JSON
    const data = await response.json();

    // Now fetch the listens from the correct payload field
    if (data && data.payload && data.payload.listens) {
      displayListens(data.payload.listens);
      showNotification(`Found ${data.payload.listens.length} recent listens.`, 'success');
      addButton.style.display = 'block';  // Show 'Add to Playlist' button once listens are displayed
      
      // Scroll to the listens container
      listensContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
      throw new Error('No listens found or incorrect response structure.');
    }

  } catch (error) {
    hideLoading();
    showNotification(`Error: ${error.message}`, 'error');
    console.error('Error:', error);
  }
}

// Format a Unix timestamp to a readable date and time
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Format duration in milliseconds to minutes:seconds
function formatDuration(durationMs) {
  if (!durationMs) return '';
  
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Function to display listens in the UI with a more modern look
function displayListens(listens) {
  listensContainer.innerHTML = '';  // Clear previous listens

  if (listens.length === 0) {
    listensContainer.innerHTML = '<div class="info-message">No listens found for this user.</div>';
    return;
  }

  // Create header with select all option
  const listHeader = document.createElement('div');
  listHeader.classList.add('listen-header');
  
  // Create "Select All" checkbox
  selectAllCheckbox.type = 'checkbox';
  selectAllCheckbox.id = 'select-all';
  selectAllCheckbox.onclick = toggleSelectAll;
  
  const selectAllLabel = document.createElement('label');
  selectAllLabel.innerHTML = 'Select All';
  selectAllLabel.htmlFor = 'select-all';
  
  listHeader.appendChild(selectAllCheckbox);
  listHeader.appendChild(selectAllLabel);
  
  listensContainer.appendChild(listHeader);

  // Create a container for the listens
  const listensListContainer = document.createElement('div');
  listensListContainer.classList.add('listens-list');
  listensContainer.appendChild(listensListContainer);

  // Render each listen
  listens.forEach((listen, index) => {
    const trackMetadata = listen.track_metadata;
    const recordingMbid = trackMetadata.mbid_mapping ? trackMetadata.mbid_mapping.recording_mbid : null;
    const artistName = trackMetadata.artist_name;
    const trackName = trackMetadata.track_name;
    const releaseName = trackMetadata.release_name || '';
    const timestamp = listen.listened_at;
    const formattedTime = formatTimestamp(timestamp);
    
    // Get duration if available
    let duration = '';
    if (trackMetadata.additional_info && trackMetadata.additional_info.duration_ms) {
      duration = formatDuration(trackMetadata.additional_info.duration_ms);
    }
    
    // Get submission source if available
    let submissionSource = '';
    if (trackMetadata.additional_info) {
      if (trackMetadata.additional_info.music_service) {
        submissionSource = trackMetadata.additional_info.music_service.replace('.com', '');
      } else if (trackMetadata.additional_info.submission_client) {
        submissionSource = trackMetadata.additional_info.submission_client;
      }
    }
    
    const isMapped = recordingMbid !== null;

    const listenItem = document.createElement('div');
    listenItem.classList.add('listen-item');
    if (!isMapped) listenItem.classList.add('unmapped');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'listen-checkbox';
    checkbox.id = `listen-${index}`;
    checkbox.disabled = !isMapped;
    if (isMapped) checkbox.value = recordingMbid;
    
    const label = document.createElement('label');
    label.htmlFor = `listen-${index}`;
    
    // Create a cleaner, more modern structure
    label.innerHTML = `
      <div class="track-info">
        <div class="track-name">${trackName}</div>
        <div class="artist-name">${artistName}</div>
        ${releaseName ? `<div class="release-name">${releaseName}</div>` : ''}
        <div class="listen-details">
          <span class="listen-timestamp">${formattedTime}</span>
          ${duration ? `<span class="listen-duration">${duration}</span>` : ''}
          ${submissionSource ? `<span class="listen-source">${submissionSource}</span>` : ''}
          ${!isMapped ? '<span class="unmapped-badge">Unmapped</span>' : ''}
        </div>
      </div>
    `;
    
    listenItem.appendChild(checkbox);
    listenItem.appendChild(label);
    
    listensListContainer.appendChild(listenItem);
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
  // Get the playlist MBID from the dropdown if selected, otherwise use the manual input
  const playlistSelect = document.getElementById('playlist-select');
  if (playlistSelect.style.display !== 'none' && playlistSelect.value) {
    playlistMbid = playlistSelect.value;
  } else {
    playlistMbid = document.getElementById('playlist-mbid').value;
  }
  
  if (!playlistMbid) {
    showNotification('Please select a playlist or enter a playlist MBID.', 'error');
    return;
  }
  
  const selectedListens = [];
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');

  checkboxes.forEach((checkbox) => {
    if (checkbox.id !== 'select-all') { // Skip the "select all" checkbox
      selectedListens.push(checkbox.value);  // Grab the recording MBID
    }
  });

  if (selectedListens.length === 0) {
    showNotification('No listens selected!', 'error');
    return;
  }

  showLoading(`Adding ${selectedListens.length} tracks to playlist...`);
  
  try {
    await sendToPlaylist(selectedListens);
  } catch (error) {
    hideLoading();
    showNotification(`Error: ${error.message}`, 'error');
    console.error('Error:', error);
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

    hideLoading();
    
    if (response.ok) {
      showNotification(`Successfully added ${selectedListens.length} tracks to playlist!`, 'success');
      
      // Uncheck all checkboxes after successful addition
      selectAllCheckbox.checked = false;
      document.querySelectorAll('.listen-checkbox').forEach(checkbox => {
        checkbox.checked = false;
      });
    } else {
      const responseText = await response.text(); // Get the error text if available
      console.error("Response Error Text:", responseText);  // Log the error text
      throw new Error(`Failed to add to playlist: ${response.status} - ${responseText}`);
    }
  } catch (error) {
    throw error; // Pass error to caller for handling
  }
}

// Show loading indicator
function showLoading(message) {
  // Create loading overlay if it doesn't exist
  let loadingOverlay = document.getElementById('loading-overlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-message"></div>
    `;
    document.body.appendChild(loadingOverlay);
  }
  
  // Update message and show
  document.querySelector('.loading-message').textContent = message || 'Loading...';
  loadingOverlay.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

// Show notification
function showNotification(message, type, duration = 5000) {
  // Create notification area if it doesn't exist
  let notificationArea = document.getElementById('notification-area');
  if (!notificationArea) {
    notificationArea = document.createElement('div');
    notificationArea.id = 'notification-area';
    document.body.appendChild(notificationArea);
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">${message}</div>
    <button class="notification-close">&times;</button>
  `;
  
  // Add close button functionality
  notification.querySelector('.notification-close').addEventListener('click', function() {
    notification.classList.add('hiding');
    setTimeout(() => {
      notification.remove();
    }, 300);
  });
  
  // Add to notification area
  notificationArea.appendChild(notification);
  
  // Auto remove after specified duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('hiding');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, duration);
}

// Enable form validation and visual feedback
document.addEventListener('DOMContentLoaded', function() {
  // Add input event listeners to show when fields are valid
  const requiredInputs = document.querySelectorAll('input[required]');
  requiredInputs.forEach(input => {
    input.addEventListener('input', function() {
      if (this.value.trim()) {
        this.classList.add('valid');
        this.classList.remove('invalid');
      } else {
        this.classList.remove('valid');
        this.classList.add('invalid');
      }
    });
  });
  
  // Handle enter key in inputs to progress through the form
  const inputFields = document.querySelectorAll('input');
  inputFields.forEach(input => {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const form = this.closest('form');
        const inputs = Array.from(form.querySelectorAll('input, button'));
        const index = inputs.indexOf(this);
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        } else {
          // If it's the last input, trigger the fetch listens button
          document.getElementById('fetch-listens-button').click();
        }
      }
    });
  });
  
  // Validate playlist selection
  const playlistMbidInput = document.getElementById('playlist-mbid');
  if (playlistMbidInput) {
    playlistMbidInput.addEventListener('input', function() {
      if (this.value.trim()) {
        document.getElementById('manual-playlist-container').classList.add('has-playlist');
      } else {
        document.getElementById('manual-playlist-container').classList.remove('has-playlist');
      }
    });
  }
});
