document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const itemNameEl = document.getElementById('item-name');
    const itemTierEl = document.getElementById('item-tier');
    const itemLevelEl = document.getElementById('item-level');
    const successChanceEl = document.getElementById('success-chance');
    const failChanceEl = document.getElementById('fail-chance');
    const destroyChanceEl = document.getElementById('destroy-chance');
    const enhanceButton = document.getElementById('enhance-button');
    const gameMessageEl = document.getElementById('game-message');
    const minigameContainer = document.getElementById('minigame-container');
    const targetZone = document.getElementById('target-zone');

    // Audio Elements
    const landSound = new Audio('anvil_land.ogg');
    const useSound = new Audio('anvil_use.ogg');
    const breakSound = new Audio('anvil_break.ogg');

    // Game Configuration
    const TIERS = {
        NORMAL: { name: '일반', color: '#fff', baseSuccess: 80 },
        RARE: { name: '희귀', color: '#00aaff', baseSuccess: 70 },
        EPIC: { name: '영웅', color: '#d400ff', baseSuccess: 60 },
        LEGENDARY: { name: '전설', color: '#ff8000', baseSuccess: 50 },
    };

    let currentItem = {
        name: '낡은 검',
        tier: TIERS.NORMAL,
        level: 0,
    };

    let minigame = {
        active: false,
        currentBarIndex: 0,
        successfulStops: 0,
        bar: null, // Holds the current moving bar
        animationFrameId: null,
    };

    // --- Main Functions ---

    function initGame() {
        updateUI();
    }

    function updateUI() {
        const { name, tier, level } = currentItem;
        const [success, fail, destroy] = calculateProbabilities();

        itemNameEl.textContent = name;
        itemTierEl.textContent = tier.name;
        itemTierEl.style.color = tier.color;
        itemLevelEl.textContent = `+${level}`;

        successChanceEl.textContent = success.toFixed(2);
        failChanceEl.textContent = fail.toFixed(2);
        destroyChanceEl.textContent = destroy.toFixed(2);

        enhanceButton.disabled = minigame.active;
    }

    function calculateProbabilities() {
        const { level, tier } = currentItem;
        let success = tier.baseSuccess - level * 2.5;
        if (success < 10) success = 10;

        let destroy = level * 1.2;
        if (level < 5) destroy = 0;
        if (destroy > 40) destroy = 40;
        
        let fail = 100 - success - destroy;
        if (fail < 0) fail = 0;

        return [success, fail, destroy];
    }

    function handleEnhanceClick() {
        if (currentItem.level >= 20) {
            showMessage('최대 레벨에 도달했습니다!', 'yellow');
            return;
        }
        startMinigame();
    }

    function attemptEnhancement(bonusChance) {
        let [success, fail, destroy] = calculateProbabilities();
        success += bonusChance;
        fail = 100 - success - destroy;
        if (fail < 0) fail = 0;

        const rand = Math.random() * 100;

        if (rand < success) {
            currentItem.level++;
            showMessage(`강화 성공! (+${currentItem.level})`, 'lime');
            useSound.currentTime = 0;
            useSound.play();
        } else if (rand < success + fail) {
            if (currentItem.level > 0) {
                currentItem.level--;
            }
            showMessage(`강화 실패... (${currentItem.level > 0 ? '레벨 하락' : '변화 없음'})`, 'orange');
            breakSound.currentTime = 0;
            breakSound.play();
        } else {
            showMessage(`아이템이 파괴되었습니다...`, 'red');
            // Reset item
            currentItem.level = 0;
            breakSound.currentTime = 0;
            breakSound.play();
            // Could introduce logic to get a new item here
        }
        updateUI();
    }

    function showMessage(msg, color) {
        gameMessageEl.textContent = msg;
        gameMessageEl.style.color = color;
    }

    // --- Minigame Functions ---

    function startMinigame() {
        minigame.active = true;
        minigame.currentBarIndex = 0;
        minigame.successfulStops = 0;
        
        enhanceButton.disabled = true;
        minigameContainer.style.display = 'block';
        
        // Clear any previous bars
        minigameContainer.querySelectorAll('.moving-bar').forEach(b => b.remove());

        runNextBar();
    }

    function runNextBar() {
        if (minigame.currentBarIndex >= 3) {
            finishMinigame();
            return;
        }

        showMessage(`막대 ${minigame.currentBarIndex + 1}/3`, 'cyan');

        const barEl = document.createElement('div');
        barEl.className = 'moving-bar';
        minigameContainer.appendChild(barEl);

        minigame.bar = {
            el: barEl,
            position: -5,
            speed: 1 + (currentItem.level * 0.15),
        };

        // Add listeners after a short delay
        setTimeout(() => {
            document.addEventListener('keydown', handleBarStop);
            document.addEventListener('click', handleBarStop);
        }, 50);
        
        minigame.animationFrameId = requestAnimationFrame(moveSingleBar);
    }

    function moveSingleBar() {
        if (!minigame.active) return;

        minigame.bar.position += minigame.bar.speed;
        minigame.bar.el.style.left = `${minigame.bar.position}%`;

        if (minigame.bar.position >= 100) {
            // Bar went off-screen, count as a miss and move to next
            handleBarStop();
        } else {
            minigame.animationFrameId = requestAnimationFrame(moveSingleBar);
        }
    }

    function handleBarStop() {
        if (!minigame.active) return;

        // Stop animation and remove listeners for this bar
        cancelAnimationFrame(minigame.animationFrameId);
        document.removeEventListener('keydown', handleBarStop);
        document.removeEventListener('click', handleBarStop);

        // Check for success (BUG FIX APPLIED HERE)
        const containerWidth = minigameContainer.offsetWidth;
        const targetLeftPercent = 70;
        const targetWidthPercent = 10;

        const barLeftPercent = minigame.bar.position;
        
        if (barLeftPercent >= targetLeftPercent && barLeftPercent <= targetLeftPercent + targetWidthPercent) {
            minigame.successfulStops++;
            minigame.bar.el.style.backgroundColor = '#7CFC00'; // Success color
            landSound.currentTime = 0;
            landSound.play();
        } else {
            minigame.bar.el.style.backgroundColor = '#888'; // Miss color
        }
        
        minigame.currentBarIndex++;

        // Run the next bar after a short delay
        setTimeout(runNextBar, 300);
    }

    function finishMinigame() {
        const bonusChance = minigame.successfulStops * 5;
        showMessage(`미니게임 성공: ${minigame.successfulStops}개! (성공 확률 +${bonusChance}%)`, 'cyan');

        setTimeout(() => {
            minigameContainer.style.display = 'none';
            minigame.active = false;
            enhanceButton.disabled = false;
            attemptEnhancement(bonusChance);
        }, 1500);
    }

    // Event Listeners
    enhanceButton.addEventListener('click', handleEnhanceClick);

    // Initial setup
    initGame();
});
