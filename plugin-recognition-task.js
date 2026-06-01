var jsPsychRecognitionTask = (function (jspsych) {
  'use strict';

  const info = {
    name: 'recognition-task',
    parameters: {
      image: {
        type: jspsych.ParameterType.IMAGE,
        default: undefined,
        description: 'The image to be displayed.'
      },
      image_filter: {
        type: jspsych.ParameterType.STRING,
        default: 'none',
        description: 'CSS filter to apply to the image.'
      }
    }
  };

  class RecognitionTaskPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      this.display_element = display_element;
      this.trial = trial;

      // Inject initial HTML
      let html = `
        <div class="recognition-task-container">
          <div class="artwork-display">
            <img src="${trial.image}" id="recognition-image" draggable="false" style="filter: ${trial.image_filter};">
          </div>
          
          <div class="interaction-area" id="interaction-area">
            <div class="question-container" id="phase1-container">
              <h2>Was this artwork part of the exhibition?</h2>
              <div class="button-group">
                <button class="btn btn-choice" data-type="no" data-choice="Definitely no">Definitely no</button>
                <button class="btn btn-choice" data-type="no" data-choice="Maybe no">Maybe no</button>
                <button class="btn btn-choice" data-type="yes" data-choice="Maybe yes">Maybe yes</button>
                <button class="btn btn-choice" data-type="yes" data-choice="Definitely yes">Definitely yes</button>
              </div>
            </div>

            <div class="question-container hidden" id="phase2-container">
              <h2 style="font-size: 16px;">How much time did you spend looking at this artwork relative to the average amount of time spent on each artwork during the tour?</h2>
              <div class="button-group duration-group">
                <button class="btn btn-duration" data-duration="Much less">Much less</button>
                <button class="btn btn-duration" data-duration="Little less">Little less</button>
                <button class="btn btn-duration" data-duration="About the same">About the same</button>
                <button class="btn btn-duration" data-duration="Little more">Little more</button>
                <button class="btn btn-duration" data-duration="Much more">Much more</button>
              </div>
            </div>
          </div>
        </div>
      `;

      display_element.innerHTML = html;

      // Setup DOM references
      this.choiceBtns = display_element.querySelectorAll('.btn-choice');
      this.phase1 = display_element.querySelector('#phase1-container');
      this.phase2 = display_element.querySelector('#phase2-container');
      this.durationBtns = display_element.querySelectorAll('.btn-duration');

      // Bind events
      this.startTime = performance.now();
      
      this.choiceBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.rt_recognition = Math.round(performance.now() - this.startTime);
          this.recognition_confidence = e.target.getAttribute('data-choice');
          const isYes = this.recognition_confidence.toLowerCase().includes('yes');
          if (isYes) {
            this.showPhase2();
          } else {
            this.endTrial(false, this.recognition_confidence, null, this.rt_recognition, null);
          }
        });
      });

      this.durationBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const dt = Math.round(performance.now() - this.phase2StartTime);
          const durationValue = e.target.getAttribute('data-duration');
          this.endTrial(true, this.recognition_confidence, durationValue, this.rt_recognition, dt);
        });
      });
    }

    showPhase2() {
      // Animate transition
      this.phase1.classList.add('fade-out');
      
      setTimeout(() => {
        this.phase1.style.display = 'none';
        this.phase2.classList.remove('hidden');
        // Small delay to allow display:block to apply before adding fade-in
        setTimeout(() => {
          this.phase2.classList.add('fade-in');
          this.phase2StartTime = performance.now();
        }, 50);
      }, 300); // 300ms matches CSS transition duration
    }

    endTrial(recognized, confidence, duration, rt_recognition, rt_phase2) {
      // Gather data
      const responseData = {
        stimulus: this.trial.image,
        response: confidence,
        rt: Math.round(performance.now() - this.startTime),
        image_id: this.trial.image,
        recognized: recognized,
        recognition_confidence: confidence,
        relative_duration: duration,
        rt_recognition: rt_recognition,
        rt_phase2: rt_phase2
      };

      // Clear DOM
      this.display_element.innerHTML = '';

      // Return data
      this.jsPsych.finishTrial(responseData);
    }
  }

  RecognitionTaskPlugin.info = info;

  return RecognitionTaskPlugin;
})(jsPsychModule);
