Feature: Add Task modal
  As someone using Untangle
  I want to open a modal and fill in details for a new task
  So I can capture everything about it before deciding to save or discard it

  Background:
    Given a fresh session

  Scenario: The modal starts closed at a fresh session
    Then the Add Task modal should be closed

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

  Scenario Outline: Selecting Next or Later changes the Now/Next/Later selection
    Given I have opened the Add Task modal
    When I select "<section>" for the new task
    Then the Now/Next/Later selection should be "<section>"

    Examples:
      | section |
      | Next    |
      | Later   |

  Scenario: The Now/Next/Later selection cannot be cleared to no selection
    Given I have opened the Add Task modal
    And I have selected "Next" for the new task
    When I select "Next" for the new task
    Then the Now/Next/Later selection should be "Next"

  Scenario: Closing with nothing changed closes the modal immediately
    Given I have opened the Add Task modal
    When I request to close the Add Task modal
    Then the Add Task modal should be closed
    And no close confirmation should be showing

  Scenario Outline: Changing a single field then requesting close triggers the close confirmation
    Given I have opened the Add Task modal
    When I <change>
    And I request to close the Add Task modal
    Then the close confirmation should be showing
    And the Add Task modal should be open

    Examples:
      | change                                                       |
      | enter "Buy groceries" as the task name                       |
      | enter "Pick up milk and eggs" as the description              |
      | select the "low" energy level for the new task                |
      | set the estimate days field to "2"                            |
      | set the estimate hours field to "2"                           |
      | set the estimate minutes field to "2"                         |
      | set the available from date to "2026-10-01"                   |
      | set the due by date to "2026-10-05"                           |
      | select "Next" for the new task                                |
      | add the sub-task "Wash dishes"                                |
      | type "Draft text" into the sub-task input without saving      |

  Scenario Outline: An estimate field explicitly set to "0" does not trigger the close confirmation
    Given I have opened the Add Task modal
    When I set the estimate <field> field to "0"
    And I request to close the Add Task modal
    Then the Add Task modal should be closed
    And no close confirmation should be showing

    Examples:
      | field   |
      | days    |
      | hours   |
      | minutes |

  Scenario: Entering a leading minus sign into an estimate field strips it, keeping only the digits
    Given I have opened the Add Task modal
    When I set the estimate days field to "-5"
    Then the estimate days field should read "5"

  Scenario: Entering a decimal point into an estimate field strips it, keeping only the digits
    Given I have opened the Add Task modal
    When I set the estimate hours field to "1.5"
    Then the estimate hours field should read "15"

  Scenario: Entering an hours value above 23 clamps it down to 23 (issue #121)
    Given I have opened the Add Task modal
    When I set the estimate hours field to "99"
    Then the estimate hours field should read "23"

  Scenario: Entering a minutes value above 59 clamps it down to 59 (issue #121)
    Given I have opened the Add Task modal
    When I set the estimate minutes field to "60"
    Then the estimate minutes field should read "59"

  Scenario: Entering exactly the hours/minutes boundary values leaves them unchanged (issue #121)
    Given I have opened the Add Task modal
    When I set the estimate hours field to "23"
    And I set the estimate minutes field to "59"
    Then the estimate hours field should read "23"
    And the estimate minutes field should read "59"

  Scenario: Entering a large days value is never clamped, unlike hours/minutes (issue #121)
    Given I have opened the Add Task modal
    When I set the estimate days field to "999"
    Then the estimate days field should read "999"

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

  Scenario: Save is blocked when the task name is empty
    Given I have opened the Add Task modal
    When I save the new task
    Then the Add Task modal should be open
    And the task name should be marked invalid

  Scenario: Save is blocked when the task name is whitespace-only
    Given I have opened the Add Task modal
    And I have entered "   " as the task name
    When I save the new task
    Then the Add Task modal should be open
    And the task name should be marked invalid

  Scenario: Save succeeds when the task name is provided and there is no date conflict
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    When I save the new task
    Then the Add Task modal should be closed

  Scenario: Save is blocked when Due by precedes Available from
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    And I set the available from date to "2026-10-10"
    And I set the due by date to "2026-10-01"
    When I save the new task
    Then the Add Task modal should be open
    And the due by date should be marked invalid

  Scenario: Save succeeds once the date conflict is corrected
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    And I set the available from date to "2026-10-10"
    And I set the due by date to "2026-10-01"
    And I have attempted to save the new task
    When I set the due by date to "2026-10-15"
    And I save the new task
    Then the Add Task modal should be closed

  Scenario: Adding a sub-task with blank or whitespace-only text is a no-op
    Given I have opened the Add Task modal
    And I have opened the sub-task input
    When I attempt to save the sub-task draft with text "   "
    Then there should be no sub-tasks
    And the sub-task input should still be open

  Scenario: Adding sub-tasks with real text appends them in order
    Given I have opened the Add Task modal
    And I have added the sub-task "Wash dishes"
    When I add the sub-task "Buy soap"
    Then the sub-tasks should be, in order: "Wash dishes", "Buy soap"

  Scenario: Deleting a sub-task removes only the targeted one
    Given I have opened the Add Task modal
    And I have added the sub-task "Wash dishes"
    And I have added the sub-task "Buy soap"
    When I delete the sub-task "Wash dishes"
    Then the sub-tasks should be, in order: "Buy soap"

  Scenario: Closing the sub-task input without saving discards the draft text
    Given I have opened the Add Task modal
    And I have opened the sub-task input
    And I have typed "Draft text" into the sub-task input without saving
    And I have closed the sub-task input without saving
    When I open the sub-task input
    Then the sub-task draft text should be empty
