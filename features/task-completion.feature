Feature: Task completion celebration and Completed panel
  As someone using Untangle
  I want finishing a task to be celebrated and the task to move out of my way
  So I feel rewarded, my board stays focused, and I can still find or restore finished tasks

  Background:
    Given a fresh session
    And a fresh celebration session

  Scenario: Completing a task from the board celebrates it and the Completed panel can restore it
    Given I have added a task named "Write proposal" to "Now"
    When I complete the task "Write proposal" from the board
    Then the task "Write proposal" should not be on the board
    And a celebration message should be showing
    And the Completed count should be 1
    And I have noted the celebration count
    When I open the Completed panel
    Then the Completed panel should list, most recent first: "Write proposal"
    When I mark "Write proposal" as not done from the Completed panel
    Then the task "Write proposal" should be on the board in "Now"
    And the Completed count should be 0
    And no new celebration should have been triggered

  Scenario: Completing a task from the detail view discards unsaved edits and celebrates
    Given I have added a task named "Write proposal" to "Now"
    And I have opened the detail view for "Write proposal"
    And I have set the detail view's task name to "Write final proposal"
    When I toggle the task's done state from the detail view
    Then the detail view should be closed
    And no discard confirmation should be showing in the detail view
    And a celebration message should be showing
    And the task "Write proposal" should not be on the board
    When I open the Completed panel
    Then the Completed panel should list, most recent first: "Write proposal"

  Scenario: Un-ticking and re-ticking a task opened from the Completed panel
    Given I have added a task named "Write proposal" to "Now"
    And I have completed the task "Write proposal" from the board
    And I have noted the celebration count
    And I have opened the Completed panel
    And I have opened "Write proposal" from the Completed panel
    When I toggle the task's done state from the detail view
    Then the task "Write proposal" should be on the board in "Now"
    And the Completed panel should list no tasks
    And no new celebration should have been triggered
    When I toggle the task's done state from the detail view
    Then a new celebration should have been triggered
    And the detail view should be closed
    And the Completed panel should be open
    And the task "Write proposal" should not be on the board
    And the Completed panel should list, most recent first: "Write proposal"
