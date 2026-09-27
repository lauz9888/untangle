Feature: Task data model and store
  As someone using Untangle
  I want tasks I add to be tracked with a stable identity, a done state, and sub-tasks
  So I can create, update, complete, and remove tasks and trust the store's ordering

  Background:
    Given a fresh session

  Scenario: Tasks added in sequence come back in that same order
    Given I have added a task named "First" to "Now"
    And I have added a task named "Second" to "Now"
    And I have added a task named "Third" to "Now"
    Then the tasks in "Now" should be, in order: "First", "Second", "Third"
