var jsPsychTimelineTask = (function (jspsych) {
  'use strict';

  const info = {
    name: 'timeline-task',
    parameters: {
      images: {
        type: jspsych.ParameterType.IMAGE,
        array: true,
        default: [],
        description: 'Array of image paths to display in the photo bank.'
      },
      timeline_duration_minutes: {
        type: jspsych.ParameterType.INT,
        default: 45,
        description: 'Total length of the timeline in minutes.'
      },
      time_increment_seconds: {
        type: jspsych.ParameterType.INT,
        default: 5,
        description: 'Snapping interval in seconds.'
      }
    }
  };

  class TimelineTaskPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      // Logic variables
      this.placedItems = new Map(); // id -> { id, element, timeSec, durationSec }
      this.totalSecs = trial.timeline_duration_minutes * 60;
      this.activeItem = null; // item currently being placed or edited
      
      // Inject HTML
      let html = `
        <div class="timeline-task-container">
          <div class="task-header">
            <div>
              <h1>Tour Memory Retrieval</h1>
              <p>Drag each artwork to the time you saw it. Estimate how long you analyzed it.</p>
            </div>
            <button id="finish-btn" class="finish-btn" disabled>Finish Task</button>
          </div>
          
          <div class="work-area">
            <div class="photo-bank" id="photo-bank">
      `;
      
      trial.images.forEach((imgSrc, index) => {
        let imgId = `art-${index}`;
        html += `
          <div class="art-item" id="${imgId}" draggable="true" data-src="${imgSrc}">
            <img src="${imgSrc}" draggable="false">
          </div>
        `;
      });
      
      html += `
            </div>
            
            <div class="timeline-area">
              <div class="timeline-track-container" id="timeline-track-container">
                <div class="timeline-track"></div>
                <div class="timeline-ticks" id="timeline-ticks"></div>
                <div class="timeline-dropzone" id="timeline-dropzone"></div>
                <div id="hover-tooltip">00:00</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Duration Modal -->
        <div class="modal-overlay" id="duration-modal">
          <div class="modal-content">
            <div class="modal-artwork">
              <img id="modal-img-preview" src="" alt="Artwork Preview">
            </div>
            <div class="modal-form">
              <h2>Duration of observation</h2>
              <p>How long did you spend looking at this art piece during your tour?</p>
              
              <div class="duration-inputs">
                <div class="input-group">
                  <label for="input-min">Minutes</label>
                  <input type="number" id="input-min" min="0" max="45" value="0">
                </div>
                <div class="input-group">
                  <label for="input-sec">Seconds</label>
                  <input type="number" id="input-sec" min="0" max="59" value="0">
                </div>
              </div>
              
              <div class="modal-actions">
                <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button class="btn btn-primary" id="modal-save">Save Marker</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      display_element.innerHTML = html;

      // Setup DOM references
      this.photoBank = display_element.querySelector('#photo-bank');
      this.timelineContainer = display_element.querySelector('#timeline-track-container');
      this.dropzone = display_element.querySelector('#timeline-dropzone');
      this.tooltip = display_element.querySelector('#hover-tooltip');
      this.ticksContainer = display_element.querySelector('#timeline-ticks');
      this.finishBtn = display_element.querySelector('#finish-btn');
      
      this.modal = display_element.querySelector('#duration-modal');
      this.modalImg = display_element.querySelector('#modal-img-preview');
      this.inputMin = display_element.querySelector('#input-min');
      this.inputSec = display_element.querySelector('#input-sec');
      this.modalSave = display_element.querySelector('#modal-save');
      this.modalCancel = display_element.querySelector('#modal-cancel');

      this.numItemsRequired = trial.images.length;
      
      this.renderTicks(trial.timeline_duration_minutes);
      this.setupInteractionHandlers(trial.time_increment_seconds);
      
      this.finishBtn.addEventListener('click', () => {
        this.endTrial();
      });
    }

    renderTicks(minutes) {
      // Render tick marks every 5 minutes
      for (let m = 0; m <= minutes; m += 5) {
        let percent = (m / minutes) * 100;
        let tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.left = `${percent}%`;
        tick.innerHTML = `<span>${m}:00</span>`;
        this.ticksContainer.appendChild(tick);
      }
    }

    setupInteractionHandlers(incrementSecs) {
      // 1. Photo Bank Drag & Drop
      const artItems = this.photoBank.querySelectorAll('.art-item');
      artItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
          if (item.classList.contains('placed')) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('text/plain', item.id);
          e.dataTransfer.effectAllowed = 'copy';
        });
      });

      // 2. Timeline Dropping mechanics
      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'copy';
        
        // Show Tooltip with time
        let rawPercent = e.offsetX / this.dropzone.offsetWidth;
        if(rawPercent < 0) rawPercent = 0;
        if(rawPercent > 1) rawPercent = 1;
        
        let seconds = rawPercent * this.totalSecs;
        let snappedSecs = Math.round(seconds / incrementSecs) * incrementSecs;
        
        this.tooltip.style.opacity = '1';
        this.tooltip.style.left = `${(snappedSecs / this.totalSecs) * 100}%`;
        this.tooltip.innerText = this.formatTime(snappedSecs);
      });

      this.dropzone.addEventListener('dragleave', () => {
        this.tooltip.style.opacity = '0';
      });

      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.tooltip.style.opacity = '0';
        
        const itemId = e.dataTransfer.getData('text/plain');
        if (!itemId) return;
        
        const sourceElem = document.getElementById(itemId);
        if (!sourceElem || sourceElem.classList.contains('placed')) return;

        let rawPercent = e.offsetX / this.dropzone.offsetWidth;
        if(rawPercent < 0) rawPercent = 0; if(rawPercent > 1) rawPercent = 1;
        
        let seconds = rawPercent * this.totalSecs;
        let snappedSecs = Math.round(seconds / incrementSecs) * incrementSecs;

        this.openModalFor(itemId, sourceElem.dataset.src, snappedSecs, false);
      });

      // 3. Modal Handlers
      this.modalSave.addEventListener('click', () => {
        const min = parseInt(this.inputMin.value) || 0;
        const sec = parseInt(this.inputSec.value) || 0;
        const totalDurationSec = (min * 60) + sec;
        
        if (totalDurationSec === 0) {
          alert('Please enter a duration greater than 0.');
          return;
        }

        this.savePlacedItem(totalDurationSec);
        this.closeModal();
      });

      this.modalCancel.addEventListener('click', () => {
        this.closeModal();
      });
    }

    formatTime(totSeconds) {
      let m = Math.floor(totSeconds / 60);
      let s = Math.floor(totSeconds % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    openModalFor(itemId, imgSrc, timeSec, isEditing) {
      this.activeItem = { id: itemId, timeSec: timeSec, isEditing: isEditing };
      this.modalImg.src = imgSrc;
      
      if (isEditing && this.placedItems.has(itemId)) {
        let existing = this.placedItems.get(itemId);
        this.activeItem.timeSec = existing.timeSec; // Keep original time unless we allow drag edit
        this.inputMin.value = Math.floor(existing.durationSec / 60);
        this.inputSec.value = existing.durationSec % 60;
      } else {
        this.inputMin.value = 0;
        this.inputSec.value = 0;
      }
      
      this.modal.classList.add('active');
      this.inputMin.focus();
    }

    closeModal() {
      this.modal.classList.remove('active');
      this.activeItem = null;
    }

    savePlacedItem(durationSec) {
      const { id, timeSec, isEditing } = this.activeItem;
      const percent = (timeSec / this.totalSecs) * 100;
      const sourceElem = document.getElementById(id);
      
      if (!isEditing) {
        // Create marker
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        marker.style.left = `${percent}%`;
        
        const img = document.createElement('img');
        img.src = sourceElem.dataset.src;
        img.draggable = false;
        marker.appendChild(img);
        
        marker.addEventListener('click', () => {
          this.openModalFor(id, sourceElem.dataset.src, timeSec, true);
        });

        this.timelineContainer.appendChild(marker);
        sourceElem.classList.add('placed');
        
        this.placedItems.set(id, {
          id: id,
          markerElement: marker,
          timeSec: timeSec,
          durationSec: durationSec
        });
      } else {
        // Update existing
        let existing = this.placedItems.get(id);
        existing.durationSec = durationSec;
      }

      this.checkCompletion();
    }

    checkCompletion() {
      if (this.placedItems.size === this.numItemsRequired) {
        this.finishBtn.disabled = false;
      }
    }

    endTrial() {
      // Gather data
      let responseData = [];
      this.placedItems.forEach((val) => {
        responseData.push({
          image_id: val.id,
          timeline_position_sec: val.timeSec,
          estimated_duration_sec: val.durationSec
        });
      });

      // Clear DOM
      this.jsPsych.getDisplayElement().innerHTML = '';

      // Return data
      this.jsPsych.finishTrial({
        retrieval_data: responseData
      });
    }
  }

  TimelineTaskPlugin.info = info;

  return TimelineTaskPlugin;
})(jsPsychModule);
