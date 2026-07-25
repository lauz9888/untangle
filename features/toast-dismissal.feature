Feature: Toast dismissal
  As someone using Untangle
  I want to dismiss a toast whenever I want
  So it doesn't linger if I've already read it

  Background:
    Given a fresh session
    And I click "Encourage me"

  Scenario: Dismissing a toast manually clears it
    When I dismiss the toast manually
    Then no toast should be showing
