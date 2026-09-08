/**
 * The store.
 *
 * The UI renders state and dispatches actions; it never implements mechanics.
 * Everything here delegates to the engine and then notifies React.
 *
 * State is mutated in place and subscribers are woken by a version counter, so
 * a large GameState does not have to be deep-cloned on every travel tick.
 */

import {
  askAboutForecasts,
  beginTrade,
  breakDownForParts,
  buyItem,
  decantFuel,
  negotiatePrices,
  offerPassage,
  resolveConcern,
  performRepair,
  performTreatment,
  rest as restAction,
  resupply,
  sellStack,
  socialise,
  visitContact,
  type RepairTarget,
  type ResupplyKind,
  type TreatmentOption,
  waitForShift,
} from '../engine/actions';
import { runAutonomousShip } from '../engine/captain';
import {
  dismissCombat,
  endCombat,
  performAction,
  startCombat,
  tickCombat,
} from '../engine/combat';
import { beginEvent, dismissEvent, resolveChoice, scopesForLocation, selectEvent } from '../engine/eventEngine';
import {
  autoEquipParty,
  equip as equipItem,
  unequip,
  type EquipSlot,
} from '../engine/inventory';
import { pushLog } from '../engine/log';
import { applyDevelopment } from '../engine/development';
import {
  assignCrewLead,
  confirmSuccession,
  ensureCrewLead,
  noteSuccession,
  payShipWatch,
} from '../engine/command';
import { bindSitesToPlaces, boardShip, disembark, ensurePlaces, walkTo } from '../engine/places';
import { canAccessHold, canEquipFromHold, canUseRepairYard, canWorkOnShip } from '../engine/access';
import { acceptMission, abandonMission, refreshMissions, resolveMission } from '../engine/missions';
import { beginNewRun, checkRunEnded, createGame, rerollProtagonist, type NewRunDraft } from '../engine/newGame';
import { upgradeAttribute, upgradeSkill } from '../engine/progression';
import { beginStudy, stopStudy } from '../engine/study';
import {
  negotiate as negotiateRecruit,
  offerBerth,
  payTerms,
  persuade,
  searchForRecruits,
  talkTo,
} from '../engine/recruit';
import { Rng } from '../engine/rng';
import {
  abandonExpedition,
  beginExpedition,
  ensureSites,
  enterNode,
  exitExpedition,
} from '../engine/scavenge';
import { advanceTime, crewMembers, pruneDeadCrew } from '../engine/sim';
import { beginTravel, hoursPerRealSecond, resumeTravel, setSpeed, stepTravel } from '../engine/travel';
import { ONBOARDING, SAVE } from '../engine/tuning';
import type {
  AttributeKey,
  Character,
  CombatAction,
  GameState,
  LocationActionKind,
  LocationId,
  MissionDef,
  RecruitCandidate,
  RecruitVenue,
  ScreenId,
  SkillKey,
  TimeSpeed,
} from '../engine/types';
import { listSaves, loadGame, saveGame, type SaveMeta } from '../persistence/storage';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface Toast {
  id: number;
  lines: string[];
  title?: string;
}

class GameStore {
  state: GameState | null = null;
  draft: NewRunDraft | null = null;
  toasts: Toast[] = [];
  saves: SaveMeta[] = [];
  busy = false;

  private rng: Rng = new Rng('boot');
  private listeners = new Set<() => void>();
  private version = 0;
  private toastId = 0;
  private toastTimers = new Map<number, number>();

  // -- React binding ------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): number => this.version;

  private notify(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  /** Run an engine mutation and wake the UI. */
  private mutate(fn: (state: GameState) => void): void {
    if (!this.state) return;

    // Snapshot the roster and interrupt state so this one choke point can
    // notice everything the engine did, wherever it did it.
    const crewBefore = this.state.crewIds.slice();
    const hadCombat = Boolean(this.state.combat);
    const hadEvent = Boolean(this.state.activeEvent);

    fn(this.state);
    this.state.rngCursor = this.rng.position;

    // Normalise the roster BEFORE diffing it: combat prunes its own dead, but
    // hazard and mission deaths leave the body on the books until someone
    // sweeps. Sweeping here means every death path reaches the farewell.
    pruneDeadCrew(this.state);

    // A death gets one beat, whatever code path caused it.
    this.queueFarewells(crewBefore);

    // If that death emptied the chair, somebody has to take it. The engine
    // installs a provisional successor so nothing dereferences a dead captain,
    // and the choice is then put to the player.
    noteSuccession(this.state);
    ensureCrewLead(this.state);

    // When a fight or an event takes the screen, yesterday's news gets off it.
    if (
      (!hadCombat && this.state.combat) ||
      (!hadEvent && this.state.activeEvent)
    ) {
      this.clearToasts();
    }

    checkRunEnded(this.state);
    this.notify();
  }

  /** Queue an acknowledgment for every crew member who just died. */
  private queueFarewells(crewBefore: string[]): void {
    const state = this.state;
    if (!state) return;
    for (const id of crewBefore) {
      if (state.crewIds.includes(id)) continue;
      const person = state.characters[id];
      if (!person || person.alive) continue; // left, not died
      if (state.pendingFarewells.some((f) => f.characterId === id)) continue;
      const relation =
        state.homeworld.familyIds.includes(id) ||
        state.characters[state.playerId]?.relationships[id]?.roles.includes('family')
          ? 'family'
          : 'crew';
      state.pendingFarewells.push({
        characterId: id,
        name: person.name,
        surname: person.surname,
        portraitSeed: person.portraitSeed,
        relation,
        cause: person.departedReason ?? 'Killed',
      });
      pushLog(state, 'milestone', `${person.name} ${person.surname} is gone. ${person.departedReason ?? ''}`.trim());
    }
  }

  /** The player has read the farewell and chosen to carry on. */
  dismissFarewell = (): void => {
    this.mutate((state) => {
      state.pendingFarewells.shift();
    });
    void this.autosave();
  };

  /**
   * A toast is news, not a record. It says its piece and goes.
   *
   * These used to persist until a fight or an event cleared them, so a line
   * about breaking contact was still on screen fifteen taps and several game
   * hours later — permanent load carrying no decision. Anything worth keeping
   * is already in the journal, so this just expires.
   */
  private static TOAST_MS = 9000;

  private pushToast(lines: string[], title?: string): void {
    const cleaned = lines.filter((l) => l && l.trim().length > 0);
    if (cleaned.length === 0) return;
    this.toastId += 1;
    const id = this.toastId;
    this.toasts = [...this.toasts, { id, lines: cleaned, title }].slice(-3);
    const timer = window.setTimeout(() => {
      this.toastTimers.delete(id);
      if (!this.toasts.some((t) => t.id === id)) return;
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.notify();
    }, GameStore.TOAST_MS);
    this.toastTimers.set(id, timer);
  }

  private clearToasts(): void {
    for (const timer of this.toastTimers.values()) window.clearTimeout(timer);
    this.toastTimers.clear();
    this.toasts = [];
  }

  dismissToast = (id: number): void => {
    const timer = this.toastTimers.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      this.toastTimers.delete(id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  };

  // -- Run lifecycle ------------------------------------------------------

  startNewRun = (seed?: string): void => {
    this.draft = beginNewRun(seed);
    this.state = null;
    this.notify();
  };

  rerollDraft = (attempt: number): void => {
    if (!this.draft) return;
    this.draft = {
      seed: this.draft.seed,
      protagonist: rerollProtagonist(this.draft.seed, attempt),
    };
    this.notify();
  };

  setDraftSeed = (seed: string): void => {
    this.draft = beginNewRun(seed);
    this.notify();
  };

  commitDraft = (protagonist: Character): void => {
    if (!this.draft) return;
    const seed = this.draft.seed;
    this.state = createGame(seed, protagonist);
    this.rng = new Rng(`${seed}:live`, 0);
    this.draft = null;
    this.notify();
    void this.autosave();
  };

  // -- Navigation ---------------------------------------------------------

  setScreen = (screen: ScreenId): void => {
    this.mutate((state) => {
      state.screen = screen;
    });
  };

  pushScreen = (screen: ScreenId): void => {
    this.mutate((state) => {
      state.screenStack.push(state.screen);
      state.screen = screen;
    });
  };

  back = (): void => {
    this.mutate((state) => {
      const previous = state.screenStack.pop();
      state.screen = previous ?? (state.currentLocationId ? 'cockpit' : 'cockpit');
    });
  };

  focusCharacter = (id: string): void => {
    this.mutate((state) => {
      state.focusCharacterId = id;
      state.screenStack.push(state.screen);
      state.screen = 'character';
    });
  };

  toggleDebug = (): void => {
    this.mutate((state) => {
      state.debug.enabled = !state.debug.enabled;
    });
  };

  toggleRevealHidden = (): void => {
    this.mutate((state) => {
      state.debug.revealHidden = !state.debug.revealHidden;
    });
  };

  // -- Travel -------------------------------------------------------------

  setCourse = (toId: LocationId): void => {
    this.mutate((state) => {
      const result = beginTravel(state, toId, this.rng);
      if (!result.ok) this.pushToast([result.reason ?? 'Cannot set that course.']);
    });
    void this.autosave();
  };

  setSpeed = (speed: TimeSpeed): void => {
    this.mutate((state) => setSpeed(state, speed));
  };

  /** Called by the cockpit ticker while travelling. */
  tickTravel = (realSeconds: number): void => {
    if (!this.state?.travel || this.state.travel.paused) return;
    if (this.state.activeEvent || this.state.combat) return;

    this.mutate((state) => {
      const hours = hoursPerRealSecond(state) * realSeconds;
      const before = state.hours;
      const step = stepTravel(state, hours, this.rng);

      // The base ship keeps living while a party is away.
      if (state.expedition) {
        const elapsed = state.hours - before;
        if (elapsed > 0) runAutonomousShip(state, elapsed, this.rng);
      }

      if (step.lines.length > 0) this.pushToast(step.lines);
      if (step.arrived) void this.autosave();
      if (step.interrupted) void this.autosave();
    });
    this.maybeStartPendingCombat();
  };

  resumeTravel = (): void => {
    this.mutate((state) => resumeTravel(state));
  };

  // -- Moving around a world on foot --------------------------------------

  /** Step off the ship onto whatever it is parked on. */
  stepOutside = (): void => {
    this.mutate((state) => {
      const result = disembark(state, this.rng);
      if (!result.ok) {
        this.pushToast([result.reason ?? 'There is nowhere to go.']);
        return;
      }
      state.screen = 'place';
      // Off the ship. The second and last beat is knowing what you are out here for.
      this.advanceOnboardingTo(state, ONBOARDING.GOALS);
    });
  };

  /** Walk to a district or venue. Costs time. */
  goToPlace = (placeId: string): void => {
    this.mutate((state) => {
      const result = walkTo(state, placeId, this.rng);
      if (!result.ok) {
        this.pushToast([result.reason ?? 'You cannot get there.']);
        return;
      }
      if (result.lines.length > 0) this.pushToast(result.lines);
      state.screen = 'place';
      // Walking somewhere on purpose is proof the opening has landed.
      this.advanceOnboardingTo(state, ONBOARDING.DONE);
    });
    void this.autosave();
  };

  /** Walk back and board the ship. */
  returnToShip = (): void => {
    this.mutate((state) => {
      const result = boardShip(state, this.rng);
      if (!result.ok) {
        this.pushToast([result.reason ?? 'You cannot get back yet.']);
        return;
      }
      if (result.lines.length > 0) this.pushToast(result.lines);
      state.screen = 'cockpit';
    });
    void this.autosave();
  };

  openLocalTravel = (): void => {
    this.mutate((state) => {
      const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
      if (location) ensurePlaces(state, location);
      state.screen = 'localTravel';
    });
  };

  // -- Contextual actions, dispatched from a place ------------------------

  /**
   * Actions reach the player because of where they are standing. A place only
   * offers what it plausibly contains, so there is no global Trade or Recruit.
   */
  openPlaceAction = (kind: LocationActionKind): void => {
    if (!this.state) return;
    // Doing something on purpose out in the world is the end of the opening.
    if (this.state.onboardingStep < ONBOARDING.DONE) {
      this.mutate((state) => this.advanceOnboardingTo(state, ONBOARDING.DONE));
    }
    switch (kind) {
      case 'trade':
        this.mutate((state) => beginTrade(state));
        break;
      case 'recruit': {
        // The place is the venue — no separate "where would you like to look".
        const place = this.state.currentPlaceId
          ? this.state.places[this.state.currentPlaceId]
          : undefined;
        const venue = place?.recruitVenue ?? 'bar';
        this.searchRecruits(venue);
        break;
      }
      case 'missions':
      case 'findWork':
        this.mutate((state) => refreshMissions(state, this.rng));
        this.setScreen('missionPrep');
        break;
      case 'scavenge':
        this.mutate((state) => {
          const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
          if (!location) return;
          ensureSites(state, location);
          bindSitesToPlaces(state, location.id);

          // Standing in a ruin means preparing for THAT ruin. A general board
          // of every site in the district belongs behind asking around, not
          // behind a door you walked to.
          const here = state.currentPlaceId ? state.places[state.currentPlaceId] : undefined;
          const ownSite = here?.isSite ? here.siteIds[0] : undefined;
          state.missionPrep = ownSite
            ? {
                siteId: ownSite,
                // Size is chosen on the prep screen; a lone scavenger is a solo
                // expedition, not a group of one.
                kind: 'solo',
                selectedIds: [],
                leaderId: null,
                lockedToSite: true,
              }
            : null;
          state.screen = 'missionPrep';
        });
        break;
      case 'repair':
        this.setScreen('ship');
        break;
      case 'medical':
        this.setScreen('medical');
        break;
      case 'social':
        this.mutate((state) => {
          this.pushToast(socialise(state, this.rng), 'Time spent');
        });
        break;
      case 'study':
        // Being in a library is what makes the hours count; the assignment
        // itself is made on the character sheet.
        this.pushToast(
          ['Quiet, and shelves. Anyone you have set to study is getting proper work done here.'],
          'The reading room',
        );
        break;
      case 'askForecast':
        this.mutate((state) => {
          this.pushToast(askAboutForecasts(state, this.rng), 'Word going around');
        });
        void this.autosave();
        break;
      case 'rest':
        this.setScreen('rest');
        break;
      case 'depart':
        this.returnToShip();
        break;
    }
  };

  // -- Onboarding ---------------------------------------------------------

  private advanceOnboardingTo(state: GameState, step: number): void {
    if (state.onboardingStep < step) state.onboardingStep = step;
  }

  /** Called when the player uses the control the current step points at. */
  completeOnboardingStep = (step: number): void => {
    this.mutate((state) => {
      if (state.onboardingStep === step) state.onboardingStep = step + 1;
    });
  };

  skipOnboarding = (): void => {
    this.mutate((state) => {
      state.onboardingStep = ONBOARDING.DONE;
    });
  };

  /** Roll a location event on demand — "see what's happening here". */
  lookForOpportunity = (): void => {
    this.mutate((state) => {
      const location = state.currentLocationId ? state.locations[state.currentLocationId] : undefined;
      const advance = advanceTime(state, 1.5, this.rng);
      if (advance.lines.length > 0) this.pushToast(advance.lines);

      const def = selectEvent(state, scopesForLocation(location), this.rng, {
        routine: false,
        location,
        danger: location?.danger,
      });
      if (!def) {
        this.pushToast(['Nothing is happening worth your time right now.']);
        return;
      }
      beginEvent(state, def, def.scope[0] ?? 'homeworld');
      state.screen = 'event';
    });
  };

  // -- Events -------------------------------------------------------------

  chooseEventOption = (choiceId: string): void => {
    this.mutate((state) => {
      resolveChoice(state, choiceId, this.rng);
    });
    void this.autosave();
  };

  closeEvent = (): void => {
    this.mutate((state) => {
      dismissEvent(state);
      if (state.travel) {
        state.travel.paused = false;
        state.screen = 'cockpit';
      } else if (state.expedition) {
        state.screen = 'expedition';
      } else {
        state.screen = state.currentPlaceId ? 'place' : 'cockpit';
      }
    });
    this.maybeStartPendingCombat();
  };

  // -- Combat -------------------------------------------------------------

  private maybeStartPendingCombat(): void {
    if (!this.state?.pendingCombat) return;
    this.mutate((state) => {
      const encounterId = state.pendingCombat;
      state.pendingCombat = null;
      if (!encounterId) return;
      const returnTo: ScreenId = state.expedition ? 'expedition' : 'cockpit';
      const combat = startCombat(state, encounterId, this.rng, returnTo);
      if (!combat) return;
      tickCombat(state, this.rng);
    });
  }

  combatAction = (action: CombatAction, targetId?: string): void => {
    this.mutate((state) => {
      const combat = state.combat;
      if (!combat?.activeId) return;
      const result = performAction(state, combat.activeId, action, targetId, this.rng);
      if (result.lines.length > 0) this.pushToast(result.lines);
      if (!result.ended) tickCombat(state, this.rng);
    });
  };

  advanceCombat = (): void => {
    this.mutate((state) => {
      if (state.combat && !state.combat.resolution) tickCombat(state, this.rng);
    });
  };

  fleeCombat = (): void => {
    this.mutate((state) => {
      if (state.combat) endCombat(state, 'fled', this.rng);
    });
  };

  closeCombat = (): void => {
    this.mutate((state) => dismissCombat(state));
    void this.autosave();
  };

  // -- Expeditions --------------------------------------------------------

  startExpedition = (siteId: string, partyIds: string[], leaderId: string): void => {
    this.mutate((state) => {
      const result = beginExpedition(state, siteId, partyIds, leaderId, this.rng);
      if (!result.ok) this.pushToast([result.reason ?? 'Cannot deploy.']);
    });
    void this.autosave();
  };

  moveToNode = (nodeId: string): void => {
    this.mutate((state) => {
      const before = state.hours;
      const result = enterNode(state, nodeId, this.rng);
      const elapsed = state.hours - before;
      if (elapsed > 0) {
        const report = runAutonomousShip(state, elapsed, this.rng);
        result.lines.push(...report.lines);
      }
      // Keep the outcome on the expedition itself, not just in a toast that
      // scrolls away — the expedition screen is where the player is looking.
      if (state.expedition) {
        state.expedition.lastResult = {
          nodeId,
          text: result.lines[0] ?? '',
          lines: result.lines,
        };
      }
      this.pushToast(result.lines, 'Site');
    });
    this.maybeStartPendingCombat();
  };

  leaveSite = (): void => {
    this.mutate((state) => {
      const lines = exitExpedition(state, this.rng);
      this.pushToast(lines, 'Back aboard');
    });
    void this.autosave();
  };

  abortExpedition = (): void => {
    this.mutate((state) => abandonExpedition(state));
  };

  // -- Missions -----------------------------------------------------------

  acceptMissionById = (missionId: string): void => {
    this.mutate((state) => {
      acceptMission(state, missionId);
    });
  };

  abandonMissionById = (missionId: string): void => {
    this.mutate((state) => abandonMission(state, missionId));
  };

  runMission = (mission: MissionDef, partyIds: string[], leaderId: string | null): void => {
    this.mutate((state) => {
      const before = state.hours;
      const result = resolveMission(state, mission, partyIds, leaderId, this.rng);
      const elapsed = state.hours - before;
      if (elapsed > 0 && partyIds.length < crewMembers(state).length) {
        const report = runAutonomousShip(state, elapsed, this.rng);
        result.lines.push(...report.lines);
      }
      this.pushToast(result.lines, mission.title);
    });
    void this.autosave();
  };

  setMissionPrep = (prep: GameState['missionPrep']): void => {
    this.mutate((state) => {
      state.missionPrep = prep;
    });
  };

  // -- Recruitment --------------------------------------------------------

  searchRecruits = (venue: RecruitVenue): void => {
    this.mutate((state) => {
      const result = searchForRecruits(state, venue, this.rng);
      this.pushToast(result.lines, 'Asking around');
      state.screen = 'recruitCandidate';
    });
  };

  selectCandidate = (index: number | null): void => {
    this.mutate((state) => {
      if (state.recruitment) state.recruitment.selectedIndex = index;
    });
  };

  talkToCandidate = (candidate: RecruitCandidate, beat: string): void => {
    this.mutate((state) => {
      this.pushToast(talkTo(state, candidate, beat, this.rng));
    });
  };

  persuadeCandidate = (candidate: RecruitCandidate): void => {
    this.mutate((state) => {
      this.pushToast(persuade(state, candidate, this.rng).lines, 'Persuasion');
    });
  };

  negotiateCandidate = (candidate: RecruitCandidate): void => {
    this.mutate((state) => {
      this.pushToast(negotiateRecruit(state, candidate, this.rng).lines, 'Negotiation');
    });
  };

  payCandidateTerms = (candidate: RecruitCandidate): void => {
    this.mutate((state) => {
      this.pushToast(payTerms(state, candidate), 'Terms');
    });
  };

  offerCandidateBerth = (candidate: RecruitCandidate): void => {
    this.mutate((state) => {
      this.pushToast(offerBerth(state, candidate, this.rng).lines, 'Offer');
    });
    void this.autosave();
  };

  closeRecruiting = (): void => {
    this.mutate((state) => {
      state.recruitment = null;
      state.screen = state.currentPlaceId ? 'place' : 'cockpit';
    });
  };

  // -- Trade --------------------------------------------------------------

  setTradeMode = (mode: 'buy' | 'sell'): void => {
    this.mutate((state) => {
      if (state.trade) state.trade.mode = mode;
    });
  };

  negotiateTrade = (): void => {
    this.mutate((state) => this.pushToast(negotiatePrices(state, this.rng), 'Terms'));
  };

  buy = (uid: string, qty: number): void => {
    this.mutate((state) => this.pushToast(buyItem(state, uid, qty, this.rng)));
  };

  sell = (uid: string, qty: number): void => {
    this.mutate((state) => this.pushToast(sellStack(state, uid, qty)));
  };

  resupplyResource = (kind: ResupplyKind, amount: number): void => {
    this.mutate((state) => this.pushToast(resupply(state, kind, amount, this.rng)));
  };

  closeTrade = (): void => {
    this.mutate((state) => {
      state.trade = null;
      state.screen = state.currentPlaceId ? 'place' : 'cockpit';
    });
    void this.autosave();
  };

  // -- Ship and inventory -------------------------------------------------

  repair = (target: RepairTarget, points: number, payYard: boolean): void => {
    this.mutate((state) => {
      // Paying a yard still means being there to arrange it and leaving the
      // ship in their hands; doing it yourself means holding the spanner.
      const access = payYard ? canUseRepairYard(state) : canWorkOnShip(state);
      if (!access.ok) {
        this.pushToast([access.reason ?? 'Not from here.']);
        return;
      }
      this.pushToast(performRepair(state, target, points, payYard, this.rng), 'Repair');
    });
    void this.autosave();
  };

  treat = (option: TreatmentOption): void => {
    this.mutate((state) => {
      this.pushToast(performTreatment(state, option, this.rng), 'Treatment');
    });
    void this.autosave();
  };

  equipStack = (characterId: string, uid: string): void => {
    this.mutate((state) => {
      const character = state.characters[characterId];
      if (!character) return;
      const error = equipItem(character, uid, state.ship);
      if (error) this.pushToast([error]);
    });
  };

  /** Hand out the best gear in the hold across the whole crew. */
  equipBest = (): void => {
    this.mutate((state) => {
      const access = canEquipFromHold(state);
      if (!access.ok) {
        this.pushToast([access.reason ?? 'Not from here.']);
        return;
      }
      autoEquipParty(crewMembers(state), state.ship);
      this.pushToast(['Crew equipped from the hold.']);
    });
  };

  /** Put somebody to work learning a craft, or take them off it. */
  studySkill = (characterId: string, skill: SkillKey): void => {
    this.mutate((state) => {
      const person = state.characters[characterId];
      if (!person) return;
      const result = beginStudy(person, skill);
      this.pushToast([result.message], result.ok ? 'Study' : undefined);
    });
    void this.autosave();
  };

  stopStudying = (characterId: string): void => {
    this.mutate((state) => {
      const person = state.characters[characterId];
      if (!person) return;
      this.pushToast([stopStudy(person).message]);
    });
    void this.autosave();
  };

  /** Equip just the selected party — used from mission prep. */
  equipSelected = (ids: string[]): void => {
    this.mutate((state) => {
      const access = canEquipFromHold(state);
      if (!access.ok) {
        this.pushToast([access.reason ?? 'Not from here.']);
        return;
      }
      const party = ids
        .map((id) => state.characters[id])
        .filter((c): c is Character => Boolean(c) && c.alive);
      autoEquipParty(party, state.ship);
      this.pushToast(['Party equipped from the hold.']);
    });
  };

  unequipSlot = (characterId: string, slot: 'weapon' | 'sidearm' | 'armor' | 'tool'): void => {
    this.mutate((state) => {
      const character = state.characters[characterId];
      if (character) unequip(character, slot);
    });
  };

  /**
   * Take something out of the hold and put it on. There is no pack to put it
   * in — either it goes in one of this person's four slots or it stays in the
   * crew's stores where it belongs.
   */
  takeFromHold = (characterId: string, uid: string): void => {
    this.mutate((state) => {
      const access = canAccessHold(state);
      if (!access.ok) {
        this.pushToast([access.reason ?? 'Not from here.']);
        return;
      }
      const character = state.characters[characterId];
      if (!character || !state.ship) return;
      const error = equipItem(character, uid, state.ship);
      if (error) this.pushToast([error]);
    });
  };

  stowInHold = (characterId: string, uid: string): void => {
    this.mutate((state) => {
      const access = canAccessHold(state);
      if (!access.ok) {
        this.pushToast([access.reason ?? 'Not from here.']);
        return;
      }
      const character = state.characters[characterId];
      if (!character || !state.ship) return;
      const slot = (Object.keys(character.equipment) as EquipSlot[]).find(
        (key) => character.equipment[key] === uid,
      );
      if (slot) unequip(character, slot, state.ship);
    });
  };

  decant = (): void => {
    this.mutate((state) => {
      const access = canAccessHold(state);
      if (!access.ok) {
        this.pushToast([access.reason ?? 'Not from here.']);
        return;
      }
      this.pushToast(decantFuel(state));
    });
  };

  strip = (uid: string): void => {
    this.mutate((state) => {
      const access = canAccessHold(state);
      if (!access.ok) {
        this.pushToast([access.reason ?? 'Not from here.']);
        return;
      }
      this.pushToast(breakDownForParts(state, uid));
    });
  };

  // -- Family and contacts ------------------------------------------------

  /** Settle whatever is keeping somebody on the ground, where money can. */
  settleConcern = (id: string): void => {
    this.mutate((state) => {
      this.pushToast(resolveConcern(state, id, this.rng), 'Settled');
    });
    void this.autosave();
  };

  visitContact = (id: string): void => {
    this.mutate((state) => {
      this.pushToast(visitContact(state, id, this.rng), 'Visit');
    });
  };

  /** Burn the hours until somebody comes off shift. */
  waitForShift = (id: string): void => {
    this.mutate((state) => {
      this.pushToast(waitForShift(state, id, this.rng), 'Waiting');
    });
    void this.autosave();
  };

  offerPassage = (id: string): void => {
    this.mutate((state) => {
      this.pushToast(offerPassage(state, id, this.rng), 'Passage');
    });
    void this.autosave();
  };

  // -- Rest ---------------------------------------------------------------

  rest = (hours: number): void => {
    this.mutate((state) => {
      const before = state.hours;
      const result = restAction(state, hours, this.rng);
      const elapsed = state.hours - before;
      if (elapsed > 0 && state.expedition) runAutonomousShip(state, elapsed, this.rng);
      this.pushToast(result.lines, 'Rest');
      if (!result.interrupted) state.screen = state.currentPlaceId ? 'place' : 'cockpit';
    });
    void this.autosave();
  };

  // -- Progression --------------------------------------------------------

  /**
   * The player picks a direction; the game spends the points.
   *
   * Nothing about the advancement rules moves — this buys ordinary raises at
   * ordinary costs from the ordinary pools, it just stops making somebody tap
   * +1 twenty times to express one intention.
   */
  developCharacter = (characterId: string, optionId: string): void => {
    this.mutate((state) => {
      const character = state.characters[characterId];
      if (!character) return;
      const result = applyDevelopment(state, character, optionId);
      this.pushToast(result.lines, result.ok ? 'Developed' : undefined);
    });
    void this.autosave();
  };

  raiseSkill = (characterId: string, skill: SkillKey): void => {
    this.mutate((state) => {
      const character = state.characters[characterId];
      if (!character) return;
      const result = upgradeSkill(state, character, skill);
      this.pushToast([result.message]);
    });
  };

  raiseAttribute = (characterId: string, attribute: AttributeKey): void => {
    this.mutate((state) => {
      const character = state.characters[characterId];
      if (!character) return;
      const result = upgradeAttribute(state, character, attribute);
      this.pushToast([result.message]);
    });
  };

  /**
   * The one reassignable command post. Between jobs, never mid-expedition.
   */
  assignCrewLead = (characterId: string): void => {
    this.mutate((state) => {
      const result = assignCrewLead(state, characterId);
      if (!result.ok) this.pushToast([result.reason ?? 'Not now.']);
    });
    void this.autosave();
  };

  /**
   * A survivor takes the chair after the captain has died. This is the only
   * way captaincy ever moves — it is not a role the player hands to whoever
   * rolled better numbers.
   */
  chooseSuccessor = (characterId: string): void => {
    this.mutate((state) => {
      if (!state.pendingSuccession) return;
      const result = confirmSuccession(state, characterId);
      if (!result.ok) this.pushToast([result.reason ?? 'They cannot take it.']);
    });
    void this.autosave();
  };

  /** Pay somebody local to sit with the ship, so both commanders can leave. */
  payShipWatch = (): void => {
    this.mutate((state) => {
      this.pushToast(payShipWatch(state), 'The berth');
    });
    void this.autosave();
  };

  // -- Persistence --------------------------------------------------------

  autosave = async (): Promise<void> => {
    if (!this.state) return;
    try {
      await saveGame(SAVE.autosaveSlot, this.state);
    } catch {
      // A failed autosave must never interrupt play.
    }
  };

  saveTo = async (slot: string): Promise<void> => {
    if (!this.state) return;
    this.busy = true;
    this.notify();
    try {
      await saveGame(slot, this.state);
      this.saves = await listSaves();
      this.pushToast([`Saved to ${slot}.`]);
    } catch {
      this.pushToast(['Could not write the save.']);
    } finally {
      this.busy = false;
      this.notify();
    }
  };

  loadFrom = async (slot: string): Promise<void> => {
    this.busy = true;
    this.notify();
    try {
      const loaded = await loadGame(slot);
      if (!loaded) {
        this.pushToast(['That save could not be read.']);
        return;
      }
      this.state = loaded;
      this.draft = null;
      this.rng = new Rng(`${loaded.seed}:live`, loaded.rngCursor);
      this.pushToast(['Save loaded.']);
    } catch {
      this.pushToast(['That save could not be read.']);
    } finally {
      this.busy = false;
      this.notify();
    }
  };

  refreshSaves = async (): Promise<void> => {
    try {
      this.saves = await listSaves();
    } catch {
      this.saves = [];
    }
    this.notify();
  };

  quitToTitle = (): void => {
    this.state = null;
    this.draft = null;
    this.notify();
  };
}

export const store = new GameStore();

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export type { RepairTarget, ResupplyKind, TreatmentOption };
