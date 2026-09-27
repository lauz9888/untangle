Feature: Add Task modal
  As someone using Untangle
  I want to open a modal and fill in details for a new task
  So I can capture everything about it before deciding to save or discard it

  Background:
    Given a fresh session

  Scenario: Opening the modal pre-selects Now/Next/Later to "Now" and every other field starts empty
    When I open the Add Task modal
    Then the Add Task modal should be open
    And the Now/Next/Later selection should be "Now"
    And the task name should be empty
    And the description should be empty
    And no energy level should be selected for the new task
    And every estimate field should be empty
    And the available from date should be empty
    And the due by date should be empty
    And there should be no sub-tasks

  Scenario: Confirming discard via Yes closes the modal and clears every field
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    And I have requested to close the Add Task modal
    When I confirm discarding the draft
    Then the Add Task modal should be closed
    And no close confirmation should be showing

  Scenario: Reopening after discarding via Yes starts fresh again
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    And I have requested to close the Add Task modal
    And I confirmed discarding the draft
    When I open the Add Task modal
    Then the task name should be empty
    And the Now/Next/Later selection should be "Now"

  Scenario: Cancelling the close confirmation keeps every previously entered value intact
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    And I have requested to close the Add Task modal
    When I cancel discarding the draft
    Then the Add Task modal should be open
    And no close confirmation should be showing
    And the task name should be "Buy groceries"

  Scenario: Save succeeds once the date conflict is corrected
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    And I set the available from date to "2026-10-10"
    And I set the due by date to "2026-10-01"
    And I have attempted to save the new task
    When I set the due by date to "2026-10-15"
    And I save the new task
    Then the Add Task modal should be closed
