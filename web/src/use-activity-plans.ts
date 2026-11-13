import {
  computed,
  nextTick,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from "vue";
import type { useGame } from "./store";
import type { useFocus } from "./focus";
import { visibleFocusTarget } from "./focus";
import { useRuleContent } from "./rule-content";
import type { Action } from "../../src/full/types.ts";
import type { CollectionTarget } from "../../src/full/goals.ts";
import type { NavigationRequest } from "./navigation";
import type {
  CultivationPlan,
  SourcePlan,
  CraftPlan,
  ForgePlan,
  MilestoneActivity,
} from "../../src/full/activity.ts";
import {
  isAdventurePlan,
  type AdventurePlan,
} from "../../src/full/adventure.ts";
import {
  isPreparationPlan,
  type PreparationPlan,
} from "../../src/full/preparation.ts";
import * as C from "../../src/full/content.ts";
export interface PlanNavigation {
  owner(): number;
  advance(): number;
  select(tab: string): number;
  open(view: string): Promise<number | null>;
  current(): { singleScreen: boolean; view: string };
  dismissResume(): void;
  navigate(request: NavigationRequest, arrived?: () => void): Promise<void>;
  inspectMilestone(activity: MilestoneActivity): void;
}
/** Saved arrangement identity, draft inspection and accepted travel handoffs share one owner. */
export function useActivityPlans(
  store: ReturnType<typeof useGame>,
  focus: ReturnType<typeof useFocus>,
  navigation: PlanNavigation,
) {
  const game = computed(() => store.game),
    core = computed(() => store.game?.core),
    pendingStoryError = computed(() => store.unresolved),
    ruleContent = useRuleContent(() => store.game);
  let alive = true;
  onScopeDispose(() => {
    alive = false;
    arrivalIntent = null;
  });
  const focusStillOwned = (anchor: Element | null) => {
    const active = document.activeElement;
    return (
      active === document.body ||
      active === anchor ||
      !visibleFocusTarget(active)
    );
  };
  const collectionTarget = ref<CollectionTarget | null>(null),
    highlight = ref("");
  const trainingInspectionPlan = shallowRef<CultivationPlan | null>(null);
  const sourceInspectionPlan = shallowRef<SourcePlan | null>(null);
  const productionInspectionPlan = shallowRef<CraftPlan | ForgePlan | null>(
    null,
  );
  const preparationInspectionPlan = shallowRef<PreparationPlan | null>(null),
    preparationInspectionSaved = ref(false),
    preparationInspectionExact = ref(true);
  const adventureInspectionPlan = shallowRef<AdventurePlan | null>(null),
    adventureInspectionSaved = ref(false),
    activityPlanVisible = ref(false);
  watch(
    () => store.activity?.id,
    () => (activityPlanVisible.value = false),
  );
  function clearInspections() {
    trainingInspectionPlan.value = null;
    sourceInspectionPlan.value = null;
    productionInspectionPlan.value = null;
    preparationInspectionPlan.value = null;
    preparationInspectionSaved.value = false;
    preparationInspectionExact.value = true;
    adventureInspectionPlan.value = null;
    adventureInspectionSaved.value = false;
  }

  function inspectionOwner(activityId?: string) {
    const runId = game.value?.core.runId,
      sync = store.syncEpoch;
    return (owner: number | null) =>
      owner !== null &&
      alive &&
      navigation.owner() === owner &&
      game.value?.core.runId === runId &&
      store.syncEpoch === sync &&
      (activityId === undefined || store.activity?.id === activityId);
  }
  // The viewing intent belongs to the accepted trip, not to a timer or a later unrelated save.
  let arrivalIntent: {
    id: string;
    runId: string;
    navigation: number;
    syncEpoch: number;
    location: C.LocationId;
    arrive: () => void | Promise<void>;
  } | null = null;
  async function arrangeTravel(
    location: C.LocationId,
    arrive: () => void | Promise<void>,
  ): Promise<void> {
    if (!alive || !game.value || store.busy || !store.available) return;
    if (game.value.core.world.location === location) {
      await arrive();
      return;
    }
    if (pendingStoryError.value) {
      store.activityNotice = "请先重试或取消原安排；同步待核对时重新读取。";
      return;
    }
    if (store.activityRunning) {
      store.activityNotice = "当前活动进行中，请先暂停再行旅。";
      return;
    }
    arrivalIntent = null;
    const owner = navigation.advance(),
      sync = store.syncEpoch;
    await store.startPlannedActivity({
      kind: "travel",
      location,
      maxCycles: 1,
    });
    const a = store.activity;
    if (
      !alive ||
      store.error ||
      owner !== navigation.owner() ||
      store.syncEpoch !== sync ||
      a?.version !== 6 ||
      a.plan.kind !== "travel" ||
      a.plan.location !== location ||
      a.status !== "running"
    )
      return;
    arrivalIntent = {
      id: a.id,
      runId: a.runId,
      navigation: owner,
      syncEpoch: sync,
      location,
      arrive,
    };
  }
  watch(
    () =>
      [
        store.activity,
        game.value,
        store.error,
        store.activityOwned,
        store.busy,
        store.syncEpoch,
        store.activityPausing,
      ] as const,
    () => {
      const pending = arrivalIntent;
      if (!pending) return;
      const a = store.activity,
        g = game.value;
      if (
        store.activityPausing ||
        !g ||
        store.syncEpoch !== pending.syncEpoch ||
        g.core.runId !== pending.runId ||
        navigation.owner() !== pending.navigation ||
        a?.id !== pending.id ||
        !store.activityOwned ||
        store.error ||
        a.status === "paused"
      ) {
        arrivalIntent = null;
        return;
      }
      if (a.status !== "stopped" || store.busy) return;
      arrivalIntent = null;
      if (a.completedCycles === 1 && g.core.world.location === pending.location)
        void pending.arrive();
    },
    { flush: "post" },
  );
  async function travel(id: C.LocationId) {
    return arrangeTravel(id, () => {
      navigation.select(id === "cave" ? "修行" : "历练");
    });
  }
  async function inspectAdventure(enemy: string) {
    const owns = inspectionOwner();
    highlight.value = "";
    const owner = await navigation.open("explore");
    await nextTick();
    if (owns(owner)) highlight.value = "encounter-" + enemy;
  }
  async function startAdventure(plan: AdventurePlan) {
    navigation.dismissResume();
    adventureInspectionPlan.value = null;
    adventureInspectionSaved.value = false;
    const owner = navigation.owner();
    await store.startPlannedActivity(plan);
    if (
      alive &&
      !store.error &&
      owner === navigation.owner() &&
      plan.kind !== "travel"
    ) {
      navigation.select("修行");
    }
  }
  const defaultTraining: CultivationPlan = {
    kind: "cultivation",
    method: "natural",
    maxCycles: 50,
    until: "xp-cap",
    stoneBudget: 0,
    stoneReserve: 0,
  };
  const hubTrainingMethod = ref<"natural" | "assisted">("natural");
  watch(
    () => game.value?.core.runId,
    () => (hubTrainingMethod.value = "natural"),
  );
  async function startTraining(plan: CultivationPlan = defaultTraining) {
    if (pendingStoryError.value) return;
    navigation.dismissResume();
    trainingInspectionPlan.value = null;
    const from =
        navigation.current().singleScreen &&
        navigation.current().view === "cultivation",
      owner = navigation.owner(),
      owns = inspectionOwner(),
      previous = store.activity?.id,
      signature = JSON.stringify(plan),
      anchor = focus.capture();
    await store.startCultivation(plan);
    const a = store.activity,
      r = store.activityRuntime,
      g = game.value;
    if (
      !from ||
      !owns(owner) ||
      document.hidden ||
      store.error ||
      !store.saved ||
      !store.available ||
      store.busy ||
      store.activityPausing ||
      a?.version !== 1 ||
      a.status !== "running" ||
      a.id === previous ||
      !store.activityOwned ||
      a.runId !== g?.core.runId ||
      a.gameRevision !== g?.core.revision ||
      r?.id !== a.id ||
      r.generation !== a.generation ||
      JSON.stringify(a.plan) !== signature
    )
      return;
    hubTrainingMethod.value = a.plan.method;
    const current = inspectionOwner(a.id),
      next = navigation.select("修行");
    await nextTick();
    if (
      current(next) &&
      !document.hidden &&
      !store.error &&
      !store.activityPausing &&
      store.activity?.status === "running" &&
      store.activity.generation === a.generation &&
      store.activityRuntime?.id === a.id &&
      store.activityRuntime.generation === a.generation &&
      store.activityOwned &&
      focusStillOwned(anchor)
    )
      focus.target(
        document.querySelector<HTMLElement>(
          "[data-testid=cultivation-active-pause]",
        ),
      );
  }
  function startSource(plan: SourcePlan) {
    navigation.dismissResume();
    sourceInspectionPlan.value = null;
    return store.startPlannedActivity(plan);
  }
  async function viewActivityPlan() {
    const activity = store.activity;
    if (!activity) return;
    if (activity.version === 7) {
      navigation.inspectMilestone(activity);
      return;
    }
    const plan = structuredClone(activity.plan),
      owns = inspectionOwner(activity.id);
    if (isPreparationPlan(plan)) {
      await inspectPreparationPlan(plan, true);
      return;
    }
    if (
      (plan.kind === "battle" &&
        (!game.value?.battle ||
          game.value.battle.enemy !== plan.enemy ||
          (game.value.trial?.stage ?? null) !== plan.trialStage)) ||
      (plan.kind === "encounter" &&
        ruleContent.value.enemies[plan.enemy].location !==
          game.value?.core.world.location)
    ) {
      const owner = await navigation.open("activity");
      if (owns(owner)) activityPlanVisible.value = true;
      return;
    }
    const view =
      plan.kind === "cultivation"
        ? "cultivation"
        : plan.kind === "source"
          ? "explore"
          : plan.kind === "craft"
            ? "forge"
            : plan.kind === "forge"
              ? "relics"
              : isAdventurePlan(plan)
                ? plan.kind === "battle"
                  ? "home"
                  : "explore"
                : "cultivation";
    highlight.value = "";
    const owner = await navigation.open(view);
    if (!owns(owner)) return;
    if (plan.kind === "cultivation") trainingInspectionPlan.value = plan;
    else if (plan.kind === "source") {
      collectionTarget.value = plan.target;
      sourceInspectionPlan.value = plan;
      await nextTick();
      if (owns(owner)) highlight.value = "source-" + plan.sourceId;
    } else if (plan.kind === "craft" || plan.kind === "forge") {
      productionInspectionPlan.value = plan;
      await nextTick();
      if (owns(owner))
        highlight.value =
          plan.kind === "craft"
            ? "craft-" + plan.recipeId
            : "forge-" + plan.relicId;
    } else if (isAdventurePlan(plan)) {
      adventureInspectionPlan.value = plan;
      adventureInspectionSaved.value = true;
      if (plan.kind !== "battle")
        highlight.value =
          plan.kind === "travel"
            ? "travel-" + plan.location
            : "encounter-" + plan.enemy;
    }
  }
  function startProduction(plan: CraftPlan | ForgePlan | PreparationPlan) {
    if (isPreparationPlan(plan)) return startPreparation(plan);
    navigation.dismissResume();
    productionInspectionPlan.value = null;
    return store.startPlannedActivity(plan);
  }
  async function inspectProduction(
    action: Extract<Action, { type: "CRAFT" | "FORGE" }>,
  ) {
    const owns = inspectionOwner();
    highlight.value = "";
    const owner = await navigation.open(
      action.type === "CRAFT" ? "forge" : "relics",
    );
    await nextTick();
    if (owns(owner))
      highlight.value =
        action.type === "CRAFT"
          ? "craft-" + action.recipeId
          : "forge-" + action.relic;
  }
  async function moveProduction(plan: CraftPlan | ForgePlan) {
    const draft = structuredClone(plan),
      id =
        draft.kind === "craft"
          ? "craft-" + draft.recipeId
          : "forge-" + draft.relicId;
    return navigation.navigate(
      {
        location: "cave",
        tab: draft.kind === "craft" ? "行囊" : "修行",
        focusId: id,
      },
      () => {
        productionInspectionPlan.value = draft;
      },
    );
  }
  function startPreparation(plan: PreparationPlan) {
    navigation.dismissResume();
    preparationInspectionPlan.value = null;
    return store.startPlannedActivity(plan);
  }
  function preparationView(plan: PreparationPlan) {
    return plan.kind === "learn" || plan.kind === "study"
      ? "skills"
      : plan.kind === "buy" || plan.kind === "sell"
        ? "market"
        : "recovery";
  }
  async function inspectPreparationPlan(
    plan: PreparationPlan,
    saved = false,
    exact = true,
  ) {
    const owns = inspectionOwner(saved ? store.activity?.id : undefined),
      draft = structuredClone(plan);
    highlight.value = "";
    const owner = await navigation.open(preparationView(draft));
    if (!owns(owner)) return;
    preparationInspectionExact.value = exact;
    preparationInspectionPlan.value = draft;
    preparationInspectionSaved.value = saved;
    await nextTick();
    if (!owns(owner)) return;
    highlight.value =
      plan.kind === "learn"
        ? "learn-" + plan.skills[0]
        : plan.kind === "study"
          ? "study-manual"
          : plan.kind === "rest"
            ? "recovery-rest"
            : (plan.kind === "use" ? "recovery-" : "market-item-") + plan.item;
  }
  function inspectPreparation(action: Action) {
    let plan: PreparationPlan;
    if (action.type === "LEARN")
      plan = {
        kind: "learn",
        skills: [action.skill],
        maxCycles: 1,
        stoneBudget: ruleContent.value.skills[action.skill].price,
        stoneReserve: 0,
      };
    else if (action.type === "STUDY")
      plan = {
        kind: "study",
        manual: "jinghong",
        maxCycles: 1,
        stoneBudget: ruleContent.value.swordManual.price,
        stoneReserve: 0,
      };
    else if (action.type === "BUY")
      plan = {
        kind: "buy",
        item: action.item,
        maxCycles: action.quantity,
        until: "cycles",
        targetQuantity: null,
        stoneBudget:
          ruleContent.value.items[action.item].buy! * action.quantity,
        stoneReserve: 0,
      };
    else if (action.type === "SELL")
      plan = {
        kind: "sell",
        item: action.item,
        maxCycles: action.quantity,
        itemReserve: 0,
      };
    else if (
      action.type === "USE" &&
      (action.item === "healing_pill" || action.item === "spirit_pill")
    )
      plan = {
        kind: "use",
        item: action.item,
        maxCycles: 3,
        targetPercent: 100,
        itemReserve: 0,
      };
    else if (action.type === "REST")
      plan = { kind: "rest", maxCycles: 1, remainingMonthsReserve: 1 };
    else return;
    return inspectPreparationPlan(plan, false, false);
  }
  async function movePreparation(plan: PreparationPlan) {
    const draft = structuredClone(plan),
      location: C.LocationId =
        draft.kind === "learn" || draft.kind === "study"
          ? "sect"
          : draft.kind === "buy" || draft.kind === "sell"
            ? "market"
            : "cave";
    return arrangeTravel(location, () => inspectPreparationPlan(draft));
  }
  watch([() => store.activity?.id, () => store.syncEpoch], () => {
    trainingInspectionPlan.value = null;
    sourceInspectionPlan.value = null;
    productionInspectionPlan.value = null;
    preparationInspectionSaved.value = false;
    adventureInspectionSaved.value = false;
  });
  return {
    collectionTarget,
    highlight,
    trainingInspectionPlan,
    sourceInspectionPlan,
    productionInspectionPlan,
    preparationInspectionPlan,
    preparationInspectionSaved,
    preparationInspectionExact,
    adventureInspectionPlan,
    adventureInspectionSaved,
    activityPlanVisible,
    hubTrainingMethod,
    clearInspections,
    inspectionOwner,
    arrangeTravel,
    travel,
    inspectAdventure,
    startAdventure,
    startTraining,
    startSource,
    viewActivityPlan,
    startProduction,
    inspectProduction,
    moveProduction,
    startPreparation,
    inspectPreparationPlan,
    inspectPreparation,
    movePreparation,
  };
}
