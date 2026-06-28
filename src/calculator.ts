import type { EvaluationItem, CalculationResult, MessagePart } from './types';

// Round to 2 decimal places
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function text(value: string): MessagePart {
  return { type: 'text', value };
}

function strong(value: string | number): MessagePart {
  return { type: 'strong', value: String(value) };
}

function br(): MessagePart {
  return { type: 'break' };
}

function summarizeInvalidInputs(items: EvaluationItem[], targetScore: number): string[] {
  const issues: string[] = [];

  items.forEach((item) => {
    if (item.weight < 0) {
      issues.push(`[${item.name}] 반영 비율이 음수입니다 (${round2(item.weight)}%)`);
    }

    if (item.max <= 0) {
      issues.push(`[${item.name}] 만점 기준이 0 이하입니다 (${round2(item.max)}점)`);
    }

    if (item.score !== null) {
      if (item.score < 0) {
        issues.push(`[${item.name}] 획득 점수가 음수입니다 (${round2(item.score)}점)`);
      } else if (item.max > 0 && item.score > item.max) {
        issues.push(
          `[${item.name}] 획득 점수가 만점을 초과했습니다 (${round2(item.score)} / ${round2(item.max)})`,
        );
      }
    }
  });

  if (targetScore < 0) {
    issues.push(`목표 최종 점수가 음수입니다 (${round2(targetScore)}점)`);
  } else if (targetScore > 100) {
    issues.push(`목표 최종 점수가 100점을 초과했습니다 (${round2(targetScore)}점)`);
  }

  return issues;
}

/**
 * Core calculation engine.
 * Determines the required score for a single empty evaluation item
 * to meet the target score, or reports the overall status.
 */
export function calculate(
  items: EvaluationItem[],
  targetScore: number,
): CalculationResult {
  const invalidIssues = summarizeInvalidInputs(items, targetScore);
  if (invalidIssues.length > 0) {
    const previewIssues = invalidIssues.slice(0, 3);
    const hiddenIssueCount = invalidIssues.length - previewIssues.length;

    return {
      state: 'easter',
      title: '성적 계산기 비상 탈출 모드',
      message: [
        text('점수계가 현실을 거부했습니다. 아래 입력부터 정상 범위를 벗어났습니다.'),
        br(),
        strong(`- ${previewIssues.join(' / - ')}`),
        ...(hiddenIssueCount > 0
          ? [br(), text(`외 ${hiddenIssueCount}개 항목도 함께 폭주 중입니다.`)]
          : []),
        br(),
        text('이스터에그를 발견했습니다. 값을 원래 범위로 돌리면 다시 진지하게 계산합니다.'),
      ],
      iconName: 'sparkles',
      securedScore: 0,
      requiredContrib: 0,
      maxPossibleScore: 0,
      barSecuredPct: 0,
      barRequiredPct: 0,
      barRemainingPct: 100,
      barSecuredTooltip: '비정상 입력 감지: 일반 계산을 일시 중단했습니다.',
      barRequiredTooltip: '이스터에그 활성화 상태입니다.',
      barRemainingTooltip: '입력값을 정상 범위로 되돌리면 계산이 재개됩니다.',
    };
  }

  // Identify items with missing scores
  const emptyItems = items.filter(
    (item) => item.score === null || isNaN(item.score),
  );
  const countEmpty = emptyItems.length;

  // Compute secured score contribution from filled items
  let securedScore = 0;
  items.forEach((item) => {
    if (item.score !== null && !isNaN(item.score)) {
      securedScore += (item.score / item.max) * item.weight;
    }
  });

  const targetScoreRounded = Math.round(targetScore);

  let barSecuredPct: number;
  let barRequiredPct: number;
  let barRemainingPct: number;
  let maxPossibleScore: number;
  let state: CalculationResult['state'];
  let title: string;
  let message: MessagePart[];
  let iconName: CalculationResult['iconName'];
  let requiredContrib: number;
  let barRequiredTooltip: string;

  if (countEmpty === 0) {
    // ===== Case A: All items filled =====
    const totalScore = securedScore;
    const totalScoreRounded = Math.round(totalScore);
    requiredContrib = 0;
    maxPossibleScore = totalScore;

    barSecuredPct = Math.min((securedScore / 100) * 100, 100);
    barRequiredPct = 0;
    barRemainingPct = 100 - barSecuredPct;

    if (totalScoreRounded >= targetScoreRounded) {
      state = 'success';
      title = '목표 달성 완료!';
      message = [
        text('모든 항목의 점수가 입력되었습니다. 최종 점수는 '),
        strong(`${round2(totalScore)}점`),
        text(' (반올림: '),
        strong(`${totalScoreRounded}점`),
        text(`)으로, 목표 점수(${targetScoreRounded}점)를 달성했습니다!`),
      ];
      iconName = 'check-circle-2';
    } else if (totalScoreRounded >= targetScoreRounded - 1) {
      state = 'warning';
      title = '아슬아슬하게 달성';
      message = [
        text('최종 점수 '),
        strong(`${round2(totalScore)}점`),
        text(' (반올림: '),
        strong(`${totalScoreRounded}점`),
        text(`)으로, 목표 점수(${targetScoreRounded}점)에 근접하지만 도달하지 못했습니다.`),
      ];
      iconName = 'alert-circle';
    } else {
      state = 'danger';
      title = '목표 미달';
      message = [
        text('최종 점수 '),
        strong(`${round2(totalScore)}점`),
        text(' (반올림: '),
        strong(`${totalScoreRounded}점`),
        text(`)으로, 목표 점수(${targetScoreRounded}점)에 미치지 못합니다. (차이: ${targetScoreRounded - totalScoreRounded}점)`),
      ];
      iconName = 'alert-triangle';
    }

    barRequiredTooltip = '필요한 성적 기여도: 0.00점';
  } else if (countEmpty === 1) {
    // ===== Case B: Exactly 1 empty item =====
    const targetItem = emptyItems[0];
    const targetWeight = targetItem.weight;
    const targetMax = targetItem.max;

    // Minimum raw score that rounds up to the target
    const effectiveTarget = targetScoreRounded - 0.5;
    const neededContrib = effectiveTarget - securedScore;

    maxPossibleScore = securedScore + targetWeight;
    const maxPossibleScoreRounded = Math.round(maxPossibleScore);

    if (neededContrib <= 0) {
      // B1: Already achieved target
      requiredContrib = 0;
      barSecuredPct = Math.min((securedScore / 100) * 100, 100);
      barRequiredPct = 0;
      barRemainingPct = 100 - barSecuredPct;

      state = 'success';
      title = '이미 목표 달성!';
      message = [
        text('현재 확보한 점수만으로 '),
        strong(`${round2(securedScore)}점`),
        text(' (반올림: '),
        strong(`${Math.round(securedScore)}점`),
        text(`)이며, 이미 목표 점수(${targetScoreRounded}점)를 달성한 상태입니다. `),
        br(),
        strong(`[${targetItem.name}]`),
        text(' 항목에서 '),
        strong('0점'),
        text('을 받아도 목표 달성이 가능합니다.'),
      ];
      iconName = 'sparkles';
    } else if (neededContrib > targetWeight) {
      // B2: Impossible to reach target
      requiredContrib = targetWeight;
      barSecuredPct = Math.min((securedScore / 100) * 100, 100);
      barRequiredPct = Math.min(
        (targetWeight / 100) * 100,
        100 - barSecuredPct,
      );
      barRemainingPct = 100 - barSecuredPct - barRequiredPct;

      const gap = round2(effectiveTarget - maxPossibleScore);

      state = 'danger';
      title = '목표 달성 불가능';
      message = [
        text('아쉽게도 '),
        strong(`[${targetItem.name}]`),
        text(` 항목에서 만점(기여도 ${targetWeight}점)을 획득해도 최종 점수가 최대 `),
        strong(`${round2(maxPossibleScore)}점`),
        text(' (반올림: '),
        strong(`${maxPossibleScoreRounded}점`),
        text(`)에 그쳐, 목표 점수(${targetScoreRounded}점)에 도달할 수 없습니다. (반올림 기준 부족한 점수 기여도: 최소 ${gap}점)`),
      ];
      iconName = 'alert-triangle';
    } else {
      // B3: Achievable — calculate required score
      const requiredScore = (neededContrib / targetWeight) * targetMax;
      const finalRequiredScore = round2(requiredScore);
      requiredContrib = neededContrib;

      barSecuredPct = Math.min((securedScore / 100) * 100, 100);
      barRequiredPct = Math.min(
        (neededContrib / 100) * 100,
        100 - barSecuredPct,
      );
      barRemainingPct = 100 - barSecuredPct - barRequiredPct;

      const ratio = requiredScore / targetMax;
      const projectedScore = securedScore + neededContrib;

      if (ratio >= 0.9) {
        state = 'warning';
        title = '목표 달성 고난도';
        message = [
          text('목표 점수 달성을 위해 '),
          strong(`[${targetItem.name}]`),
          text(' 항목에서 만점에 가까운 '),
          strong(`${finalRequiredScore}점`),
          text(` 이상을 받아야 합니다! (만점: ${targetMax}점 중 약 ${Math.round(ratio * 100)}% 득점 필요. 획득 시 최종 점수 ${round2(projectedScore)}점 → 반올림 ${targetScoreRounded}점)`),
        ];
        iconName = 'alert-circle';
      } else {
        state = 'success';
        title = '목표 달성 가능!';
        message = [
          text('목표 점수 달성을 위해 '),
          strong(`[${targetItem.name}]`),
          text(' 항목에서 '),
          strong(`${finalRequiredScore}점`),
          text(` 이상을 획득하면 됩니다. (만점: ${targetMax}점. 획득 시 최종 점수 ${round2(projectedScore)}점 → 반올림 ${targetScoreRounded}점)`),
        ];
        iconName = 'check-circle-2';
      }
    }

    // Build required tooltip for Case B
    if (barRequiredPct > 0) {
      const targetItem = emptyItems[0];
      barRequiredTooltip = `필요한 기여도: ${round2(effectiveTarget - securedScore)}점 (즉, [${targetItem.name}] ${round2(((effectiveTarget - securedScore) / targetItem.weight) * targetItem.max)}점 필요)`;
    } else {
      barRequiredTooltip = '필요한 성적 기여도: 0.00점';
    }
  } else {
    // ===== Case C: Multiple empty items =====
    requiredContrib = 0;
    const emptyWeights = emptyItems.reduce((sum, item) => sum + item.weight, 0);
    maxPossibleScore = securedScore + emptyWeights;

    barSecuredPct = Math.min((securedScore / 100) * 100, 100);
    barRequiredPct = 0;
    barRemainingPct = 100 - barSecuredPct;

    state = 'neutral';
    title = '입력 대기 중';
    message = [
      text('현재 비어있는 항목이 '),
      strong(`${countEmpty}개`),
      text(' 있습니다. 역산을 하려면 점수를 모르는 '),
      strong('단 1개의 항목'),
      text('만 비워두세요.'),
    ];
    iconName = 'help-circle';
    barRequiredTooltip = '필요한 성적 기여도: 0.00점';
  }

  // Build common tooltips
  const barSecuredTooltip = `확보한 성적 기여도: ${round2(securedScore)}점 (반올림: ${Math.round(securedScore)}점)`;
  const barRemainingTooltip = `남아있는 비율 기여도: ${round2(100 - securedScore - (countEmpty === 1 ? Math.max(0, Math.round(targetScore) - 0.5 - securedScore) : 0))}점`;

  return {
    state,
    title,
    message,
    iconName,
    securedScore: round2(securedScore),
    requiredContrib: round2(requiredContrib),
    maxPossibleScore: round2(maxPossibleScore),
    barSecuredPct,
    barRequiredPct,
    barRemainingPct,
    barSecuredTooltip,
    barRequiredTooltip,
    barRemainingTooltip,
  };
}
