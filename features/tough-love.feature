Feature: Tough love
  As someone using Untangle
  I want a firmer, more pressing nudge on demand
  So I can get moving even when gentle encouragement isn't enough

  Background:
    Given a fresh session

  Scenario: Requesting tough love shows a toast without requiring an energy level
    When I click "Tough love"
    Then a toast message should be showing
    And no energy level should be selected

  Scenario: Tough love does not change an already-selected energy level
    Given I have selected the "medium" energy level
    When I click "Tough love"
    Then the selected energy level should be "medium"
    And a toast message should be showing

  Scenario: Selecting an energy level afterwards replaces the tough-love toast
    Given I click "Tough love"
    When I select the "low" energy level
    Then the selected energy level should be "low"
    And a toast message should be showing

  Scenario: Tough love replaces a currently-showing encouragement toast
    Given I click "Encourage me"
    When I click "Tough love"
    Then a toast message should be showing
