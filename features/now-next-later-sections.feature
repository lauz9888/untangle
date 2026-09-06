Feature: Now / Next / Later section collapse
  As someone using Untangle
  I want each of the Now/Next/Later sections to collapse and expand independently
  So I can hide sections I'm not focused on without losing track of the others

  Scenario: All three sections are expanded at the start of a scenario
    Then the "Now" section should be expanded
    And the "Next" section should be expanded
    And the "Later" section should be expanded

  Scenario Outline: Collapsing one section leaves the other two expanded
    When I collapse the "<section>" section
    Then the "<section>" section should be collapsed
    And the other sections should remain expanded

    Examples:
      | section |
      | Now     |
      | Next    |
      | Later   |

  Scenario Outline: Expanding a previously collapsed section restores it without affecting the others
    Given I have collapsed the "<section>" section
    When I expand the "<section>" section
    Then the "<section>" section should be expanded
    And the other sections should remain expanded

    Examples:
      | section |
      | Now     |
      | Next    |
      | Later   |

  Scenario: Toggling a section twice returns it to its original expanded state
    When I collapse the "Now" section
    And I expand the "Now" section
    Then the "Now" section should be expanded
