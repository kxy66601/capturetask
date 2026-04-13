/**
 * Version 1: Timeline Retrieval Task (with Supabase Integration)
 */

async function startExperiment() {
  const jsPsych = initJsPsych({
    on_finish: async function() {
      const trialData = jsPsych.data.get().last(1).values()[0].retrieval_data;
      
      // 1. Generate unique participant ID
      const participantId = 'P-' + Math.random().toString(36).substr(2, 9).toUpperCase();

      // 2. Log data to Supabase
      document.body.innerHTML = '<div class="summary-container"><p>Saving results to database...</p></div>';
      
      const { error } = await supabaseClient
        .from('results')
        .insert([
          { 
            participant_id: participantId, 
            task_type: 'timeline', 
            response_data: trialData 
          }
        ]);

      if (error) {
        console.error('Error saving data:', error);
        alert('Could not save data to database. Please check console.');
      }

      // 3. Show Summary Table
      trialData.sort((a,b) => a.timeline_position_sec - b.timeline_position_sec);

      const formatTime = (totalSecs) => {
        let m = Math.floor(totalSecs / 60);
        let s = totalSecs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
      };

      let summaryHtml = `
        <div class="summary-container">
          <h1>Tour Summary</h1>
          <p>Results saved successfully for Participant: <strong>${participantId}</strong></p>
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
        summaryHtml += `
          <tr>
            <td>
              <div class="art-preview">
                <img src="${item.image_url || 'assets/sample-art.png'}">
                <span>${item.image_title || item.image_id}</span>
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

  // Map Supabase data to the format expected by the plugin
  // We pass the URL as the IMAGE parameter
  const imagePaths = artworks.map(art => art.image_url);

  // Define the timeline task trial
  const timelineTrial = {
    type: jsPsychTimelineTask,
    images: imagePaths,
    timeline_duration_minutes: 45,
    time_increment_seconds: 5,
    on_finish: (data) => {
        // We can augment trial data with more info if needed
        data.retrieval_data.forEach(item => {
            const index = parseInt(item.image_id.split('-')[1]);
            item.image_url = artworks[index].image_url;
            item.image_title = artworks[index].title;
        });
    }
  };

  // Start the experiment
  jsPsych.run([timelineTrial]);
}

// Global invocation
startExperiment();
