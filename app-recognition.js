/**
 * Version 2: Successive Recognition Task (with Supabase Integration)
 */

async function startExperiment() {
  const jsPsych = initJsPsych({
    on_finish: async function () {
      // Gather data: we have recognition tasks, and some timeline tasks.
      // We will loop through the recognition tasks, and for those that are recognized,
      // we'll get the following timeline task data and combine them.
      const rawData = jsPsych.data.get().values();

      const combinedData = [];
      let currentRecData = null;

      for (const trial of rawData) {
        if (trial.trial_type === 'recognition-task') {
          if (currentRecData) {
            combinedData.push(currentRecData); // Push previous if there was no timeline data for it
          }
          currentRecData = {
            image_id: trial.image_id,
            recognized: trial.recognized,
            recognition_confidence: trial.recognition_confidence,
            relative_duration: trial.relative_duration,
            rt_recognition: trial.rt_recognition,
            rt_phase2: trial.rt_phase2
          };
          if (!trial.recognized) {
            combinedData.push(currentRecData);
            currentRecData = null;
          }
        } else if (trial.trial_type === 'timeline-task') {
          if (currentRecData && trial.timeline_data) {
            currentRecData.timeline_position_sec = trial.timeline_data.timeline_position_sec;
            currentRecData.estimated_duration_sec = trial.timeline_data.estimated_duration_sec;
            currentRecData.rt_timeline = trial.timeline_data.rt_timeline;
            combinedData.push(currentRecData);
            currentRecData = null;
          }
        }
      }
      if (currentRecData) {
        combinedData.push(currentRecData); // Catch any remaining
      }

      // 1. Generate unique participant ID
      const participantId = 'P-' + Math.random().toString(36).substr(2, 9).toUpperCase();

      // 2. Log data to Supabase (Flat Row format)
      document.body.innerHTML = '<div class="summary-container"><p>Saving results to database...</p></div>';

      const flatRows = combinedData.map(item => ({
        participant_id: participantId,
        task_type: 'combined',
        image_id: item.image_id,
        recognized: item.recognized,
        recognition_confidence: item.recognition_confidence || null,
        relative_duration: item.relative_duration || null,
        rt_recognition: item.rt_recognition || null,
        rt_phase2: item.rt_phase2 || null,
        timeline_position_sec: item.timeline_position_sec || null,
        estimated_duration_sec: item.estimated_duration_sec || null,
        rt_timeline: item.rt_timeline || null
      }));

      const { error } = await supabaseClient
        .from('results')
        .insert([
          {
            participant_id: participantId,
            task_type: 'combined',
            response_data: combinedData
          }
        ]);

      // Create CSV Download Logic
      const csvHeaders = ['participant_id', 'task_type', 'image_id', 'recognized', 'recognition_confidence', 'relative_duration', 'rt_recognition', 'rt_phase2', 'timeline_position_sec', 'estimated_duration_sec', 'rt_timeline'];
      const csvRows = [csvHeaders.join(',')];
      flatRows.forEach(row => {
        csvRows.push(csvHeaders.map(h => {
          let val = row[h];
          return (val === null || val === undefined) ? '' : val;
        }).join(','));
      });
      const csvString = csvRows.join('\n');

      window.downloadCSV = function () {
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', participantId + '_capture_data.csv');
        a.click();
      };

      // Automatically download the CSV
      window.downloadCSV();

      if (error) {
        console.error('Error saving data:', error);
        alert('Could not save data to database. Please check console.');
      }

      // 3. Show Completion Screen
      let summaryHtml = `
        <div class="summary-container">
          <h1>Tour Summary</h1>
          <p>Results saved successfully and downloaded to your computer.</p>
          <p style="margin-bottom: 40px; font-size: 1.1rem;">Participant ID: <strong>${participantId}</strong></p>
          <div style="display: flex; justify-content: center;">
            <a href="index.html" class="btn btn-secondary" style="text-decoration:none; padding: 14px 32px; border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-main);">Return to Menu</a>
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
  const mainTimeline = [];

  artworks.forEach((art, index) => {
    const isLast = (index === artworks.length - 1);

    const recognition_trial = {
      type: jsPsychRecognitionTask,
      image: art.image_url
    };

    const timeline_trial = {
      type: jsPsychTimelineTask,
      image: art.image_url,
      is_last_artwork: isLast
    };

    const if_node = {
      timeline: [timeline_trial],
      conditional_function: function () {
        const lastData = jsPsych.data.get().last(1).values()[0];
        if (lastData && lastData.recognized) {
          return true;
        } else {
          return false;
        }
      }
    };

    mainTimeline.push(recognition_trial, if_node);
  });

  // Start the experiment
  jsPsych.run(mainTimeline);
}

// Global invocation
startExperiment();
