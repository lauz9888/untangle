Feature: Task detail view, edit, and delete
  As someone using Untangle
  I want to open a task to see and edit everything about it, or delete it
  So I can correct or remove a task after it's been created

  Background:
    Given a fresh session

  Scenario: Opening a task's detail view pre-fills every field
    Given I have added a task named "Write proposal" to "Now" with every field populated
    When I open the detail view for "Write proposal"
    Then the detail view should be open for "Write proposal"
    And the detail view's section selection should be "Now"
    And the detail view's description should be "Pull together the quarterly proposal draft."
    And the detail view's energy level selection should be "Medium"
    And the detail view's estimate fields should be "1" days, "2" hours, "30" minutes
    And the detail view's available from date should be "2026-10-05"
    And the detail view's due by date should be "2026-10-20"
    And the detail view's sub-tasks should be, in order: "Outline sections", "Gather data"

  Scenario: Editing and saving moves a task to a new section with no reload
    Given I have added a task named "Write proposal" to "Now"
    And I have opened the detail view for "Write proposal"
    And I have set the detail view's task name to "Write final proposal"
    And I have selected "Later" as the detail view's section
    When I save the detail view
    Then the detail view should be closed
    And the tasks in "Later" should be, in order: "Write final proposal"
    And there should be no tasks in "Now"

  Scenario: Deleting a task through the confirmation removes it from the board
    Given I have added a task named "Write proposal" to "Now"
    And I have opened the detail view for "Write proposal"
    And I have requested to delete the task from the detail view
    When I confirm deleting the task
    Then the detail view should be closed
    And there should be no tasks in "Now"

  Scenario: Discarding an edit and reopening the task shows its original values
    Given I have added a task named "Write proposal" to "Now"
    And I have opened the detail view for "Write proposal"
    And I have set the detail view's description to "A draft edit that should not be kept"
    And I have requested to close the detail view
    When I confirm discarding the detail view's changes
    And I open the detail view for "Write proposal"
    Then the detail view's description should be ""

  Scenario: Toggling done in the detail view persists instantly and survives a discard
    Given I have added a task named "Write proposal" to "Now"
    And I have opened the detail view for "Write proposal"
    And I have toggled the task's done state from the detail view
    And I have set the detail view's description to "A draft edit that should not be kept"
    And I have requested to close the detail view
    When I confirm discarding the detail view's changes
    Then the task "Write proposal" should be marked done
    When I open the detail view for "Write proposal"
    Then the detail view's description should be ""
