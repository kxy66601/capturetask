const jsPsych = initJsPsych({
  on_finish: function() {
    const trialData = jsPsych.data.get().last(1).values()[0].retrieval_data;
    
    // Sort chronologically by when they placed it on the timeline
    trialData.sort((a,b) => a.timeline_position_sec - b.timeline_position_sec);

    const formatTime = (totalSecs) => {
      let m = Math.floor(totalSecs / 60);
      let s = totalSecs % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    let summaryHtml = `
      <div class="summary-container">
        <h1>Tour Summary</h1>
        <p>Here is a review of your estimated tour timeline.</p>
        <div class="table-wrapper">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Artwork</th>
                <th>Tour Timestamp</th>
                <th>Observation Duration</th>
              </tr>
            </thead>
            <tbody>
    `;

    trialData.forEach(item => {
      // In production you might look up the real image URL from the ID, here we use our sample.
      summaryHtml += `
        <tr>
          <td>
            <div class="art-preview">
              <img src="assets/sample-art.png">
              <span>${item.image_id}</span>
            </div>
          </td>
          <td>${formatTime(item.timeline_position_sec)}</td>
          <td>${formatTime(item.estimated_duration_sec)}</td>
        </tr>
      `;
    });

    summaryHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.innerHTML = summaryHtml;
  }
});

// Generate 5 image paths for testing purposes. 
// For demo purposes, we will use our generated abstract art 5 times.
const artworks = [];
for (let i = 1; i <= 5; i++) {
  // We use the same demo image but if there were multiple, we'd iterate filenames.
  // We can pass the demo image file we saved.
  artworks.push('assets/sample-art.png');
}

// Define the timeline task trial
const timelineTrial = {
  type: jsPsychTimelineTask,
  images: artworks,
  timeline_duration_minutes: 45,
  time_increment_seconds: 5
};

// Start the experiment
jsPsych.run([timelineTrial]);
