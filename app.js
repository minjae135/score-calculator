// noinspection JSUnresolvedVariable
const lucide = window.lucide;

// --- Initial State and Configuration ---
const defaultItems = [
    { id: '1', name: '중간고사', weight: 30, max: 100, score: 85 },
    { id: '2', name: '기말고사', weight: 35, max: 100, score: null }, // Target to calculate
    { id: '3', name: '수행평가 (과제)', weight: 20, max: 100, score: 95 },
    { id: '4', name: '수행평가 (발표)', weight: 15, max: 100, score: 90 }
];

let items = [...defaultItems];

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
    // Icons are updated via CSS visibility, but we can log or trigger transitions
}

// --- DOM Elements ---
const itemsListContainer = document.getElementById('evaluation-items-list');
const addItemBtn = document.getElementById('add-item-btn');
const targetScoreInput = document.getElementById('target-score');
const totalWeightDisplay = document.getElementById('total-weight-display');
const weightProgress = document.getElementById('weight-progress');
const weightWarningMsg = document.getElementById('weight-warning-msg');
const themeToggleBtn = document.getElementById('theme-toggle');

// Result elements
const resultCard = document.getElementById('result-output-card');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const statusIconElement = document.getElementById('status-icon-element');

// Visualizer elements
const barSecured = document.getElementById('bar-secured');
const barRequired = document.getElementById('bar-required');
const barRemaining = document.getElementById('bar-remaining');
const securedPointsDisplay = document.getElementById('secured-points-display');
const requiredContribDisplay = document.getElementById('required-contrib-display');
const maxPossibleDisplay = document.getElementById('max-possible-display');

// --- Render Evaluation Rows ---
function renderItems() {
    itemsListContainer.innerHTML = '';
    
    // Check which fields are empty to highlight target field
    const emptyRowIds = items.filter(item => item.score === null || item.score === '').map(item => item.id);
    const isSingleEmpty = emptyRowIds.length === 1;

    items.forEach((item) => {
        const row = document.createElement('div');
        row.className = `item-row ${isSingleEmpty && emptyRowIds[0] === item.id ? 'is-target' : ''}`;
        row.dataset.id = item.id;
        
        row.innerHTML = `
            <div class="input-group">
                <label>평가 항목 명칭</label>
                <input type="text" class="item-name" value="${item.name}" placeholder="예: 중간고사">
            </div>
            <div class="input-group">
                <label>반영 비율 (%)</label>
                <input type="number" class="item-weight" value="${item.weight}" min="0" max="100" placeholder="0">
            </div>
            <div class="input-group">
                <label>만점 기준 (점)</label>
                <input type="number" class="item-max" value="${item.max}" min="1" placeholder="100">
            </div>
            <div class="input-group">
                <label>획득 점수</label>
                <input type="number" class="item-score ${isSingleEmpty && emptyRowIds[0] === item.id ? 'empty-highlight' : ''}" 
                       value="${item.score !== null ? item.score : ''}" 
                       step="0.01"
                       placeholder="X (비워둠)">
            </div>
            <div class="input-group" style="justify-content: flex-end; padding-top: 15px;">
                <button class="btn-icon-only btn-danger delete-item-btn" title="항목 삭제">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        
        // Add event listeners to inputs within this row
        const nameInput = row.querySelector('.item-name');
        const weightInput = row.querySelector('.item-weight');
        const maxInput = row.querySelector('.item-max');
        const scoreInput = row.querySelector('.item-score');
        const deleteBtn = row.querySelector('.delete-item-btn');
        
        nameInput.addEventListener('input', (e) => {
            item.name = e.target.value;
        });
        
        weightInput.addEventListener('input', (e) => {
            item.weight = parseFloat(e.target.value) || 0;
            calculate();
        });
        
        maxInput.addEventListener('input', (e) => {
            item.max = parseFloat(e.target.value) || 100;
            calculate();
        });
        
        scoreInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            item.score = val === '' ? null : parseFloat(val);
            calculate();
        });
        
        deleteBtn.addEventListener('click', () => {
            removeItem(item.id);
        });
        
        itemsListContainer.appendChild(row);
    });
    
    if (lucide) {
        lucide.createIcons();
    }
}

// --- Item Operations ---
function addItem() {
    const newId = Date.now().toString();
    items.push({
        id: newId,
        name: `평가 항목 ${items.length + 1}`,
        weight: 10,
        max: 100,
        score: null
    });
    renderItems();
    calculate();
}

function removeItem(id) {
    if (items.length <= 1) {
        alert('최소 하나의 평가 항목은 존재해야 합니다.');
        return;
    }
    items = items.filter(item => item.id !== id);
    renderItems();
    calculate();
}

// --- Calculation Core Logic ---
function calculate() {
    // 1. Calculate weights
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    totalWeightDisplay.textContent = String(totalWeight);
    
    // Update weight status bar
    weightProgress.style.width = `${Math.min(totalWeight, 100)}%`;
    if (totalWeight > 100) {
        weightProgress.classList.add('excess');
        weightWarningMsg.textContent = `반영 비율의 합(${totalWeight}%)이 100%를 초과했습니다.`;
        weightWarningMsg.className = 'warning-text error';
    } else if (totalWeight < 100) {
        weightProgress.classList.remove('excess');
        weightWarningMsg.textContent = `반영 비율의 합(${totalWeight}%)이 100%보다 부족합니다.`;
        weightWarningMsg.className = 'warning-text';
    } else {
        weightProgress.classList.remove('excess');
        weightWarningMsg.textContent = '반영 비율의 합이 100%로 완벽합니다!';
        weightWarningMsg.className = 'warning-text success';
    }
    
    const targetScore = parseFloat(targetScoreInput.value) || 0;
    
    // 2. Identify empty item
    const emptyItems = items.filter(item => item.score === null || isNaN(item.score));
    const countEmpty = emptyItems.length;
    
    // 3. Compute score contributions
    let securedScore = 0; // Total grade contribution secured so far
    items.forEach(item => {
        if (item.score !== null && !isNaN(item.score)) {
            // Contribution = (Score / Max Score) * Weight
            securedScore += (item.score / item.max) * item.weight;
        }
    });
    
    // Initialize results visual representation variables
    let barSecuredPct;
    let barRequiredPct;
    let barRemainingPct;
    let maxPossibleScore;
    
    // Round to 2 decimal places for display
    const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
    
    // Round target score to nearest integer for standard school cutoff comparisons
    const targetScoreRounded = Math.round(targetScore);
    const effectiveTarget = targetScoreRounded - 0.5;
    
    // 4. State Decision Tree
    if (countEmpty === 0) {
        // Option A: All scores entered
        const finalScore = round2(securedScore);
        const finalScoreRounded = Math.round(securedScore);
        const diff = round2(finalScoreRounded - targetScoreRounded);
        
        securedPointsDisplay.textContent = `${finalScore} (반올림: ${finalScoreRounded})`;
        requiredContribDisplay.textContent = '0.00';
        maxPossibleDisplay.textContent = `${finalScore} (반올림: ${finalScoreRounded})`;
        
        barSecuredPct = Math.min((finalScore / 100) * 100, 100);
        barRequiredPct = 0;
        barRemainingPct = 100 - barSecuredPct;
        
        if (finalScoreRounded >= targetScoreRounded) {
            setResultState('success', '목표 달성 완료!', `축하합니다! 최종 성적이 <strong>${finalScore}점</strong> (반올림: <strong>${finalScoreRounded}점</strong>)으로, 목표 점수(${targetScoreRounded}점)를 달성했습니다. (여유 점수: +${diff}점)`, 'check-circle');
        } else {
            setResultState('danger', '목표 달성 실패', `최종 성적이 <strong>${finalScore}점</strong> (반올림: <strong>${finalScoreRounded}점</strong>)입니다. 목표 점수(${targetScoreRounded}점)에 <strong>${Math.abs(diff)}점</strong> 미달했습니다.`, 'x-circle');
        }
        
    } else if (countEmpty === 1) {
        // Option B: Exactly one item is empty (The simulator target!)
        const targetItem = emptyItems[0];
        const targetWeight = targetItem.weight;
        const targetMax = targetItem.max;
        
        // Find max possible final grade if this target item gets a perfect score
        maxPossibleScore = securedScore + targetWeight;
        const maxPossibleScoreRounded = Math.round(maxPossibleScore);
        
        securedPointsDisplay.textContent = `${round2(securedScore)} (반올림: ${Math.round(securedScore)})`;
        maxPossibleDisplay.textContent = `${round2(maxPossibleScore)} (반올림: ${maxPossibleScoreRounded})`;
        
        // Needed contribution to reach target (with standard rounding, we need S >= target - 0.5)
        const neededContrib = effectiveTarget - securedScore;
        
        if (neededContrib <= 0) {
            // Case B1: Already achieved target score, even with 0 points (securedScore rounds up to target)
            requiredContribDisplay.textContent = '0.00';
            
            barSecuredPct = Math.min((securedScore / 100) * 100, 100);
            barRequiredPct = 0;
            barRemainingPct = 100 - barSecuredPct;
            
            setResultState('success', '이미 목표 달성!', `현재 확보한 점수만으로 <strong>${round2(securedScore)}점</strong> (반올림: <strong>${Math.round(securedScore)}점</strong>)이며, 이미 목표 점수(${targetScoreRounded}점)를 달성한 상태입니다. <br><strong>[${targetItem.name}]</strong> 항목에서 <strong>0점</strong>을 받아도 목표 달성이 가능합니다.`, 'sparkles');
            
        } else if (neededContrib > targetWeight) {
            // Case B2: Impossible to reach target even with a perfect score on this item
            requiredContribDisplay.textContent = String(round2(targetWeight));
            
            barSecuredPct = Math.min((securedScore / 100) * 100, 100);
            barRequiredPct = Math.min((targetWeight / 100) * 100, 100 - barSecuredPct);
            barRemainingPct = 100 - barSecuredPct - barRequiredPct;
            
            const gap = round2(effectiveTarget - maxPossibleScore);
            
            setResultState('danger', '목표 달성 불가능', `아쉽게도 <strong>[${targetItem.name}]</strong> 항목에서 만점(기여도 ${targetWeight}점)을 획득해도 최종 점수가 최대 <strong>${round2(maxPossibleScore)}점</strong> (반올림: <strong>${maxPossibleScoreRounded}점</strong>)에 그쳐, 목표 점수(${targetScoreRounded}점)에 도달할 수 없습니다. (반올림 기준 부족한 점수 기여도: 최소 ${gap}점)`, 'alert-triangle');
            
        } else {
            // Case B3: Possible to reach target. Calculate the required score!
            // neededContrib = (requiredScore / targetMax) * targetWeight
            // requiredScore = (neededContrib / targetWeight) * targetMax
            const requiredScore = (neededContrib / targetWeight) * targetMax;
            const finalRequiredScore = round2(requiredScore);
            
            requiredContribDisplay.textContent = String(round2(neededContrib));
            
            barSecuredPct = Math.min((securedScore / 100) * 100, 100);
            barRequiredPct = Math.min((neededContrib / 100) * 100, 100 - barSecuredPct);
            barRemainingPct = 100 - barSecuredPct - barRequiredPct;
            
            // Highlight Warning if required score is very high (e.g. > 90% of max)
            const ratio = requiredScore / targetMax;
            const projectedScore = securedScore + neededContrib;
            
            if (ratio >= 0.9) {
                setResultState('warning', '목표 달성 고난도', `목표 점수 달성을 위해 <strong>[${targetItem.name}]</strong> 항목에서 만점에 가까운 <strong>${finalRequiredScore}점</strong> 이상을 받아야 합니다! (만점: ${targetMax}점 중 약 ${Math.round(ratio*100)}% 득점 필요. 획득 시 최종 점수 ${round2(projectedScore)}점 → 반올림 ${targetScoreRounded}점)`, 'alert-circle');
            } else {
                setResultState('success', '목표 달성 가능!', `목표 점수 달성을 위해 <strong>[${targetItem.name}]</strong> 항목에서 <strong>${finalRequiredScore}점</strong> 이상을 획득하면 됩니다. (만점: ${targetMax}점. 획득 시 최종 점수 ${round2(projectedScore)}점 → 반올림 ${targetScoreRounded}점)`, 'check-circle-2');
            }
        }
        
    } else {
        // Option C: Multiple items are empty
        securedPointsDisplay.textContent = `${round2(securedScore)} (반올림: ${Math.round(securedScore)})`;
        requiredContribDisplay.textContent = '0.00';
        
        // Show hypothetical max possible if all remaining items get perfect score
        const emptyWeights = emptyItems.reduce((sum, item) => sum + item.weight, 0);
        maxPossibleScore = securedScore + emptyWeights;
        maxPossibleDisplay.textContent = `${round2(maxPossibleScore)} (반올림: ${Math.round(maxPossibleScore)})`;
        
        barSecuredPct = Math.min((securedScore / 100) * 100, 100);
        barRequiredPct = 0;
        barRemainingPct = 100 - barSecuredPct;
        
        setResultState('neutral', '입력 대기 중', `현재 비어있는 항목이 <strong>${countEmpty}개</strong> 있습니다. 역산을 하려면 점수를 모르는 <strong>단 1개의 항목</strong>만 비워두세요.`, 'help-circle');
    }
    
    // Update visualizer bar widths
    barSecured.style.width = `${barSecuredPct}%`;
    barRequired.style.width = `${barRequiredPct}%`;
    barRemaining.style.width = `${barRemainingPct}%`;
    
    // Update tooltips
    barSecured.setAttribute('data-tooltip', `확보한 성적 기여도: ${round2(securedScore)}점 (반올림: ${Math.round(securedScore)}점)`);
    if (countEmpty === 1 && barRequiredPct > 0) {
        const targetItem = emptyItems[0];
        barRequired.setAttribute('data-tooltip', `필요한 기여도: ${round2(effectiveTarget - securedScore)}점 (즉, [${targetItem.name}] ${round2((effectiveTarget - securedScore) / targetItem.weight * targetItem.max)}점 필요)`);
    } else {
        barRequired.setAttribute('data-tooltip', `필요한 성적 기여도: 0.00점`);
    }
    barRemaining.setAttribute('data-tooltip', `남아있는 비율 기여도: ${round2(100 - securedScore - (countEmpty === 1 ? Math.max(0, effectiveTarget - securedScore) : 0))}점`);
}

// --- Helper UI Updates ---
function setResultState(stateClass, title, message, iconName) {
    // Reset classes
    resultCard.className = `result-card state-${stateClass}`;
    resultTitle.textContent = title;
    resultMessage.innerHTML = message;
    
    // Update icon
    statusIconElement.setAttribute('data-lucide', iconName);
    if (lucide) {
        lucide.createIcons();
    }
}

// --- Presets and Events ---
function initEvents() {
    // Target Score Input
    targetScoreInput.addEventListener('input', () => {
        // Update active preset button highlight
        const currentTarget = parseFloat(targetScoreInput.value);
        document.querySelectorAll('.preset-btn').forEach(btn => {
            const presetVal = parseFloat(btn.dataset.target);
            if (presetVal === currentTarget) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        calculate();
    });
    
    // Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            targetScoreInput.value = btn.dataset.target || '';
            
            // Set active class
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            calculate();
        });
    });
    
    // Add Item Button
    addItemBtn.addEventListener('click', addItem);
    
    // Theme Toggle
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Handle dynamic updates if user edits items (e.g. from parent inputs)
    itemsListContainer.addEventListener('change', () => {
        // Make sure rendering is correct and recalculate
        calculate();
    });

    // Prevent form submission on enter key
    const form = document.getElementById('calculator-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }
}

// Set initial active state for preset button matching target score (90)
function initPresetHighlight() {
    const val = targetScoreInput.value;
    document.querySelectorAll('.preset-btn').forEach(btn => {
        if (btn.dataset.target === val) {
            btn.classList.add('active');
        }
    });
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderItems();
    initPresetHighlight();
    initEvents();
    calculate();
});
