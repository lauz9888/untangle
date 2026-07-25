Feature: Energy level selection
  As someone using Untangle
  I want to select today's energy level
  So I see an encouraging message suited to how I'm feeling

  Background:
    Given a fresh session

  Scenario: No level is selected at the start of a session
    Then no energy level should be selected
    And no toast should be showing

  Scenario Outline: Selecting an energy level shows an encouraging toast
    When I select the "<level>" energy level
    Then the selected energy level should be "<level>"
    And a toast message should be showing

    Examples:
      | level  |
      | low    |
      | medium |
      | high   |

  Scenario: Selecting the same level again deselects it
    Given I have selected the "high" energy level
    When I select the "high" energy level again
    Then no energy level should be selected

  Scenario: Switching directly to a different level replaces the selection and toast
    Given I have selected the "low" energy level
    When I select the "high" energy level
    Then the selected energy level should be "high"
    And a toast message should be showing
