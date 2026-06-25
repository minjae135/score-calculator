import { useState, useMemo } from 'react';
import {
  Calculator,
  Sun,
  Moon,
  ListTodo,
  Plus,
  Trash2,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { EvaluationItem, ResultIconName } from './types';
import { calculate } from './calculator';
import { useTheme } from './useTheme';
import './App.css';

// Default evaluation items matching the original app
const defaultItems: EvaluationItem[] = [
  { id: '1', name: '중간고사', weight: 30, max: 100, score: 85 },
  { id: '2', name: '기말고사', weight: 35, max: 100, score: null },
  { id: '3', name: '수행평가 (과제)', weight: 20, max: 100, score: 95 },
  { id: '4', name: '수행평가 (발표)', weight: 15, max: 100, score: 90 },
];

// Preset target score options
const presets = [
  { label: 'Grade A (90점)', value: 90 },
  { label: 'Grade B (80점)', value: 80 },
  { label: 'Grade C (70점)', value: 70 },
  { label: 'Grade D (60점)', value: 60 },
];

// Map icon name strings to Lucide React components
const iconMap: Record<ResultIconName, React.ComponentType<{ className?: string }>> = {
  'help-circle': HelpCircle,
  'check-circle-2': CheckCircle2,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  sparkles: Sparkles,
};

function App() {
  const { theme, toggleTheme } = useTheme();
  const [items, setItems] = useState<EvaluationItem[]>(defaultItems);
  const [targetScore, setTargetScore] = useState<number>(90);

  // Derived: total weight across all items
  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + item.weight, 0),
    [items],
  );

  // Derived: calculation result recomputed whenever items or target changes
  const result = useMemo(
    () => calculate(items, targetScore),
    [items, targetScore],
  );

  // Determine which items are empty (for highlighting the target row)
  const emptyItemIds = useMemo(() => {
    const empties = items.filter(
      (item) => item.score === null || isNaN(item.score as number),
    );
    return empties.length === 1 ? [empties[0].id] : [];
  }, [items]);

  // --- Item CRUD handlers ---

  const updateItem = (
    id: string,
    field: keyof EvaluationItem,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        switch (field) {
          case 'name':
            return { ...item, name: value };
          case 'weight':
            return { ...item, weight: parseFloat(value) || 0 };
          case 'max':
            return { ...item, max: parseFloat(value) || 100 };
          case 'score':
            return {
              ...item,
              score: value.trim() === '' ? null : parseFloat(value),
            };
          default:
            return item;
        }
      }),
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: `평가 항목 ${prev.length + 1}`,
        weight: 10,
        max: 100,
        score: null,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      alert('최소 하나의 평가 항목은 존재해야 합니다.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Weight status bar state
  const weightBarWidth = `${Math.min(totalWeight, 100)}%`;
  const weightExcess = totalWeight > 100;
  let weightWarningText: string;
  let weightWarningClass: string;
  if (totalWeight > 100) {
    weightWarningText = `반영 비율의 합(${totalWeight}%)이 100%를 초과합니다.`;
    weightWarningClass = 'warning-text error';
  } else if (totalWeight < 100) {
    weightWarningText = `반영 비율의 합(${totalWeight}%)이 100%보다 부족합니다.`;
    weightWarningClass = 'warning-text';
  } else {
    weightWarningText = '반영 비율의 합이 100%로 완벽합니다!';
    weightWarningClass = 'warning-text success';
  }

  // Resolve the result icon component
  const ResultIcon = iconMap[result.iconName];

  return (
    <>
      {/* Decorative background blobs */}
      <div className="background-decor">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <Calculator />
          <h1>
            Target <span>Score</span>
          </h1>
        </div>
        <div className="header-actions">
          <button
            id="theme-toggle"
            className="icon-btn"
            aria-label="테마 전환"
            title="화면 테마 변경"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="app-container">
        {/* Left Column: Inputs */}
        <section className="card input-section">
          <div className="card-header">
            <div className="card-title">
              <ListTodo />
              <h2>평가 항목 및 반영 비율</h2>
            </div>
            <button
              id="add-item-btn"
              className="btn btn-secondary"
              onClick={addItem}
            >
              <Plus /> 항목 추가
            </button>
          </div>

          <p className="section-desc">
            각 평가 항목의 반영 비율(%)과 만점 기준을 적고, 획득한 점수를
            입력하세요. <br />
            <strong>
              목표 점수를 구하려는 항목 하나만 빈칸(또는 비워둠)으로
              남겨두세요.
            </strong>
          </p>

          <form id="calculator-form" onSubmit={(e) => e.preventDefault()}>
            <div id="evaluation-items-list" className="items-list">
              {items.map((item) => {
                const isTarget = emptyItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`item-row${isTarget ? ' is-target' : ''}`}
                    data-id={item.id}
                  >
                    <div className="input-group">
                      <label>평가 항목 명칭</label>
                      <input
                        type="text"
                        className="item-name"
                        value={item.name}
                        placeholder="예) 중간고사"
                        onChange={(e) =>
                          updateItem(item.id, 'name', e.target.value)
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>반영 비율 (%)</label>
                      <input
                        type="number"
                        className="item-weight"
                        value={item.weight}
                        min={0}
                        max={100}
                        placeholder="0"
                        onChange={(e) =>
                          updateItem(item.id, 'weight', e.target.value)
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>만점 기준 (점)</label>
                      <input
                        type="number"
                        className="item-max"
                        value={item.max}
                        min={1}
                        placeholder="100"
                        onChange={(e) =>
                          updateItem(item.id, 'max', e.target.value)
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>획득 점수</label>
                      <input
                        type="number"
                        className={`item-score${isTarget ? ' empty-highlight' : ''}`}
                        value={item.score ?? ''}
                        step="0.01"
                        placeholder="X (비워둠)"
                        onChange={(e) =>
                          updateItem(item.id, 'score', e.target.value)
                        }
                      />
                    </div>
                    <div
                      className="input-group"
                      style={{
                        justifyContent: 'flex-end',
                        paddingTop: '15px',
                      }}
                    >
                      <button
                        type="button"
                        className="btn-icon-only btn-danger delete-item-btn"
                        title="항목 삭제"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weight status bar */}
            <div className="weight-status-container">
              <div className="weight-status-bar-bg">
                <div
                  id="weight-progress"
                  className={`weight-status-bar-fill${weightExcess ? ' excess' : ''}`}
                  style={{ width: weightBarWidth }}
                />
              </div>
              <div className="weight-status-text">
                <span>
                  반영 비율 합계:{' '}
                  <strong id="total-weight-display">{totalWeight}</strong>%
                </span>
                <span id="weight-warning-msg" className={weightWarningClass}>
                  {weightWarningText}
                </span>
              </div>
            </div>
          </form>
        </section>

        {/* Right Column: Results & Simulation */}
        <section className="card result-section">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp />
              <h2>목표 시뮬레이션</h2>
            </div>
          </div>

          {/* Target Score Input Card */}
          <div className="target-card">
            <div className="target-input-row">
              <label htmlFor="target-score">목표 최종 점수</label>
              <div className="target-input-wrapper">
                <input
                  type="number"
                  id="target-score"
                  min={0}
                  max={100}
                  step={0.1}
                  value={targetScore}
                  onChange={(e) =>
                    setTargetScore(parseFloat(e.target.value) || 0)
                  }
                />
                <span className="unit">점</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="presets-row">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`preset-btn${targetScore === preset.value ? ' active' : ''}`}
                  onClick={() => setTargetScore(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Result Output */}
          <div
            id="result-output-card"
            className={`result-card state-${result.state}`}
          >
            <div className="result-status-icon">
              <ResultIcon />
            </div>
            <div className="result-details">
              <h3 id="result-title">{result.title}</h3>
              <p
                id="result-message"
                dangerouslySetInnerHTML={{ __html: result.message }}
              />
            </div>
          </div>

          {/* Visual Progress Visualization */}
          <div className="visualizer-container">
            <h3>점수 구성 및 확보 현황</h3>

            {/* Horizontal Stacked Bar */}
            <div className="stacked-bar">
              <div
                id="bar-secured"
                className="bar-segment bar-secured"
                style={{ width: `${result.barSecuredPct}%` }}
                data-tooltip={result.barSecuredTooltip}
              />
              <div
                id="bar-required"
                className="bar-segment bar-required"
                style={{ width: `${result.barRequiredPct}%` }}
                data-tooltip={result.barRequiredTooltip}
              />
              <div
                id="bar-remaining"
                className="bar-segment bar-remaining"
                style={{ width: `${result.barRemainingPct}%` }}
                data-tooltip={result.barRemainingTooltip}
              />
            </div>

            {/* Legend */}
            <div className="legend-row">
              <div className="legend-item">
                <span className="legend-color secured" />
                <span className="legend-label">
                  이미 확보한 점수:{' '}
                  <strong id="secured-points-display">
                    {result.securedScore}
                  </strong>
                  점
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-color required" />
                <span className="legend-label">
                  달성에 필요한 점수 기여도:{' '}
                  <strong id="required-contrib-display">
                    {result.requiredContrib}
                  </strong>
                  점
                </span>
              </div>
              <div className="legend-item" id="max-achievable-container">
                <span className="legend-color max-achievable" />
                <span className="legend-label">
                  최대 달성 가능 점수:{' '}
                  <strong id="max-possible-display">
                    {result.maxPossibleScore}
                  </strong>
                  점
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>&copy; 2026 성적 커트라인 시뮬레이터. GitHub Pages 호스팅 지원.</p>
        <p>수행평가와 시험 점수를 자유롭게 입력하고 시뮬레이션하세요.</p>
      </footer>
    </>
  );
}

export default App;
