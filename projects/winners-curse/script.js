// Game Constants & State
const INITIAL_BALANCE = 500;
const TOTAL_ROUNDS = 20;

let balance = INITIAL_BALANCE;
let currentRound = 1;
let currentTrueValue = 0;
let history = [];
let autoBetting = false;
let balanceChart = null;


class SoundEngine {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    playBlip() { this.playOscillator('square', 440, 0.05, 0.05); }
    playWin() {
        this.playOscillator('square', 660, 0.1, 0.1);
        setTimeout(() => this.playOscillator('square', 880, 0.1, 0.1), 100);
        setTimeout(() => this.playOscillator('square', 1100, 0.2, 0.1), 200);
    }
    playLoss() {
        this.playOscillator('sawtooth', 200, 0.2, 0.2);
        setTimeout(() => this.playOscillator('sawtooth', 150, 0.4, 0.2), 200);
    }
    playType() { this.playOscillator('square', 800, 0.02, 0.01); }
    playTick() { this.playOscillator('triangle', 800, 0.05, 0.05); }
    playOscillator(type, freq, duration, vol) {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        if (type === 'triangle') osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }
}
let soundEngine = null;

// DOM Elements
const introScreen = document.getElementById('intro-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');

const startBtn = document.getElementById('start-btn');
const bidInput = document.getElementById('bid-input');
const bidBtn = document.getElementById('bid-btn');
const autoBetToggle = document.getElementById('auto-bet-toggle');
const restartBtn = document.getElementById('restart-btn');
const viewResultsBtn = document.getElementById('view-results-btn');
const autoBetLabel = document.querySelector('.auto-bet-label');

const roundDisplay = document.getElementById('round-display');
const balanceDisplay = document.getElementById('balance-display');
const historyLog = document.getElementById('history-log');

const finalBalanceDisplay = document.getElementById('final-balance-display');
const performanceMsg = document.getElementById('performance-msg');

const themeToggle = document.getElementById('theme-toggle');
const gaugeNeedle = document.getElementById('gauge-needle');
const gaugeValDisplay = document.getElementById('gauge-val-display');

// Initialization
function init() {
    startBtn.addEventListener('click', () => {
        if (!soundEngine) soundEngine = new SoundEngine();
        if (soundEngine.audioCtx.state === 'suspended') soundEngine.audioCtx.resume();
        
        introScreen.classList.remove('active');
        gameScreen.classList.add('active');
        resetGame();
    });
    
    bidBtn.addEventListener('click', handleManualBid);
    restartBtn.addEventListener('click', resetGame);
    viewResultsBtn.addEventListener('click', showEndScreen);
    themeToggle.addEventListener('click', toggleTheme);
    
    bidInput.addEventListener('input', () => {
        let val = parseFloat(bidInput.value);
        if (val > 100) bidInput.value = 100;
        if (val < 0) bidInput.value = 0;
        if (soundEngine) soundEngine.playBlip();
    });

    document.addEventListener('keydown', (e) => {
        if (!gameScreen.classList.contains('active') || bidBtn.disabled) return;
        
        if (e.key === 'Enter') {
            handleManualBid();
            e.preventDefault();
        }
    });
}


function initChart() {
    if (balanceChart) {
        balanceChart.destroy();
    }
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const primaryColor = currentTheme === 'light' ? '#282c24' : '#e3e4d5';
    
    const ctx = document.getElementById('balance-chart').getContext('2d');
    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [0],
            datasets: [{
                label: 'Balance ($)',
                data: [INITIAL_BALANCE],
                borderColor: primaryColor,
                borderWidth: 4,
                fill: false,
                tension: 0,
                stepped: true,
                pointStyle: 'rect',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    ticks: { color: primaryColor, font: { family: "'VT323', monospace", size: 18 } },
                    grid: { color: primaryColor, borderDash: [4, 4], lineWidth: 2 }
                },
                x: {
                    ticks: { color: primaryColor, font: { family: "'VT323', monospace", size: 18 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    
    if (balanceChart) {
        const primaryColor = newTheme === 'light' ? '#282c24' : '#e3e4d5';
        balanceChart.data.datasets[0].borderColor = primaryColor;
        balanceChart.options.scales.x.ticks.color = primaryColor;
        balanceChart.options.scales.y.ticks.color = primaryColor;
        balanceChart.options.scales.y.grid.color = primaryColor;
        balanceChart.update();
    }
}

function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function showEndScreen() {
    switchScreen(endScreen);
}

function resetGame() {
    currentRound = 1;
    balance = INITIAL_BALANCE;
    history = [];
    historyLog.innerHTML = '';
    
    initChart();
    
    bidInput.value = 50;
    
    bidBtn.disabled = false;
    viewResultsBtn.style.display = 'none';
    
    gaugeNeedle.style.transform = `rotate(-90deg)`;
    gaugeValDisplay.textContent = `$??`;
    
    switchScreen(gameScreen);
    updateUI();
}

function formatMoney(amount) {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toFixed(2);
    return isNegative ? `-$${formatted}` : `$${formatted}`;
}

function updateUI() {
    roundDisplay.textContent = currentRound;
    balanceDisplay.textContent = formatMoney(balance);
    
    if (balance < 0) {
        balanceDisplay.classList.add('negative');
    } else {
        balanceDisplay.classList.remove('negative');
    }
}

function processBid(bidAmount) {
    return new Promise((resolve) => {
        const trueValue = Math.floor(Math.random() * 101);
        
        const degrees = (trueValue / 100) * 180 - 90;
        
        gaugeNeedle.style.transform = `rotate(${degrees}deg)`;
        gaugeValDisplay.textContent = `$??`;
        
        let tickCount = 0;
        const tickInterval = setInterval(() => {
            if (soundEngine) soundEngine.playTick();
            tickCount++;
            if (tickCount >= 12) clearInterval(tickInterval);
        }, 100);
        
        setTimeout(() => {
            clearInterval(tickInterval);
            gaugeValDisplay.textContent = `$${trueValue}`;
            
            let won = false;
            let profit = 0;
            
            if (bidAmount >= trueValue) {
                won = true;
                const resaleValue = 1.5 * trueValue;
                profit = resaleValue - bidAmount;
                balance += profit;
            }
            
            if (won) {
                gaugeNeedle.style.stroke = 'var(--success)';
                gaugeNeedle.style.fill = 'var(--success)';
                if (soundEngine) soundEngine.playWin();
            } else {
                gaugeNeedle.style.stroke = 'var(--error)';
                gaugeNeedle.style.fill = 'var(--error)';
                if (soundEngine) soundEngine.playLoss();
            }
            
            const roundData = {
                round: currentRound,
                bid: bidAmount,
                trueValue,
                won,
                profit
            };
            history.push(roundData);
            addHistoryLog(roundData);
            
            balanceChart.data.labels.push(currentRound);
            balanceChart.data.datasets[0].data.push(balance);
            balanceChart.update();
            
            currentRound++;
            updateUI();
            
            if (currentRound > TOTAL_ROUNDS || balance < 0) {
                endGame();
            }
            
            resolve();
        }, 1500);
    });
}

function addHistoryLog(data) {
    if (soundEngine) soundEngine.playType();
    const logEl = document.createElement('div');
    logEl.className = 'log-item';
    
    let tooltipText = '';
    const soldForText = data.won ? `$${(1.5 * data.trueValue).toFixed(2)}` : `N/A`;
    const profitClass = data.won ? (data.profit >= 0 ? 'result-win' : 'result-loss') : 'result-none';
    const profitText = data.won ? 
        (data.profit >= 0 ? `+${formatMoney(data.profit)} Profit` : `${formatMoney(Math.abs(data.profit))} Loss`) 
        : 'Lost Bid';
    
    if (data.won) {
        const soldVal = 1.5 * data.trueValue;
        const profitWord = data.profit >= 0 ? 'Profit' : 'Loss';
        tooltipText = `1.5 * $${data.trueValue} = $${soldVal.toFixed(2)} Sold | $${soldVal.toFixed(2)} - $${data.bid.toFixed(2)} Bid = ${data.profit >= 0 ? '+' : '-'}$${Math.abs(data.profit).toFixed(2)} ${profitWord}`;
    } else {
        tooltipText = `Bid too low! True Value was $${data.trueValue}.`;
    }
    logEl.setAttribute('data-tooltip', tooltipText);
    
    logEl.innerHTML = `
        <div class="log-round">R${data.round}</div>
        <div class="log-table">
            <div class="log-col">
                <div class="log-title">Bid Value</div>
                <div class="log-val">$${data.bid.toFixed(2)}</div>
            </div>
            <div class="log-col">
                <div class="log-title">True Value</div>
                <div class="log-val">$${data.trueValue.toFixed(2)}</div>
            </div>
            <div class="log-col">
                <div class="log-title">Sold At</div>
                <div class="log-val">${soldForText}</div>
            </div>
            <div class="log-col">
                <div class="log-title">Profit/Loss</div>
                <div class="log-val ${profitClass}" style="font-family: monospace;">${profitText}</div>
            </div>
        </div>
    `;
    
    historyLog.prepend(logEl);
}

async function handleManualBid() {
    const bidValue = parseFloat(bidInput.value);
    
    if (isNaN(bidValue) || bidValue < 0 || bidValue > 100) {
        alert("Please enter a valid bid amount between 0 and 100.");
        return;
    }
    
    if (autoBetToggle.checked) {
        startAutoBet(bidValue);
    } else {
        bidBtn.disabled = true;
        autoBetToggle.disabled = true;
        
        await processBid(bidValue);
        
        if (currentRound <= TOTAL_ROUNDS) {
            bidBtn.disabled = false;
            autoBetToggle.disabled = false;
        }
    }
}

async function startAutoBet(bidValue) {
    autoBetting = true;
    bidBtn.disabled = true;
    autoBetToggle.disabled = true;
    
    while (currentRound <= TOTAL_ROUNDS && autoBetting && balance >= 0) {
        await processBid(bidValue);
        if (currentRound <= TOTAL_ROUNDS && balance >= 0) {
            await new Promise(r => setTimeout(r, 400));
        }
    }
}

function endGame() {
    autoBetting = false;
    
    finalBalanceDisplay.textContent = formatMoney(balance);
    if (balance < 0) {
        finalBalanceDisplay.style.color = 'var(--error)';
        performanceMsg.textContent = "You went bankrupt! Game Over.";
    } else if (balance === INITIAL_BALANCE) {
        finalBalanceDisplay.style.color = 'var(--text-primary)';
        performanceMsg.textContent = "You broke even. Playing it extremely safe!";
    } else if (balance > INITIAL_BALANCE && balance < 600) {
        finalBalanceDisplay.style.color = 'var(--success)';
        performanceMsg.textContent = "You made a small profit. You beat the odds!";
    } else {
        finalBalanceDisplay.style.color = 'var(--success)';
        performanceMsg.textContent = "Incredible! You navigated the curse brilliantly.";
    }
    
    bidBtn.style.display = 'none';
    autoBetLabel.style.display = 'none';
    viewResultsBtn.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', init);
