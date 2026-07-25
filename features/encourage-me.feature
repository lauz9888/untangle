Feature: Encourage me
  As someone using Untangle
  I want a general encouraging message on demand
  So I can get a boost without picking an energy level first

  Background:
    Given a fresh session

  Scenario: Requesting encouragement shows a toast without requiring an energy level
    When I click "Encourage me"
    Then a toast message should be showing
    And no energy level should be selected

  Scenario: Encouragement does not change an already-selected energy level
    Given I have selected the "medium" energy level
    When I click "Encourage me"
    Then the selected energy level should be "medium"
    And a toast message should be showing

  Scenario: Selecting an energy level afterwards replaces the encouragement toast
    Given I click "Encourage me"
    When I select the "low" energy level
    Then the selected energy level should be "low"
    And a toast message should be showing
