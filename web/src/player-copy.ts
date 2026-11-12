/** Player-facing names. Protocol fields and persisted proof strings keep their original values. */
export const playerCopy = Object.freeze({
  receipt: '收获明细',
  battleHistory: '交锋记录',
  savedPlan: '本次打算',
  nextPlan: '下次选择 · 当前活动不变',
});

const messages = new Map<string, string>([
  ['已保存本次明确安排的一次行动，未自动接续其他活动', '此行已成，下一步由你决定'],
  ['拜访已保存，当前机缘等待玩家选择回应；未自动旅行或代选', '已与故人相见，接下来如何回应？'],
  ['渡劫入场已保存，问心等待玩家选择；未自动作答或出招', '已登台，静候你的问心之答'],
  ['问心答案已保存，当前天劫关卡等待另行安排战策；未自动出招', '心意已定，选择战策后迎战'],
]);

/** Exact known display messages only; unknown errors retain their full original wording. */
export function playerMessage(message: string): string {
  return messages.get(message) ?? message;
}
