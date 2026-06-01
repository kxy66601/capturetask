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
      artworks.forEach((art, index) => {
        // Find recognition and timeline trials for this artwork
        const artTrials = rawData.filter(t => t.image_id === art.image_url);
        const confTrial = artTrials.find(t => t.trial_type === 'recognition-task' && t.recognition_confidence !== null);
        const durTrial = artTrials.find(t => t.trial_type === 'recognition-task' && t.relative_duration !== null);
        const timeTrial = artTrials.find(t => t.trial_type === 'timeline-task');

        const recognized = confTrial ? confTrial.recognized : false;

        combinedData.push({
          artwork_index: index,
          image_id: art.image_url,
          recognized: recognized,
          recognition_confidence: confTrial ? confTrial.recognition_confidence : null,
          relative_duration: durTrial ? durTrial.relative_duration : null,
          rt_recognition: confTrial ? confTrial.rt_recognition : null,
          rt_phase2: durTrial ? durTrial.rt_recognition : null, // rt_recognition contains the RT of the duration trial
          timeline_position_sec: timeTrial ? timeTrial.timeline_position_sec : null,
          estimated_duration_sec: timeTrial ? timeTrial.estimated_duration_sec : null,
          rt_timeline: timeTrial ? timeTrial.rt_recognition : null // rt_recognition contains the RT of the timeline trial
        });
      });

      // 1. Extract participant info from initial trials
      let participantId = 'P-' + Math.random().toString(36).substr(2, 9).toUpperCase(); // fallback
      let sessionDate = new Date().toISOString().split('T')[0]; // fallback
      let raName = 'N/A'; // fallback

      for (const trial of rawData) {
        if (trial.participant_id !== undefined && trial.image_id === undefined) {
          participantId = trial.participant_id;
        }
        if (trial.session_date !== undefined) {
          sessionDate = trial.session_date;
        }
        if (trial.ra_name !== undefined) {
          raName = trial.ra_name;
        }
      }

      // Match cued recall responses
      for (const item of combinedData) {
        const recallTrial = rawData.find(trial => 
          trial.trial_type === 'cued-recall-task' && 
          trial.artwork_index === item.artwork_index
        );
        item.cued_recall_response = recallTrial ? recallTrial.cued_recall_response : '';
      }

      // 2. Log data (Flat Row format)
      document.body.innerHTML = '<div class="summary-container"><p>Saving results...</p></div>';

      // Add metadata to every single trial so they are on every row of the CSV!
      jsPsych.data.addProperties({
        participant_id: participantId,
        session_date: sessionDate,
        ra_name: raName
      });

      // Create CSV Download Logic
      window.downloadCSV = function () {
        jsPsych.data.get().localSave('csv', participantId + '_capture_data.csv');
      };

      // Automatically download the CSV
      window.downloadCSV();

      // 3. Show Completion Screen
      let summaryHtml = `
        <div class="summary-container">
          <h1>Tour Summary</h1>
          <p>Results saved successfully and downloaded to your computer.</p>
          <p style="margin-top: 20px; margin-bottom: 5px; font-size: 1.1rem;">Participant ID: <strong>${participantId}</strong></p>
          <p style="margin-bottom: 5px; font-size: 1.1rem;">Date: <strong>${sessionDate}</strong></p>
          <p style="margin-bottom: 40px; font-size: 1.1rem;">RA Name: <strong>${raName}</strong></p>
          <div style="display: flex; justify-content: center;">
            <a href="index.html" class="btn btn-secondary" style="text-decoration:none; padding: 14px 32px; border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-main);">Return to Menu</a>
          </div>
        </div>
      `;

      document.body.innerHTML = summaryHtml;
    }
  });

  // Define initial data collection plugins
  class ParticipantIdPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {
      const startTime = performance.now();
      display_element.innerHTML = `
        <div class="recognition-task-container">
          <div class="question-container" style="max-width: 500px;">
            <h2>Enter Participant ID</h2>
            <input type="text" id="input-field" class="btn" style="background:#ffffff; border: 1px solid var(--border-color); color:var(--text-main); font-size:1.1rem; padding:10px; width:100%; text-align:center; box-sizing:border-box; margin-bottom:20px; box-shadow: none; cursor: text; font-family: var(--font-main);" placeholder="e.g. P001" required>
            <button id="next-btn" class="btn" style="min-width:120px;">Next</button>
          </div>
        </div>
      `;
      const nextBtn = display_element.querySelector('#next-btn');
      const input = display_element.querySelector('#input-field');
      input.focus();
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim() !== '') {
          nextBtn.click();
        }
      });
      nextBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val === '') {
          alert('Please enter Participant ID');
          return;
        }
        display_element.innerHTML = '';
        this.jsPsych.finishTrial({
          participant_id: val,
          stimulus: "Enter Participant ID",
          response: val,
          rt: Math.round(performance.now() - startTime)
        });
      });
    }
  }
  ParticipantIdPlugin.info = { name: 'participant-id-input', parameters: {} };

  class DatePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {
      const startTime = performance.now();
      const today = new Date().toISOString().split('T')[0];
      display_element.innerHTML = `
        <div class="recognition-task-container">
          <div class="question-container" style="max-width: 500px;">
            <h2>Select Date</h2>
            <input type="date" id="input-field" class="btn" value="${today}" style="background:#ffffff; border: 1px solid var(--border-color); color:var(--text-main); font-size:1.1rem; padding:10px; width:100%; text-align:center; box-sizing:border-box; margin-bottom:20px; box-shadow: none; cursor: text; font-family: var(--font-main);" required>
            <button id="next-btn" class="btn" style="min-width:120px;">Next</button>
          </div>
        </div>
      `;
      const nextBtn = display_element.querySelector('#next-btn');
      const input = display_element.querySelector('#input-field');
      input.focus();
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim() !== '') {
          nextBtn.click();
        }
      });
      nextBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val === '') {
          alert('Please select date');
          return;
        }
        display_element.innerHTML = '';
        this.jsPsych.finishTrial({
          session_date: val,
          stimulus: "Select Date",
          response: val,
          rt: Math.round(performance.now() - startTime)
        });
      });
    }
  }
  DatePlugin.info = { name: 'session-date-input', parameters: {} };

  class RaNamePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {
      const startTime = performance.now();
      display_element.innerHTML = `
        <div class="recognition-task-container">
          <div class="question-container" style="max-width: 500px;">
            <h2>Enter RA Name</h2>
            <input type="text" id="input-field" class="btn" style="background:#ffffff; border: 1px solid var(--border-color); color:var(--text-main); font-size:1.1rem; padding:10px; width:100%; text-align:center; box-sizing:border-box; margin-bottom:20px; box-shadow: none; cursor: text; font-family: var(--font-main);" placeholder="e.g. Jane Doe" required>
            <button id="next-btn" class="btn" style="min-width:120px;">Next</button>
          </div>
        </div>
      `;
      const nextBtn = display_element.querySelector('#next-btn');
      const input = display_element.querySelector('#input-field');
      input.focus();
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim() !== '') {
          nextBtn.click();
        }
      });
      nextBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val === '') {
          alert('Please enter RA Name');
          return;
        }
        display_element.innerHTML = '';
        this.jsPsych.finishTrial({
          ra_name: val,
          stimulus: "Enter RA Name",
          response: val,
          rt: Math.round(performance.now() - startTime)
        });
      });
    }
  }
  RaNamePlugin.info = { name: 'ra-name-input', parameters: {} };

  class CompletionInstructionPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {
      const startTime = performance.now();
      display_element.innerHTML = `
        <div class="recognition-task-container">
          <div class="question-container" style="max-width: 600px;">
            <h2 style="margin-bottom: 30px; font-weight: normal; line-height: 1.6;">You have now completed this task. Please press the button to move onto the next task.</h2>
            <button id="next-btn" class="btn" style="min-width: 140px; font-weight: 600;">Next Task</button>
          </div>
        </div>
      `;
      const nextBtn = display_element.querySelector('#next-btn');
      nextBtn.addEventListener('click', () => {
        display_element.innerHTML = '';
        this.jsPsych.finishTrial({
          stimulus: "You have now completed this task. Please press the button to move onto the next task.",
          response: "Next Task",
          rt: Math.round(performance.now() - startTime)
        });
      });
    }
  }
  CompletionInstructionPlugin.info = { name: 'completion-instruction', parameters: {} };

  class CuedRecallPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {
      const startTime = performance.now();
      display_element.innerHTML = `
        <div class="recognition-task-container">
          <div class="artwork-display" style="max-height: 45vh; max-width: 700px; margin-bottom: 20px;">
            <img src="${trial.image}" id="recognition-image" draggable="false" style="filter: ${trial.image_filter}; max-height: 45vh;">
          </div>
          <div class="interaction-area">
            <div class="question-container" style="max-width: 700px; text-align: left;">
              <h2 style="font-size: 1.1rem; line-height: 1.4; margin-bottom: 20px;">What do you remember about this specific artwork?</h2>
              <textarea id="recall-input" class="btn" style="background:#ffffff; border: 1px solid var(--border-color); color:var(--text-main); font-size:1rem; padding:12px; width:100%; height:120px; box-sizing:border-box; margin-bottom:20px; box-shadow: none; cursor: text; resize: none; text-align: left; font-family: var(--font-main);" placeholder="Type your response here..." required></textarea>
              <div style="display: flex; justify-content: center;">
                <button id="next-btn" class="btn" style="min-width:140px; font-weight: 600;">Submit</button>
              </div>
            </div>
          </div>
        </div>
      `;
      const nextBtn = display_element.querySelector('#next-btn');
      const input = display_element.querySelector('#recall-input');
      input.focus();
      
      nextBtn.addEventListener('click', () => {
        const response = input.value.trim();
        if (response === '') {
          alert('Please write what you remember about this artwork.');
          input.focus();
          return;
        }
        display_element.innerHTML = '';
        this.jsPsych.finishTrial({
          stimulus: trial.image,
          response: response,
          rt: Math.round(performance.now() - startTime),
          image_id: trial.image,
          artwork_index: trial.artwork_index,
          cued_recall_response: response
        });
      });
    }
  }
  CuedRecallPlugin.info = { name: 'cued-recall-task', parameters: {} };

  const participant_id_trial = {
    type: ParticipantIdPlugin
  };

  const date_trial = {
    type: DatePlugin
  };

  const ra_name_trial = {
    type: RaNamePlugin
  };

  const completion_instruction_trial = {
    type: CompletionInstructionPlugin
  };

  // 4. Local Artworks (Replacing Supabase)
  const artworks = [
    { id: 1, image_url: 'assets/sample-art.png', title: 'Local Art 1', filter: 'hue-rotate(0deg)' },
    { id: 2, image_url: 'assets/sample-art.png', title: 'Local Art 2', filter: 'hue-rotate(72deg)' },
    { id: 3, image_url: 'assets/sample-art.png', title: 'Local Art 3', filter: 'hue-rotate(144deg)' },
    { id: 4, image_url: 'assets/sample-art.png', title: 'Local Art 4', filter: 'hue-rotate(216deg)' },
    { id: 5, image_url: 'assets/sample-art.png', title: 'Local Art 5', filter: 'hue-rotate(288deg)' }
  ];

  // Create timeline based on fetched artworks
  const mainTimeline = [];

  // Add the initial pages before moving on to the task
  mainTimeline.push(participant_id_trial, date_trial, ra_name_trial);

  artworks.forEach((art, index) => {
    const isLast = (index === artworks.length - 1);

    const recognition_confidence_trial = {
      type: jsPsychRecognitionTask,
      image: art.image_url,
      image_filter: art.filter,
      phase: 'confidence'
    };

    const relative_duration_trial = {
      type: jsPsychRecognitionTask,
      image: art.image_url,
      image_filter: art.filter,
      phase: 'duration'
    };

    const timeline_trial = {
      type: jsPsychTimelineTask,
      image: art.image_url,
      image_filter: art.filter,
      is_last_artwork: isLast
    };

    const if_node = {
      timeline: [relative_duration_trial, timeline_trial],
      conditional_function: function () {
        const lastData = jsPsych.data.get().last(1).values()[0];
        if (lastData && lastData.recognized) {
          return true;
        } else {
          return false;
        }
      }
    };

    mainTimeline.push(recognition_confidence_trial, if_node);
  });

  // Now, add the completion instruction page!
  mainTimeline.push(completion_instruction_trial);

  // Now, add the conditional cued recall trials for each artwork!
  artworks.forEach((art, index) => {
    const recall_trial = {
      type: CuedRecallPlugin,
      image: art.image_url,
      image_filter: art.filter,
      artwork_index: index
    };

    const conditional_recall_node = {
      timeline: [recall_trial],
      conditional_function: function() {
        // Find if this specific artwork was recognized by filtering by image_id
        const artTrials = jsPsych.data.get().filter({ image_id: art.image_url, trial_type: 'recognition-task' }).values();
        const recognizedTrial = artTrials.find(t => t.recognized === true);
        return !!recognizedTrial;
      }
    };

    mainTimeline.push(conditional_recall_node);
  });

  // Start the experiment
  jsPsych.run(mainTimeline);
}

// Global invocation
startExperiment();
