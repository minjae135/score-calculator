import { useState, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
import {
  Calculator,
  Sun,
  Moon,
  ListTodo,
  ClipboardList,
  BookOpen,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { EvaluationItem, MessagePart, ResultIconName } from './types';
import { calculate } from './calculator';
import { useTheme } from './useTheme';
import './App.css';

// Default evaluation items matching the original app
const defaultItems: EvaluationItem[] = [
  { id: '1', name: '중간고사', weight: 30, max: 100, score: null },
  { id: '2', name: '기말고사', weight: 30, max: 100, score: null },
  { id: '3', name: '수행평가 1', weight: 20, max: 100, score: null },
  { id: '4', name: '수행평가 2', weight: 20, max: 100, score: null },
];

type ItemPresetId = 'default' | 'single-exam' | 'arts';

interface SavedSubject {
  id: string;
  name: string;
  items: EvaluationItem[];
  targetScore: number;
  activeItemPresetId: ItemPresetId;
}

interface SavedSubjectsFile {
  app: 'score-calculator';
  version: 1;
  exportedAt: string;
  subjects: SavedSubject[];
}

const savedSubjectsStorageKey = 'score-calculator:saved-subjects';
const savedSubjectsFileName = 'score-calculator-subjects.json';

const itemPresets: {
  id: ItemPresetId;
  label: string;
  description: string;
  items: EvaluationItem[];
}[] = [
  {
    id: 'default',
    label: '기본',
    description: '중간 30%, 기말 30%, 수행 20% + 20%',
    items: defaultItems,
  },
  {
    id: 'single-exam',
    label: '고사 1회',
    description: '기말 40%, 수행 30% + 30%',
    items: [
      { id: 'single-final', name: '기말고사', weight: 40, max: 100, score: null },
      {
        id: 'single-task-1',
        name: '수행평가 1',
        weight: 30,
        max: 100,
        score: null,
      },
      {
        id: 'single-task-2',
        name: '수행평가 2',
        weight: 30,
        max: 100,
        score: null,
      },
    ],
  },
  {
    id: 'arts',
    label: '예체능',
    description: '수행 50% + 50%',
    items: [
      {
        id: 'arts-task-1',
        name: '수행평가 1',
        weight: 50,
        max: 100,
        score: null,
      },
      {
        id: 'arts-task-2',
        name: '수행평가 2',
        weight: 50,
        max: 100,
        score: null,
      },
    ],
  },
];

// Preset target score options
const standardTargetPresets = [
  { label: 'Grade A (90점)', value: 90 },
  { label: 'Grade B (80점)', value: 80 },
  { label: 'Grade C (70점)', value: 70 },
  { label: 'Grade D (60점)', value: 60 },
];

const artsTargetPresets = [
  { label: 'Grade A (80점)', value: 80 },
  { label: 'Grade B (60점)', value: 60 },
];

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isItemPresetId(value: unknown): value is ItemPresetId {
  return value === 'default' || value === 'single-exam' || value === 'arts';
}

function normalizeSavedSubject(value: unknown): SavedSubject | null {
  if (!isRecord(value)) return null;

  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems
    .map((item): EvaluationItem | null => {
      if (!isRecord(item)) return null;
      const score = item.score === null ? null : Number(item.score);
      return {
        id: String(item.id ?? Date.now()),
        name: String(item.name ?? '평가 항목'),
        weight: Number(item.weight ?? 0),
        max: Number(item.max ?? 100),
        score: score !== null && Number.isFinite(score) ? score : null,
      };
    })
    .filter((item): item is EvaluationItem => item !== null);

  if (items.length === 0) return null;

  return {
    id: String(value.id ?? Date.now()),
    name: String(value.name ?? '가져온 과목').trim() || '가져온 과목',
    items,
    targetScore: Number(value.targetScore ?? 90),
    activeItemPresetId: isItemPresetId(value.activeItemPresetId)
      ? value.activeItemPresetId
      : 'default',
  };
}

function parseSavedSubjectsPayload(payload: unknown): SavedSubject[] {
  const rawSubjects =
    isRecord(payload) && Array.isArray(payload.subjects)
      ? payload.subjects
      : Array.isArray(payload)
        ? payload
        : [];

  return rawSubjects
    .map(normalizeSavedSubject)
    .filter((subject): subject is SavedSubject => subject !== null);
}

function getUniqueSubjectName(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name)) return name;

  let index = 2;
  let nextName = `${name} (가져오기)`;
  while (existingNames.has(nextName)) {
    nextName = `${name} (가져오기 ${index})`;
    index += 1;
  }

  return nextName;
}

function mergeSavedSubjects(
  currentSubjects: SavedSubject[],
  importedSubjects: SavedSubject[],
): SavedSubject[] {
  const usedIds = new Set(currentSubjects.map((subject) => subject.id));
  const usedNames = new Set(currentSubjects.map((subject) => subject.name));

  const nextImportedSubjects = importedSubjects.map((subject) => {
    const name = getUniqueSubjectName(subject.name, usedNames);
    const id = usedIds.has(subject.id)
      ? `${subject.id}-imported-${Date.now()}-${usedIds.size}`
      : subject.id;

    usedNames.add(name);
    usedIds.add(id);

    return {
      ...subject,
      id,
      name,
    };
  });

  return [...currentSubjects, ...nextImportedSubjects];
}

function loadSavedSubjects(): SavedSubject[] {
  try {
    const raw = localStorage.getItem(savedSubjectsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parseSavedSubjectsPayload(parsed);
  } catch {
    return [];
  }
}

function persistSavedSubjects(subjects: SavedSubject[]) {
  localStorage.setItem(savedSubjectsStorageKey, JSON.stringify(subjects));
}

// Map icon name strings to Lucide React components
const iconMap: Record<ResultIconName, React.ComponentType<{ className?: string }>> = {
  'help-circle': HelpCircle,
  'check-circle-2': CheckCircle2,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  sparkles: Sparkles,
};

function renderMessagePart(part: MessagePart, index: number) {
  switch (part.type) {
    case 'strong':
      return <strong key={index}>{part.value}</strong>;
    case 'break':
      return <br key={index} />;
    case 'text':
      return <span key={index}>{part.value}</span>;
    default:
      return null;
  }
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EvaluationItem[]>(defaultItems);
  const [targetScore, setTargetScore] = useState<number>(90);
  const [activeItemPresetId, setActiveItemPresetId] =
    useState<ItemPresetId>('default');
  const [savedSubjects, setSavedSubjects] =
    useState<SavedSubject[]>(loadSavedSubjects);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [pendingImportedSubjects, setPendingImportedSubjects] = useState<
    SavedSubject[] | null
  >(null);
  const [importNotice, setImportNotice] = useState<string>('');

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
            return {
              ...item,
              weight: parseNumber(value, 0),
            };
          case 'max': {
            return {
              ...item,
              max: parseNumber(value, 100),
            };
          }
          case 'score':
            return {
              ...item,
              score:
                value.trim() === ''
                  ? null
                  : parseNumber(value, 0),
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

  const applyItemPreset = (preset: (typeof itemPresets)[number]) => {
    setActiveItemPresetId(preset.id);
    setTargetScore(preset.id === 'arts' ? 80 : 90);
    setSelectedSubjectId('');
    setItems(
      preset.items.map((item) => ({
        ...item,
        id: `${item.id}-${Date.now()}`,
      })),
    );
  };

  const saveSubject = () => {
    const trimmedName = subjectName.trim();
    if (!trimmedName) {
      alert('저장할 과목명을 입력하세요.');
      return;
    }

    const selectedSubject = selectedSubjectId
      ? savedSubjects.find((subject) => subject.id === selectedSubjectId)
      : undefined;
    const duplicateNameSubject = savedSubjects.find(
      (subject) =>
        subject.name === trimmedName && subject.id !== selectedSubjectId,
    );

    if (!selectedSubject && duplicateNameSubject) {
      alert(
        '같은 이름의 과목이 이미 있습니다. 기존 과목을 수정하려면 해당 과목을 선택하고, 새 과목이면 다른 이름으로 저장하세요.',
      );
      return;
    }

    const subjectToSave: SavedSubject = {
      id: selectedSubject?.id ?? Date.now().toString(),
      name: trimmedName,
      items,
      targetScore,
      activeItemPresetId,
    };
    const nextSubjects = selectedSubject
      ? savedSubjects.map((subject) =>
          subject.id === selectedSubject.id ? subjectToSave : subject,
        )
      : [...savedSubjects, subjectToSave];

    setSavedSubjects(nextSubjects);
    setSelectedSubjectId(subjectToSave.id);
    persistSavedSubjects(nextSubjects);
  };

  const startNewSubject = () => {
    setSelectedSubjectId('');
    setSubjectName('');
  };

  const applyImportedSubjects = (
    importedSubjects: SavedSubject[],
    mode: 'replace' | 'merge',
  ) => {
    const nextSubjects =
      mode === 'replace'
        ? mergeSavedSubjects([], importedSubjects)
        : mergeSavedSubjects(savedSubjects, importedSubjects);

    setSavedSubjects(nextSubjects);
    setSelectedSubjectId('');
    setSubjectName('');
    setPendingImportedSubjects(null);
    setImportNotice(
      `${importedSubjects.length}개 과목을 ${mode === 'replace' ? '불러왔습니다' : '합쳤습니다'}.`,
    );
    persistSavedSubjects(nextSubjects);
  };

  const exportSubjectsToFile = () => {
    if (savedSubjects.length === 0) {
      alert('내보낼 저장 과목이 없습니다.');
      return;
    }

    const payload: SavedSubjectsFile = {
      app: 'score-calculator',
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: savedSubjects,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = savedSubjectsFileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openImportFileDialog = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const importedSubjects = parseSavedSubjectsPayload(JSON.parse(text));

      if (importedSubjects.length === 0) {
        alert('불러올 수 있는 과목 데이터가 없습니다.');
        return;
      }

      setImportNotice('');
      if (savedSubjects.length > 0) {
        setPendingImportedSubjects(importedSubjects);
        return;
      }

      applyImportedSubjects(importedSubjects, 'replace');
    } catch {
      alert('JSON 파일을 읽지 못했습니다. 내보낸 과목 파일인지 확인하세요.');
    }
  };

  const loadSubject = (id: string) => {
    setSelectedSubjectId(id);
    const subject = savedSubjects.find((item) => item.id === id);
    if (!subject) {
      setSubjectName('');
      return;
    }

    setSubjectName(subject.name);
    setItems(subject.items);
    setTargetScore(subject.targetScore);
    setActiveItemPresetId(subject.activeItemPresetId);
  };

  const deleteSubject = () => {
    if (!selectedSubjectId) return;
    const nextSubjects = savedSubjects.filter(
      (subject) => subject.id !== selectedSubjectId,
    );
    setSavedSubjects(nextSubjects);
    setSelectedSubjectId('');
    setSubjectName('');
    persistSavedSubjects(nextSubjects);
  };

  // Weight status bar state
  const weightBarWidth = `${Math.max(0, Math.min(totalWeight, 100))}%`;
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
  const currentTargetPresets =
    activeItemPresetId === 'arts' ? artsTargetPresets : standardTargetPresets;

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
            <div className="subject-manager">
              <div className="subject-manager-label">
                <BookOpen />
                <span>과목 저장</span>
              </div>
              <div className="subject-controls">
                <label className="subject-field">
                  <span>저장된 과목</span>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => loadSubject(e.target.value)}
                  >
                    <option value="">과목 선택</option>
                    {savedSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="subject-field">
                  <span>과목명</span>
                  <input
                    type="text"
                    value={subjectName}
                    placeholder="예) 수학, 체육"
                    onChange={(e) => setSubjectName(e.target.value)}
                  />
                </label>
                <div className="subject-actions">
                  <button
                    type="button"
                    className="btn btn-secondary subject-new-btn"
                    onClick={startNewSubject}
                  >
                    <Plus /> 과목 추가
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary subject-save-btn"
                    onClick={saveSubject}
                  >
                    <Save /> 저장
                  </button>
                  <button
                    type="button"
                    className="btn-icon-only btn-danger subject-delete-btn"
                    title="저장된 과목 삭제"
                    disabled={!selectedSubjectId}
                    onClick={deleteSubject}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
              <div className="subject-file-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={exportSubjectsToFile}
                >
                  <Download /> 파일 저장
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openImportFileDialog}
                >
                  <Upload /> 파일 불러오기
                </button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="visually-hidden"
                  onChange={handleImportFile}
                />
              </div>
              {pendingImportedSubjects && (
                <div className="subject-import-choice">
                  <span>
                    {pendingImportedSubjects.length}개 과목을 어떻게
                    불러올까요?
                  </span>
                  <div className="subject-import-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        applyImportedSubjects(pendingImportedSubjects, 'replace')
                      }
                    >
                      덮어쓰기
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        applyImportedSubjects(pendingImportedSubjects, 'merge')
                      }
                    >
                      합치기
                    </button>
                    <button
                      type="button"
                      className="btn-icon-only"
                      title="불러오기 취소"
                      onClick={() => setPendingImportedSubjects(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              {importNotice && (
                <p className="subject-import-notice">{importNotice}</p>
              )}
            </div>

            <div className="item-presets">
              <div className="item-presets-label">
                <ClipboardList />
                <span>항목 프리셋</span>
              </div>
              <div className="item-presets-row">
                {itemPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`item-preset-btn${activeItemPresetId === preset.id ? ' active' : ''}`}
                    title={preset.description}
                    onClick={() => applyItemPreset(preset)}
                  >
                    <span>{preset.label}</span>
                    <small>{preset.description}</small>
                  </button>
                ))}
              </div>
            </div>

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
                        value={item.weight === 0 ? '' : item.weight}
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
                  step={0.1}
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseNumber(e.target.value, 0))}
                />
                <span className="unit">점</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="presets-row">
              {currentTargetPresets.map((preset) => (
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
              <p id="result-message">
                {result.message.map(renderMessagePart)}
              </p>
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
