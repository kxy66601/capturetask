# CAPTURE Experiment Task

CAPTURE is a cognitive psychology/neuroscience behavioral experiment platform designed to evaluate and reconstruct human memory for museum tours. Built on [jsPsych (v7.3.4)](https://www.jspsych.org/), the task measures participants' recognition memory, subjective time perception, and chronological reconstruction (timeline placement) for artworks encountered during a gallery tour.

---

## 📋 Experiment Overview

The experiment consists of a sequence of structured memory tests testing recognition and temporal memory:

1. **Setup Phase:**
   - Research Assistants (RAs) log the **Participant ID**, **Session Date**, and **RA Name**.
2. **Memory Task (Recognition & Timeline):**
   - **Recognition Decision:** Participants view artworks (some targets from the tour, some distractors/lures) and rate their confidence on whether they saw them in the gallery (`Definitely yes`, `Maybe yes`, `Maybe no`, `Definitely no`).
   - **Duration Rating:** If recognized (`yes` responses), participants rate how long they observed the artwork relative to the average (`Much less` to `Much more`).
   - **Timeline Placement:** Participants position the recognized artworks on a continuous 45-minute timeline representing the duration of the museum tour.
3. **Cued Recall Phase:**
   - For all recognized artworks, participants are prompted to type out what they remember about the specific artwork or their experience viewing it.
4. **Data Logging:**
   - Once completed, the trial data is compiled into a flat row format and downloaded automatically as a `.csv` file. The experiment can also be configured to save directly to a Supabase database.

---

## 📂 Project Structure

```bash
CAPTURE-task/
├── index.html                   # Main entry menu for launching the tasks
├── task-recognition.html        # HTML wrapper for the recognition, timeline, and recall sequence
├── task-timeline.html           # HTML wrapper for the standalone timeline retrieval task
├── app-recognition.js           # Core jsPsych timeline orchestrating the full experiment sequence
├── app-timeline.js              # Standalone timeline retrieval task execution logic
├── plugin-recognition-task.js   # Custom jsPsych plugin for the binary recognition & duration questions
├── plugin-timeline-task.js      # Custom jsPsych plugin for interactive timeline placement
├── style-recognition.css        # Premium UI styles for the recognition and input views
├── style-timeline.css           # UI styles for the timeline positioning task
├── supabase-config.js           # Configuration and initialization of the Supabase Client
├── cheatsheet.html              # Interactive data schema documentation
├── cheatsheet.pdf               # Printable PDF version of the data schema
└── assets/
    └── sample-art.png           # Artwork image asset (used with filters for local demo)
```

---

## 🛠️ Components & Architecture

### 1. Custom jsPsych Plugins
* **`jsPsychRecognitionTask`** ([plugin-recognition-task.js](./plugin-recognition-task.js))
  - Manages the two-phase trial design.
  - Phase 1 (`confidence`): Displays artwork and prompts "Was this artwork part of the exhibition?" with 4 confidence choices.
  - Phase 2 (`duration`): Prompts "How much time did you spend looking at this artwork...?" with 5 relative duration buttons.
* **`jsPsychTimelineTask`** ([plugin-timeline-task.js](./plugin-timeline-task.js))
  - Implements an interactive canvas where the artwork is placed along a horizontal track representing the timeline.
  - Includes hover tooltips displaying the tour minutes and seconds (e.g., `12:45`) and snaps placement to configured increments.

### 2. Main Logic Files
* **`app-recognition.js`** ([app-recognition.js](./app-recognition.js))
  - Handles the local artwork definitions.
  - Implements helper functions to determine targets vs. lures (`isExhibitionArtwork`).
  - Configures conditional jsPsych node sequences (e.g., only prompting timeline placement if the artwork was recognized).
  - Handles post-experiment data compiling and formatting.

---

## 📊 Data Schema Reference

The experiment produces a comprehensive trial-by-trial database layout. Review [cheatsheet.html](./cheatsheet.html) for full details. 

### Key Data Fields In Generated CSV

| Header | Data Type | Description |
| :--- | :--- | :--- |
| `participant_id` | String | Unique identifier entered at setup. |
| `trial_type` | String | jsPsych trial type (e.g., `recognition-task`, `timeline-task`, `cued-recall-task`). |
| `time_elapsed` | Integer | Total cumulative experiment runtime in milliseconds. |
| `rt` | Integer | Response/reaction time in milliseconds. |
| `image_id` | String | Asset URL or filename of the artwork. |
| `image_type` | Boolean | True if target (exhibition artwork), False if lure. |
| `recognized` | Boolean | Whether participant indicated "yes" (Definitely/Maybe). |
| `correct` | Boolean | True if recognition matches target status. |
| `recognition_confidence` | String | `"Definitely yes"`, `"Maybe yes"`, `"Maybe no"`, `"Definitely no"`. |
| `relative_duration` | String | Observation time rating relative to average. |
| `timeline_position_sec` | Integer | Tour timeline placement location in seconds. |
| `cued_recall_response` | String | Participant typed response of recalled details. |

---

## 🚀 How to Run the Task

### Running Locally
To launch the task locally, serve the project folder using any simple HTTP server. 

**Example using Node.js (`http-server`):**
```bash
# Install http-server globally
npm install -g http-server

# Navigate to project directory and run
cd CAPTURE-task/
http-server
```

**Example using Python:**
```bash
# Python 3
python -m http.server 8000
```
Open `http://localhost:8000` or `http://1277.0.0.1:8000` in your web browser.

---

## 💾 Database Integration (Supabase)

The experiment is pre-configured to support backend data logging via [Supabase](https://supabase.com/). 

### Setup Instructions
1. Update client credentials in [supabase-config.js](./supabase-config.js):
   ```javascript
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```
2. Enable database storage logic in the corresponding task applications (`app-recognition.js` or `app-timeline.js`) if migrating from local offline CSV-only deployments to active database synchronization.
