Feature: Task data model and store
  As someone using Untangle
  I want tasks I add to be tracked with a stable identity, a done state, and sub-tasks
  So I can create, update, complete, and remove tasks and trust the store's ordering

  Background:
    Given a fresh session

  Scenario: Adding a task with a valid name appends it to the store
    When I add a task named "Buy groceries" to "Now"
    Then the store should contain 1 task
    And the task "Buy groceries" should not be done

  Scenario: Adding a task with an empty/whitespace name is rejected
    When I attempt to add a task named "   " to "Now"
    Then the store should contain 0 tasks

  Scenario: Adding a task with a due date before its available-from date is rejected
    When I attempt to add a task named "Buy groceries" to "Now" available from "2026-10-10" due by "2026-10-01"
    Then the store should contain 0 tasks

  Scenario: Toggling a task's done state flips only that task
    Given I have added a task named "Buy groceries" to "Now"
    And I have added a task named "Walk the dog" to "Now"
    When I toggle the done state of task "Buy groceries"
    Then the task "Buy groceries" should be done
    And the task "Walk the dog" should not be done

  Scenario: Toggling a sub-task's done state flips only that sub-task
    Given I have added a task named "Plan trip" to "Now" with sub-tasks: "Book flights", "Pack bags"
    When I toggle the done state of sub-task "Book flights" on task "Plan trip"
    Then the sub-task "Book flights" on task "Plan trip" should be done
    And the sub-task "Pack bags" on task "Plan trip" should not be done
    And the task "Plan trip" should not be done

  Scenario: Removing a task by id removes only that task
    Given I have added a task named "Buy groceries" to "Now"
    And I have added a task named "Walk the dog" to "Now"
    When I remove the task "Buy groceries"
    Then the store should contain 1 task
    And the task "Walk the dog" should still be present

  Scenario: Removing an unknown task id is a no-op
    Given I have added a task named "Buy groceries" to "Now"
    When I attempt to remove an unknown task
    Then the store should contain 1 task

  Scenario: Updating a task's name and section merges the change
    Given I have added a task named "Buy groceries" to "Now"
    When I update the task "Buy groceries" to be named "Buy oat milk" in "Next"
    Then the store should contain a task named "Buy oat milk" in "Next"

  Scenario: Updating a task to an empty name is rejected and leaves the original name intact
    Given I have added a task named "Buy groceries" to "Now"
    When I attempt to update the task "Buy groceries" to be named "   "
    Then the task "Buy groceries" should still be present

  Scenario: Tasks added in sequence come back in that same order
    Given I have added a task named "First" to "Now"
    And I have added a task named "Second" to "Now"
    And I have added a task named "Third" to "Now"
    Then the tasks in "Now" should be, in order: "First", "Second", "Third"

  Scenario: Saving a valid task in the Add Task modal adds it to the task store
    Given I have opened the Add Task modal
    And I have entered "Buy groceries" as the task name
    And I have selected "Next" for the new task
    When I save the new task
    Then the store should contain 1 task
    And the store should contain a task named "Buy groceries" in "Next"
    And the task "Buy groceries" should not be done

  Scenario: Saving with an empty task name leaves the store empty
    Given I have opened the Add Task modal
    When I save the new task
    Then the store should contain 0 tasks
