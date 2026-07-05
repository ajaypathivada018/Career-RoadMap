End-to-End Test Plan

Primary journeys
1. Sign up, log in, and confirm the authenticated home/dashboard loads.
2. Generate a course from a topic, review answers in the modal, and save the generated course.
3. Create a roadmap, update progress, and verify the profile reflects the saved roadmap.
4. Run a skill evaluation, submit answers, and confirm the score appears in profile history.
5. Open the dashboard, resume a course, and verify the correct course page loads.

Acceptance checks
- Each journey should show the expected loading, success, and error states.
- Auth cookies/tokens should survive navigation and reload.
- Saved entities should appear in profile and dashboard summaries.
- Validation errors should surface inline or in modal form before submission.

Current blocker
- Persistent database-backed coverage needs a connected MongoDB instance for full persistence validation.
- The frontend build is verified, but live browser-based journey coverage still needs a storage-backed environment.

Suggested execution order once MongoDB is available
1. Register and log in.
2. Generate course and save it.
3. Create roadmap and update progress.
4. Run assessment and submit answers.
5. Resume learning from dashboard and profile.
