# Darts — Rules & Implementation Spec

A machine-implementable description of the game of darts, written so an AI agent can simulate or play the game.

**Variants covered in this document:**
- **501 / 301** — the standard countdown / checkout game

Other variants (Cricket, Killer, Shanghai, etc.) are intentionally out of scope.

---

## 1. Overview

Darts is a turn-based game in which players throw small pointed missiles ("darts") at a circular numbered board mounted on a wall. On each turn (called a **visit**) a player throws **three** darts. Points are awarded based on which region of the board each dart sticks in. The rules for how points are used (accumulated, subtracted, sequenced, etc.) depend on the variant being played.

Two players (or two teams) play head-to-head. Play alternates: player A takes a full 3-dart visit, then player B takes a full 3-dart visit, and so on until the win condition for the chosen variant is met.

---

## 2. The Dartboard

### 2.1 Physical layout

The standard board (a "clock" board) is divided into **20 numbered wedge-shaped segments** plus a central bullseye. The segments are numbered 1–20, but **not** in numerical order — they are arranged to punish inaccuracy (high numbers are flanked by low numbers).

**Standard segment order, clockwise starting from the top (20 is at 12 o'clock):**

| Position (clockwise from top) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Segment value | 20 | 1 | 18 | 4 | 13 | 6 | 10 | 15 | 2 | 17 | 3 | 19 | 7 | 16 | 8 | 11 | 14 | 9 | 12 | 5 |

### 2.2 Scoring regions

Each numbered wedge has four scoring zones, from outside in:

| Region | Description | Multiplier |
|---|---|---|
| **Miss / off-board** | Dart lands outside the outer double wire, or bounces out / falls out | ×0 (no score) |
| **Single (outer)** | Large outer area of the wedge | ×1 |
| **Double ring** | Thin outer ring | ×2 |
| **Single (inner)** | Large inner area of the wedge (between treble and double rings) | ×1 |
| **Treble (triple) ring** | Thin ring midway between the bullseye and the double ring | ×3 |

The centre of the board has two zones (not tied to any numbered wedge):

| Region | Value | Notes |
|---|---|---|
| **Outer bull** ("25", "single bull") | 25 | Counts as a single for double-out purposes |
| **Bullseye** ("50", "double bull", "cork") | 50 | Counts as a **double** (specifically double-25) for double-out purposes |

### 2.3 Maximum scores

- **Maximum single dart:** 60 (treble 20)
- **Maximum 3-dart visit:** 180 (three treble 20s) — colloquially called a **ton-80**

### 2.4 Regulation dimensions (informational)

- Distance from face of board to throw line (**oche**): **2.37 m** (7 ft 9¼ in)
- Height from floor to centre of bullseye: **1.73 m** (5 ft 8 in)

---

## 3. Throwing basics

- Each player throws **exactly 3 darts** per visit.
  - A visit may be ended early only if the variant's win/bust condition is triggered.
- Players alternate visits.
- A dart scores **if, at the moment the player finishes their visit, its point (tip) is touching the face of the board**. The dart does not have to be embedded in the board — a "hanger" whose tip rests on the board face (for example, wedged between two previously thrown darts) counts for the region its tip is touching. Darts that:
  - bounce out,
  - fall out of the board before the visit ends,
  - miss the board entirely,
  - are dislodged by a later dart in the same visit and no longer have their tip on the board face,
  
  score **0** (or more precisely, the score they would have registered is voided).
- A dart may only be re-thrown if the rules of the venue/tournament permit; in standard rules a bounce-out is simply worth 0 and is not re-thrown.
- Only the player whose turn it currently is can win the leg on that visit.

---

## 4. Scoring model (data structures)

An AI implementation should represent each thrown dart as a structured record. The following schema is sufficient for all variants covered here.

### 4.1 Dart record

```
Dart {
    segment:     one of { 1, 2, 3, ..., 20, "BULL", "OUTER_BULL", "MISS" }
    multiplier:  one of { 1, 2, 3 }   // fixed at 1 for BULL, OUTER_BULL, and MISS
}
```

### 4.2 Point value of a single dart

```
function dart_value(dart):
    if dart.segment == "MISS":        return 0
    if dart.segment == "OUTER_BULL":  return 25
    if dart.segment == "BULL":        return 50
    return dart.segment * dart.multiplier    // 1..20 * (1|2|3)
```

### 4.3 "Is this dart a double?" (needed for 501/301 double-out)

```
function is_double(dart):
    if dart.segment == "BULL":               return true    // bullseye = double-25
    if dart.segment in {"OUTER_BULL","MISS"}: return false
    return dart.multiplier == 2
```

### 4.4 Turn (visit) score

```
turn_score(darts_thrown_this_visit) = sum(dart_value(d) for d in darts_thrown_this_visit)
```

---

## 5. Variant: 501 / 301 (countdown)

The most common competitive format.

### 5.1 Setup

- Each player starts on **501** (or **301** for the shorter game). This is their **remaining score**.
- Players alternate 3-dart visits.
- On each visit, the total value of the darts thrown is **subtracted** from the player's remaining score.

### 5.2 Double-out (mandatory)

To win, a player must reduce their remaining score to **exactly 0**, and the **final dart** that reaches 0 must be a **double** (either a double-ring hit, or the bullseye which counts as double-25).

### 5.3 Double-in (configurable; default OFF)

Some rulesets require that a player's scoring "opens" by first hitting a double. In this document, double-in is **OFF by default for both 501 and 301**, but implementations should expose it as a configuration flag. When enabled: any darts thrown before the first double do not reduce the player's score.

### 5.4 Bust rules

A visit "busts" — meaning the visit ends immediately, any remaining darts in the visit are forfeited, and **the player's remaining score is reverted to what it was at the start of that visit** — if any of the following becomes true at any point during the visit:

1. **Score would go below 0.**
2. **Score reaches exactly 1** (impossible to finish, because 1 cannot be hit as a double).
3. **Score reaches exactly 0 but the final scoring dart was not a double.**

### 5.5 Turn resolution (pseudocode)

```
function process_visit(player, darts):
    starting_score = player.remaining
    running        = starting_score
    last_dart      = null

    for d in darts:                       // up to 3 darts
        v = dart_value(d)
        new_score = running - v

        if new_score < 0 or new_score == 1:
            player.remaining = starting_score       // BUST: revert
            return BUST

        if new_score == 0:
            if is_double(d):
                player.remaining = 0
                return WIN
            else:
                player.remaining = starting_score   // BUST: revert
                return BUST

        running   = new_score
        last_dart = d

    player.remaining = running
    return OK
```

Notes:
- Double-in (if enabled) wraps this loop: darts before the first double do not modify `running`.
- On `WIN`, any remaining darts in the visit are simply not thrown.
- On `BUST`, any remaining darts in the visit are simply not thrown.

### 5.6 Common checkouts (finishes)

A "checkout" is a valid 1-, 2-, or 3-dart sequence that reduces the remaining score to 0 finishing on a double. Below is a reference table of preferred finishes for scores from 170 down to 2. `T` = treble, `D` = double, `S` = single, `Bull` = 50 (double-25).

| Remaining | Preferred finish |
|---:|---|
| 170 | T20, T20, Bull |
| 167 | T20, T19, Bull |
| 164 | T20, T18, Bull |
| 161 | T20, T17, Bull |
| 160 | T20, T20, D20 |
| 158 | T20, T20, D19 |
| 100 | T20, D20 |
|  81 | T19, D12 |
|  60 | S20, D20 |
|  50 | Bull *(or S10, D20)* |
|  40 | D20 |
|  32 | D16 |
|  24 | D12 |
|  16 | D8 |
|   8 | D4 |
|   4 | D2 |
|   2 | D1 |

Any score of **170** is the highest possible 3-dart checkout. Scores of **169, 168, 166, 165, 163, 162, 159** are **not** checkoutable in 3 darts and must be reduced further first.

---

## 6. Match structure (brief)

Competitive darts is played as best-of-N **legs**, optionally grouped into best-of-N **sets**.

- **Leg:** one complete game (e.g. one 501 game from 501 down to a double-out win).
- **Set:** a group of legs; typically first to 3 legs wins a set.
- **Match:** typically first to N sets, or first to N legs in shorter formats.
- **Who throws first?** Determined by a **bull-off** ("diddle for the middle"): each player throws one dart at the bullseye; closest to the centre throws first. In subsequent legs, players typically alternate the throw.

---

## 7. Glossary

| Term | Meaning |
|---|---|
| **Arrows** | Slang for darts |
| **Bull / Bullseye** | The centre 50 zone; counts as double-25 |
| **Bust** | An invalid visit in 501/301 (score goes below 0, to 1, or to 0 without a double) — score reverts |
| **Checkout** | A valid finish sequence that reduces score to 0 on a double |
| **Diddle for the middle** | The bull-off; a single dart per player at the bullseye to determine who throws first |
| **Double** | Dart in the outer thin ring (×2 multiplier); also the bullseye |
| **Double-in** | Optional rule: must hit a double before any score counts |
| **Double-out** | The mandatory-in-this-spec rule that the winning dart must be a double |
| **Leg** | One single game of the chosen variant |
| **Oche** | The throwing line (2.37 m from the board) |
| **Outer bull** | The 25-point ring around the bullseye; counts as a single |
| **Set** | A group of legs |
| **Single** | Dart in a large (non-ring) area of a numbered wedge |
| **Ton** | A score of 100 in a single visit |
| **Ton-80** | The maximum 3-dart visit score of 180 |
| **Treble / Triple** | Dart in the inner thin ring (×3 multiplier) |
| **Visit** | One player's turn of up to 3 darts |

---

## 8. Edge cases checklist

An implementation should explicitly handle the following:

1. **Bounce-outs and fall-outs** — dart records 0; do not permit a re-throw in standard rules.
2. **Dart dislodging a previous dart in the same visit** — the dislodged dart no longer counts (its tip is no longer on the board face); the dislodging dart scores wherever it ends up.
3. **"Hangers" (darts whose tip touches the board face but which are not embedded)** — these **do** count for the region their tip is touching, provided the tip is still on the board face when the visit ends. Typical cause: a later dart lodges between two earlier darts, or a dart's point catches the surface without penetrating.
4. **Miss / off-board** — represented as `segment = "MISS"`, value 0.
5. **Score correction mid-visit** — if an incorrect score has been entered but the visit is not yet over, correction should be allowed; once the next player throws, scores are considered final (competition convention).
6. **Only the current thrower can win a leg on their visit** — the opponent's remaining score is irrelevant to the win check.
7. **First-dart or second-dart checkout in 501/301** — a visit can end in `WIN` after just 1 or 2 darts; unused darts are not thrown.
8. **Double-in edge case** — if double-in is enabled and the player throws a valid double as their first scoring dart, that double's value **does** count toward the countdown.
9. **Around the Clock overshoot** — a treble on target 19 advances 3 steps: 19 → 20 → BULL → WIN. Implementations must not cap the advance at "BULL" prematurely.
10. **Around the Clock final dart on BULL** — under the default config both outer bull and bullseye satisfy the win condition; under strict config only the bullseye does.

---

## 9. Implementation notes for the AI agent

### 9.1 Suggested game state

```
GameState {
    variant:            "501" | "301" | "AROUND_THE_CLOCK"
    config: {
        double_in:               boolean         // 501/301 only; default false
        clock_advance_mode:      "multiplier" | "singles_only" | "any_hit_is_one"   // Around the Clock; default "multiplier"
        clock_win_on_outer_bull: boolean         // Around the Clock; default true
    }
    players:            [ PlayerState, PlayerState, ... ]
    current_player_idx: integer                  // whose turn it is
    visit_history:      [ VisitRecord, ... ]     // for audit / undo
    status:             "IN_PROGRESS" | "FINISHED"
    winner_idx:         integer | null
}

PlayerState (501/301) {
    remaining:  integer                          // starts at 501 or 301
    opened:     boolean                          // for double_in; starts false
}

PlayerState (Around the Clock) {
    target:     1..20 | "BULL"                   // starts at 1
}

VisitRecord {
    player_idx:   integer
    darts:        [Dart, Dart, Dart]             // may be shorter if visit ended early
    outcome:      "OK" | "BUST" | "WIN"
    score_before: integer | target_before        // variant-dependent
    score_after:  integer | target_after
}
```

### 9.2 Top-level turn algorithm

```
function play_visit(state, darts):
    player = state.players[state.current_player_idx]
    before = snapshot(player)

    if state.variant in {"501","301"}:
        outcome = process_visit(player, darts)                 // §5.5
    else if state.variant == "AROUND_THE_CLOCK":
        outcome = process_visit_clock(player, darts)           // §6.6

    record_visit(state, player, darts, before, outcome)

    if outcome == WIN:
        state.status     = "FINISHED"
        state.winner_idx = state.current_player_idx
    else:
        state.current_player_idx = (state.current_player_idx + 1) mod len(state.players)
```

### 9.3 Input validation boundaries

At the boundary where darts enter the system (whether from a human UI, a physics simulator, or a policy), validate:

- `segment` is one of the allowed values (§4.1).
- `multiplier` is 1, 2, or 3.
- `multiplier` is **1** whenever `segment` is `"BULL"`, `"OUTER_BULL"`, or `"MISS"`.
- The number of darts in a visit is **≤ 3**.
- The game is not already `FINISHED`.

All game-state mutations should go through `play_visit` so bust/win logic cannot be bypassed.
