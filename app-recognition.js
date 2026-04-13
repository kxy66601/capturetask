/**
 * Version 2: Successive Recognition Task (with Supabase Integration)
 */

async function startExperiment() {
  const jsPsych = initJsPsych({
    on_finish: async function() {
      const recognitionData = jsPsych.data.get()
        .filter({ trial_type: 'recognition-task' })
        .values();

      // 1. Generate unique participant ID
      const participantId = 'P-' + Math.random().toString(36).substr(2, 9).toUpperCase();

      // 2. Log data to Supabase
      document.body.innerHTML = '<div class="summary-container"><p>Saving results to database...</p></div>';

      const { error } = await supabaseClient
        .from('results')
        .insert([
          { 
            participant_id: participantId, 
            task_type: 'recognition', 
            response_data: recognitionData 
          }
        ]);

      if (error) {
        console.error('Error saving data:', error);
        alert('Could not save data to database. Please check console.');
      }

      // 3. Show Summary Table
      let summaryHtml = `
        <div class="summary-container">
          <h1>Tour Summary</h1>
          <p>Results saved successfully for Participant: <strong>${participantId}</strong></p>
          <div class="table-wrapper">
            <table class="summary-table">
              <thead>
                <tr>
                  <th>Artwork</th>
                  <th>Recognized?</th>
                  <th>Estimated Duration</th>
                </tr>
              </thead>
              <tbody>
      `;

      recognitionData.forEach((item, index) => {
        summaryHtml += `
          <tr>
            <td>
              <div class="art-preview">
                <img src="${item.image_id}">
                <span>Artwork ${index + 1}</span>
              </div>
            </td>
            <td>${item.recognized ? 'Yes' : 'No'}</td>
            <td>${item.relative_duration ? item.relative_duration : 'N/A'}</td>
          </tr>
        `;
      });

      summaryHtml += `
              </tbody>
            </table>
          </div>
          <div style="margin-top:20px;">
            <a href="index.html" class="btn btn-secondary" style="text-decoration:none;">Return to Menu</a>
          </div>
        </div>
      `;

      document.body.innerHTML = summaryHtml;
    }
  });

  // 4. Fetch Artworks from Supabase
  document.body.innerHTML = '<div class="summary-container"><p>Loading artworks from database...</p></div>';

  const { data: artworks, error } = await supabaseClient
    .from('artworks')
    .select('*')
    .order('id', { ascending: true });

  if (error || !artworks || artworks.length === 0) {
    console.error('Error fetching artworks:', error);
    document.body.innerHTML = `
      <div class="summary-container">
        <h1>Error</h1>
        <p>Could not load artworks from Supabase. Ensure your 'artworks' table exists and is public.</p>
        <a href="index.html" class="btn btn-secondary">Back to Menu</a>
      </div>
    `;
    return;
  }

  // Create timeline based on fetched artworks
  const timeline = artworks.map(art => {
    return {
      type: jsPsychRecognitionTask,
      image: art.image_url
    };
  });

  // Start the experiment
  jsPsych.run(timeline);
}

// Global invocation
startExperiment();
