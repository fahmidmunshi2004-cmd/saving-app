(() => {
  const games = [
    ["Number Guess", "Find the secret number from 1 to 100.", "fa-hashtag", "guess", "Puzzle"],
    ["Rock Paper Scissors", "Choose a move and beat the computer.", "fa-hand-scissors", "rps", "Classic"],
    ["Dice Roll", "Roll the dice and chase your best result.", "fa-dice", "dice", "Classic"],
    ["Tic Tac Toe", "Get three marks in a row. Two players take turns.", "fa-xmark", "ttt", "Classic"],
    ["Memory Match", "Flip cards and find all six matching pairs.", "fa-brain", "memory", "Puzzle"],
    ["Color Guess", "Pick the swatch that matches the target color.", "fa-palette", "color", "Puzzle"],
    ["Math Quiz", "Solve a quick addition, subtraction, or multiplication.", "fa-calculator", "math", "Puzzle"],
    ["Higher or Lower", "Guess if the next card number is higher or lower.", "fa-arrow-trend-up", "higher", "Classic"],
    ["Coin Toss", "Call heads or tails before the coin lands.", "fa-coins", "coin", "Classic"],
    ["Reaction Test", "Wait for green, then tap as quickly as you can.", "fa-bolt", "reaction", "Arcade"],
    ["Click Counter", "Tap as often as possible before time runs out.", "fa-computer-mouse", "click", "Arcade"],
    ["Catch the Box", "Catch the moving target ten times.", "fa-crosshairs", "catch", "Arcade"],
    ["Snake", "Guide the snake, eat food, and avoid the walls.", "fa-worm", "snake", "Arcade"],
    ["2048", "Slide matching tiles together to grow your score.", "fa-2", "2048", "Puzzle"],
    ["Word Scramble", "Unscramble the letters to reveal the word.", "fa-font", "word", "Puzzle"],
    ["Quick Tap", "Tap as many times as you can in ten seconds.", "fa-hand-pointer", "tap", "Arcade"],
    ["Simon Says", "Watch the color sequence and repeat it.", "fa-memory", "simon", "Classic"],
    ["Lucky Wheel", "Spin the wheel and see where luck lands.", "fa-circle-notch", "wheel", "Arcade"],
    ["Guess the Emoji", "Decode the emoji clue and enter the word.", "fa-face-smile", "emoji", "Puzzle"],
    ["Target Score", "Roll points and try to hit the target exactly.", "fa-bullseye", "target", "Arcade"],
    ["Whack-a-Mole", "Catch the pop-up mole before it ducks away.", "fa-hammer", "mole", "Quick"],
    ["Lights Out", "Switch off every light with the fewest moves.", "fa-lightbulb", "lights", "Puzzle"],
    ["Mini Mines", "Reveal safe tiles and avoid the hidden mines.", "fa-bomb", "mines", "Puzzle"],
    ["Connect Four", "Connect four counters before your opponent.", "fa-circle-dot", "connect", "Classic"],
    ["Dots & Boxes", "Claim boxes by drawing the final side.", "fa-border-all", "dots", "Puzzle"],
    ["Sliding 15", "Put the numbered tiles back in order.", "fa-grip", "fifteen", "Puzzle"],
    ["Mini Golf", "Pick your aim and power to sink the putt.", "fa-golf-ball-tee", "golf", "Arcade"],
    ["Breakout", "Bounce the ball and clear every brick.", "fa-table-cells", "breakout", "Arcade"],
    ["Pocket Pong", "Keep the ball in play with your paddle.", "fa-table-tennis-paddle-ball", "pong", "Arcade"],
    ["Lane Dodger", "Switch lanes and dodge the falling blocks.", "fa-road", "dodger", "Arcade"],
    ["Stop the Clock", "Stop the timer as close to the target as you can.", "fa-stopwatch", "clock", "Quick"],
    ["Sequence Recall", "Remember a growing sequence of numbers.", "fa-list-ol", "recall", "Puzzle"],
    ["Grid Runner", "Collect gems and avoid traps before your moves run out.", "fa-person-running", "runner", "Arcade"],
    ["Maze Escape", "Find your way from the entrance to the exit.", "fa-route", "maze", "Puzzle"],
    ["Typing Sprint", "Type the phrase accurately before the timer ends.", "fa-keyboard", "typing", "Quick"],
    ["Word Search", "Find the hidden word in a letter grid.", "fa-magnifying-glass", "wordsearch", "Puzzle"],
    ["Pattern Pop", "Repeat the glowing pattern in the right order.", "fa-grip", "pattern", "Puzzle"],
    ["Odd One Out", "Spot the one symbol that does not belong.", "fa-eye", "odd", "Quick"],
    ["Tap the Beat", "Keep a steady rhythm for ten taps.", "fa-music", "beat", "Quick"],
    ["Color Reflex", "Match the shown color before the next one appears.", "fa-droplet", "colorreflex", "Quick"],
    ["Math Sprint", "Solve as many quick sums as you can in 30 seconds.", "fa-stopwatch-20", "mathsprint", "Quick"],
    ["Prime Hunt", "Tap all prime numbers and avoid the decoys.", "fa-divide", "prime", "Puzzle"],
    ["Anagram Race", "Solve as many anagrams as you can before time runs out.", "fa-shuffle", "anagram", "Quick"],
    ["Color Mixer", "Mix the RGB sliders to match the target shade.", "fa-sliders", "mixer", "Puzzle"],
    ["Tower Stack", "Drop each moving platform to build a tall tower.", "fa-layer-group", "tower", "Arcade"],
    ["Balance Bar", "Keep the balance marker centered for 15 seconds.", "fa-scale-balanced", "balance", "Arcade"],
    ["Meteor Dodge", "Dodge falling meteors by switching lanes.", "fa-meteor", "meteor", "Arcade"],
    ["Fruit Catcher", "Move your basket to catch the falling fruit.", "fa-basket-shopping", "fruit", "Arcade"],
    ["Treasure Hunt", "Follow the hot and cold clues to find treasure.", "fa-gem", "treasure", "Puzzle"],
    ["Daily Brain Teaser", "Crack today's number code in six guesses.", "fa-calendar-day", "daily", "Quick"]
  ];

  const grid = document.getElementById("gameCornerGrid");
  const cornerView = document.getElementById("gameCornerView");
  const stage = document.getElementById("gameStage");
  const body = document.getElementById("gameStageBody");
  const title = document.getElementById("activeGameTitle");
  const restart = document.getElementById("restartGameBtn");
  const close = document.getElementById("closeGameBtn");
  const launcher = document.getElementById("openGameCornerBtn");
  const backToSettings = document.getElementById("backToSettingsBtn");
  const search = document.getElementById("gameSearch");
  const noGames = document.getElementById("noGamesMessage");
  if (!grid || !cornerView || !stage || !body || !title) return;

  let activeGame = null;
  let previousFocus = null;
  let categoryFilter = "all";
  let cleanup = [];
  let timers = [];
  const random = (max) => Math.floor(Math.random() * max);
  const on = (target, event, handler, options) => target.addEventListener(event, handler, options);
  const later = (fn, delay) => {
    const timer = window.setTimeout(fn, delay);
    timers.push([window.clearTimeout, timer]);
    return timer;
  };
  const every = (fn, delay) => {
    const timer = window.setInterval(fn, delay);
    timers.push([window.clearInterval, timer]);
    return timer;
  };
  const el = (selector) => body.querySelector(selector);
  const result = (text) => {
    const target = el("[data-result]");
    if (target) target.textContent = text;
  };
  const stop = () => {
    timers.forEach(([clear, id]) => clear(id));
    timers = [];
    cleanup.forEach((fn) => fn());
    cleanup = [];
  };
  const closeGame = () => {
    stop();
    activeGame = null;
    stage.classList.add("hidden");
    document.body.classList.remove("game-modal-open");
    body.replaceChildren();
    previousFocus?.focus?.();
    previousFocus = null;
  };

  grid.innerHTML = games.map(([name, desc, icon, id, category], index) => `
    <article class="game-card">
      <div class="game-card-top"><span class="game-card-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><span class="game-category">${category}</span></div>
      <h3>${String(index + 1).padStart(2, "0")}. ${name}</h3>
      <p>${desc}</p>
      <button class="game-play-btn" type="button" data-start="${id}">Play now <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
    </article>`).join("");

  const filterGames = () => {
    const query = search?.value.trim().toLowerCase() || "";
    let shown = 0;
    grid.querySelectorAll(".game-card").forEach((card, index) => {
      const game = games[index];
      const visible = (categoryFilter === "all" || game[4] === categoryFilter)
        && (!query || `${game[0]} ${game[1]} ${game[4]}`.toLowerCase().includes(query));
      card.classList.toggle("hidden", !visible);
      shown += Number(visible);
    });
    noGames?.classList.toggle("hidden", shown > 0);
  };

  const showGame = (id) => {
    stop();
    activeGame = id;
    const selected = games.find((game) => game[3] === id);
    if (!selected) return;
    title.textContent = selected[0];
    stage.classList.remove("hidden");
    document.body.classList.add("game-modal-open");
    close?.focus();
    renderers[id]();
  };

  const frame = (prompt, inner) => {
    body.innerHTML = `<p class="game-prompt">${prompt}</p><div class="game-play-area">${inner}<div class="game-result" data-result></div></div>`;
  };
  const action = (label, value, extra = "") => `<button class="game-action-btn" type="button" data-action="${value}" ${extra}>${label}</button>`;
  const numberedBoard = (klass, count) => `<div class="game-board ${klass}">${Array.from({ length: count }, (_, i) => `<button class="game-cell" type="button" data-cell="${i}"></button>`).join("")}</div>`;

  const renderers = {
    guess() {
      const secret = random(100) + 1;
      let tries = 0;
      frame("Guess the hidden number from 1 to 100.", `<div class="game-big">?</div><input class="game-input" data-input inputmode="numeric" type="number" min="1" max="100" placeholder="Type your guess"><button class="game-action-btn" data-action="guess">Check number</button>`);
      on(el("[data-action=guess]"), "click", () => {
        const input = el("[data-input]");
        const value = Number(input.value);
        if (!Number.isInteger(value) || value < 1 || value > 100) return result("Enter a whole number from 1 to 100.");
        tries++;
        if (value === secret) { result(`Correct! You got it in ${tries} ${tries === 1 ? "try" : "tries"}.`); input.disabled = true; }
        else result(value < secret ? "Go higher!" : "Go lower!");
      });
    },
    rps() {
      frame("Choose your move.", `<div class="game-options">${["Rock", "Paper", "Scissors"].map((x) => action(x, `rps-${x}`)).join("")}</div>`);
      on(body, "click", (event) => {
        const button = event.target.closest("[data-action^='rps-']");
        if (!button) return;
        const user = button.dataset.action.slice(4);
        const cpu = ["Rock", "Paper", "Scissors"][random(3)];
        const win = (user === "Rock" && cpu === "Scissors") || (user === "Paper" && cpu === "Rock") || (user === "Scissors" && cpu === "Paper");
        result(`You: ${user} · Computer: ${cpu} · ${user === cpu ? "Draw!" : win ? "You win!" : "Computer wins!"}`);
      });
    },
    dice() {
      const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
      frame("Roll the dice.", `<div class="game-big" data-die>🎲</div>${action("Roll dice", "roll-die")}`);
      on(el("[data-action=roll-die]"), "click", () => { const n = random(6); el("[data-die]").textContent = faces[n]; result(`You rolled ${n + 1}!`); });
    },
    ttt() {
      const cells = Array(9).fill("");
      let turn = "X";
      let done = false;
      const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      frame("Two players · X goes first.", numberedBoard("game-board-ttt", 9));
      on(body, "click", (event) => {
        const cell = event.target.closest("[data-cell]");
        if (!cell || done || cells[cell.dataset.cell]) return;
        const i = Number(cell.dataset.cell);
        cells[i] = turn;
        cell.textContent = turn;
        if (wins.some((line) => line.every((n) => cells[n] === turn))) { done = true; result(`${turn} wins!`); }
        else if (cells.every(Boolean)) { done = true; result("It's a draw!"); }
        else { turn = turn === "X" ? "O" : "X"; result(`${turn}'s turn.`); }
      });
    },
    memory() {
      const icons = ["🍎", "🍋", "🍇", "🍒", "🥝", "🍉", "🍎", "🍋", "🍇", "🍒", "🥝", "🍉"].sort(() => Math.random() - 0.5);
      const opened = [];
      let matched = 0;
      let locked = false;
      frame("Tap two cards to find each matching pair.", numberedBoard("game-board-memory", 12));
      body.querySelectorAll("[data-cell]").forEach((cell, i) => { cell.textContent = "?"; });
      on(body, "click", (event) => {
        const cell = event.target.closest("[data-cell]");
        if (!cell || locked || cell.classList.contains("is-open") || cell.dataset.matched) return;
        const index = Number(cell.dataset.cell);
        cell.textContent = icons[index]; cell.classList.add("is-open"); opened.push({ index, cell });
        if (opened.length !== 2) return;
        if (icons[opened[0].index] === icons[opened[1].index]) {
          opened.forEach((item) => { item.cell.dataset.matched = "true"; }); matched += 2; opened.length = 0;
          if (matched === icons.length) result("All pairs found! Great memory!");
        } else {
          locked = true;
          later(() => { opened.forEach((item) => { item.cell.textContent = "?"; item.cell.classList.remove("is-open"); }); opened.length = 0; locked = false; }, 650);
        }
      });
    },
    color() {
      const colors = ["#ff014f", "#3eb75e", "#1ba2db", "#ff8f3c", "#7749f8", "#15b8a6"];
      const target = colors[random(colors.length)];
      frame("Tap the color swatch that matches the target.", `<div class="game-color-swatch" style="background:${target}"></div><div class="game-options">${colors.sort(() => Math.random() - 0.5).map((color) => `<button class="game-color-swatch" style="width:48px;height:48px;background:${color}" data-color="${color}" aria-label="Choose color"></button>`).join("")}</div>`);
      on(body, "click", (event) => { const choice = event.target.closest("[data-color]"); if (choice) result(choice.dataset.color === target ? "Correct color!" : "Not quite—try another."); });
    },
    math() {
      const a = random(20) + 1, b = random(20) + 1, op = ["+", "−", "×"][random(3)];
      const answer = op === "+" ? a + b : op === "−" ? a - b : a * b;
      frame("Solve this quick equation.", `<div class="game-big" style="font-size:2.2rem">${a} ${op} ${b} = ?</div><input class="game-input" data-input inputmode="numeric" type="number" placeholder="Your answer"><button class="game-action-btn" data-action="check-math">Check answer</button>`);
      on(el("[data-action=check-math]"), "click", () => result(Number(el("[data-input]").value) === answer ? "Correct! Nice work." : "Not this time. Try Restart for another question."));
    },
    higher() {
      let current = random(13) + 1;
      let score = 0;
      frame("Will the next card be higher or lower? Equal cards count as a miss.", `<div class="game-big" data-card>${current}</div><div class="game-options">${action("Higher ↑", "higher")}${action("Lower ↓", "lower")}</div>`);
      on(body, "click", (event) => {
        const pick = event.target.closest("[data-action]")?.dataset.action;
        if (!["higher", "lower"].includes(pick)) return;
        const next = random(13) + 1;
        const correct = pick === "higher" ? next > current : next < current;
        score = correct ? score + 1 : 0;
        current = next;
        el("[data-card]").textContent = current;
        result(`${correct ? "Correct!" : "Miss!"} Card: ${next} · Streak: ${score}`);
      });
    },
    coin() {
      frame("Pick a side, then flip the coin.", `<div class="game-big" data-coin>🪙</div><div class="game-options">${action("Heads", "heads")}${action("Tails", "tails")}</div>`);
      on(body, "click", (event) => {
        const choice = event.target.closest("[data-action]")?.dataset.action;
        if (!["heads", "tails"].includes(choice)) return;
        const side = random(2) ? "heads" : "tails";
        el("[data-coin]").textContent = side === "heads" ? "🙂" : "🔄";
        result(`${side === choice ? "You guessed it!" : "Try again!"} It landed ${side}.`);
      });
    },
    reaction() {
      frame("Tap Start, wait for the card to turn green, then tap it.", `${action("Start test", "reaction-start")}<button class="game-action-btn" data-reaction disabled style="min-width:min(80vw,300px);min-height:130px">Ready?</button>`);
      let startAt = 0;
      on(el("[data-action=reaction-start]"), "click", (event) => {
        const button = el("[data-reaction]");
        button.disabled = true; button.textContent = "Wait for green…"; button.style.background = "#ff8f3c";
        event.currentTarget.disabled = true;
        later(() => { startAt = performance.now(); button.disabled = false; button.textContent = "TAP NOW!"; button.style.background = "#3eb75e"; }, 900 + random(1800));
      });
      on(el("[data-reaction]"), "click", (event) => {
        if (!startAt) { result("Too soon! Restart and wait for green."); return; }
        result(`Your reaction: ${Math.round(performance.now() - startAt)} ms`);
        startAt = 0; el("[data-action=reaction-start]").disabled = false;
        event.currentTarget.disabled = true; event.currentTarget.textContent = "Result recorded";
      });
    },
    click() { timedTap("Tap the button as many times as you can in 10 seconds.", "Click!", "click-score"); },
    tap() { timedTap("Tap as many times as possible before the 10-second timer ends.", "Tap!", "tap-score"); },
    catch() {
      let hits = 0;
      frame("Catch the moving target ten times.", `<div class="game-arena"><button class="game-target" data-target aria-label="Catch target">●</button></div>`);
      result("0 / 10 catches");
      const move = () => { const arena = el(".game-arena"), target = el("[data-target]"); target.style.left = `${random(Math.max(1, arena.clientWidth - 50))}px`; target.style.top = `${random(Math.max(1, arena.clientHeight - 50))}px`; };
      move();
      on(el("[data-target]"), "click", () => { hits++; if (hits >= 10) { result("You caught it 10 times! Well done!"); el("[data-target]").disabled = true; } else { result(`${hits} / 10 catches`); move(); } });
    },
    snake() {
      frame("Use the arrow buttons or swipe the board to guide the snake.", `<canvas class="game-canvas" data-snake width="300" height="300" aria-label="Snake game board"></canvas><div class="game-pad">${["up", "left", "down", "right"].map((dir) => `<button type="button" data-dir="${dir}" aria-label="Move ${dir}">${{up:"↑",down:"↓",left:"←",right:"→"}[dir]}</button>`).join("")}</div>`);
      const canvas = el("[data-snake]"), ctx = canvas.getContext("2d");
      let snake = [{x:9,y:10},{x:8,y:10},{x:7,y:10}], dir = {x:1,y:0}, food = {x:14,y:10}, score = 0, ended = false;
      const dirs = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
      const steer = (way) => { const next = dirs[way]; if (next && next.x !== -dir.x && next.y !== -dir.y) dir = next; };
      on(body, "click", (event) => { const way = event.target.closest("[data-dir]")?.dataset.dir; if (way) steer(way); });
      const swipeStart = {x:0,y:0};
      on(canvas, "touchstart", (e) => { swipeStart.x=e.changedTouches[0].clientX; swipeStart.y=e.changedTouches[0].clientY; }, {passive:true});
      on(canvas, "touchend", (e) => { const dx=e.changedTouches[0].clientX-swipeStart.x, dy=e.changedTouches[0].clientY-swipeStart.y; if(Math.max(Math.abs(dx),Math.abs(dy))>18) steer(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up")); }, {passive:true});
      const draw = () => {
        ctx.clearRect(0,0,300,300); ctx.fillStyle="#3eb75e"; snake.forEach((p)=>ctx.fillRect(p.x*15+1,p.y*15+1,13,13)); ctx.fillStyle="#ff014f"; ctx.beginPath();ctx.arc(food.x*15+7.5,food.y*15+7.5,6,0,Math.PI*2);ctx.fill();
      };
      every(() => {
        if (ended) return;
        const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
        if(head.x<0||head.y<0||head.x>=20||head.y>=20||snake.some((p)=>p.x===head.x&&p.y===head.y)){ended=true;result(`Game over · Score: ${score}`);return;}
        snake.unshift(head);
        if(head.x===food.x&&head.y===food.y){score++;food={x:random(20),y:random(20)};result(`Score: ${score}`);}else snake.pop();
        draw();
      }, 150);
      draw();
    },
    "2048"() {
      const board = Array(16).fill(0); board[0]=2; board[15]=2;
      frame("Use arrow buttons, keyboard arrows, or swipe the board.", `<div class="game-grid-2048" data-grid>${board.map((x)=>`<div class="game-cell"></div>`).join("")}</div><div class="game-options">${["up","left","down","right"].map((d)=>`<button class="game-action-btn" data-dir="${d}" aria-label="Move ${d}">${{up:"↑",down:"↓",left:"←",right:"→"}[d]}</button>`).join("")}</div>`);
      const draw=()=>el("[data-grid]").querySelectorAll(".game-cell").forEach((cell,i)=>{cell.textContent=board[i]||"";});
      const move=(direction)=>{
        let lines=[];
        for(let n=0;n<4;n++) lines.push(direction==="left"||direction==="right"?board.slice(n*4,n*4+4):[board[n],board[n+4],board[n+8],board[n+12]]);
        if(direction==="right"||direction==="down")lines=lines.map((line)=>line.reverse());
        lines=lines.map((line)=>{line=line.filter(Boolean);for(let i=0;i<line.length-1;i++)if(line[i]===line[i+1]){line[i]*=2;line.splice(i+1,1);}return line.concat(Array(4-line.length).fill(0));});
        const next=Array(16).fill(0);
        lines.forEach((line,n)=>line.forEach((value,i)=>{const row=direction==="up"?i:direction==="down"?3-i:n;const col=direction==="up"||direction==="down"?n:(direction==="right"?3-i:i);next[row*4+col]=value;}));
        if(next.some((value,i)=>value!==board[i])){board.splice(0,16,...next);const empty=board.map((x,i)=>x?null:i).filter((x)=>x!==null);if(empty.length)board[empty[random(empty.length)]]=random(5)===0?4:2;draw();if(board.includes(2048))result("2048! You made it!");}
      };
      on(body,"click",(event)=>{const d=event.target.closest("[data-dir]")?.dataset.dir;if(d)move(d);});
      const start={x:0,y:0};
      on(el("[data-grid]"),"touchstart",(e)=>{start.x=e.changedTouches[0].clientX;start.y=e.changedTouches[0].clientY;},{passive:true});
      on(el("[data-grid]"),"touchend",(e)=>{const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.max(Math.abs(dx),Math.abs(dy))>18)move(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));},{passive:true});
      draw();
    },
    word() {
      const words=["BUDGET","SAVINGS","WALLET","FAMILY","MARKET","FUTURE","GROWTH","TARGET"];
      const answer=words[random(words.length)]; let scrambled=answer;
      while(scrambled===answer) scrambled=answer.split("").sort(()=>Math.random()-.5).join("");
      frame("Unscramble the letters.", `<div class="game-big" style="font-size:2.1rem;letter-spacing:.12em">${scrambled}</div><input class="game-input" data-input autocomplete="off" placeholder="Your answer"><button class="game-action-btn" data-action="check-word">Check word</button>`);
      on(el("[data-action=check-word]"),"click",()=>result(el("[data-input]").value.trim().toUpperCase()===answer?"Correct! Word solved.":"Not yet. Keep trying or restart."));
    },
    simon() {
      const colors=["#ff014f","#1ba2db","#3eb75e","#ff8f3c"], seq=[]; let player=0, accepting=false;
      frame("Watch the flashing sequence, then repeat it in order.", `<div class="game-board" style="grid-template-columns:repeat(2,76px)">${colors.map((color,i)=>`<button class="game-cell" data-simon="${i}" style="width:76px;height:76px;background:${color};opacity:.8"></button>`).join("")}</div>${action("Start round", "simon-start")}`);
      const flash=(i)=>{const button=el(`[data-simon="${i}"]`);button.style.opacity="1";button.style.transform="scale(.93)";later(()=>{button.style.opacity=".8";button.style.transform="";},260);};
      const next=()=>{accepting=false;player=0;seq.push(random(4));result("Watch the sequence…");seq.forEach((color,i)=>later(()=>flash(color),400+i*550));later(()=>{accepting=true;result("Your turn!");},450+seq.length*550);};
      on(body,"click",(event)=>{if(event.target.closest("[data-action=simon-start]")){seq.length=0;next();return;}const button=event.target.closest("[data-simon]");if(!button||!accepting)return;const i=Number(button.dataset.simon);flash(i);if(i!==seq[player]){accepting=false;result(`Game over · You reached round ${seq.length}.`);return;}player++;if(player===seq.length){accepting=false;result("Great! Next round…");later(next,650);}});
    },
    wheel() {
      const prizes=["10 points","50 points","Lucky bonus","100 points","25 points","Jackpot!"];
      frame("Spin for a little fun—no real rewards or money involved.", `<div class="game-big" data-wheel style="transition:transform 1s ease">🎡</div>${action("Spin the wheel", "spin")}`);
      on(el("[data-action=spin]"),"click",()=>{const wheel=el("[data-wheel]"),prize=prizes[random(prizes.length)];wheel.style.transform=`rotate(${720+random(360)}deg)`;result(`The wheel picked: ${prize}!`);});
    },
    emoji() {
      const qs=[["🌊 🏖️","BEACH"],["🏔️ 🌲","MOUNTAIN"],["🍕 ❤️","PIZZA"],["🐍","SNAKE"],["🚗 💨","RACING"],["✈️ 🌍","TRAVEL"],["🌙 ⭐","NIGHT"]];
      const [clue,answer]=qs[random(qs.length)];
      frame("Guess the word from the emoji clue.", `<div class="game-big">${clue}</div><input class="game-input" data-input autocomplete="off" placeholder="Guess the word"><button class="game-action-btn" data-action="guess-emoji">Guess</button>`);
      on(el("[data-action=guess-emoji]"),"click",()=>result(el("[data-input]").value.trim().toUpperCase()===answer?"You got it!":"Try another guess."));
    },
    target() {
      const target=random(81)+20; let score=0;
      frame(`Roll points to reach exactly ${target}.`, `<div class="game-big" data-score>0</div>${action("Roll +", "roll-score")}`);
      on(el("[data-action=roll-score]"),"click",(event)=>{if(score>=target)return;score+=random(20)+1;el("[data-score]").textContent=score;if(score===target){result("Perfect hit! Target reached!");event.currentTarget.disabled=true;}else if(score>target){result("You passed the target. Restart to try again.");event.currentTarget.disabled=true;}else result(`${target-score} points to go!`);});
    },
    mole() {
      let score=0, seconds=20, active=-1;
      frame("Tap the glowing mole. Catch as many as you can in 20 seconds.", `<div class="game-board game-mole-grid">${Array.from({length:9},(_,i)=>`<button class="game-cell" data-mole="${i}">·</button>`).join("")}</div>`);
      const pop=()=>{active=random(9);body.querySelectorAll("[data-mole]").forEach((b,i)=>{b.textContent=i===active?"🐹":"·";b.classList.toggle("is-open",i===active);});}; pop();
      on(body,"click",e=>{const b=e.target.closest("[data-mole]");if(!b)return;if(Number(b.dataset.mole)===active){score++;result(`Score: ${score} · ${seconds}s left`);pop();}else result("Miss! Follow the glowing mole.");});
      every(()=>{seconds--;if(seconds<=0){seconds=0;stop();body.querySelectorAll("[data-mole]").forEach(b=>b.disabled=true);result(`Time! Final score: ${score}`);}else if(seconds%2===0)pop();},1000);
    },
    lights() {
      const board=Array.from({length:25},()=>false);let moves=0;
      const toggle=(i)=>[i,i-5,i+5,...(i%5?[i-1]:[]),...(i%5<4?[i+1]:[])].forEach(n=>{if(n>=0&&n<25&&Math.abs((n%5)-(i%5))<=1)board[n]=!board[n];});
      for(let i=0;i<14;i++)toggle(random(25));
      frame("Tap a light to switch it and its neighbors. Turn every light off.",`<div class="game-board game-lights-grid">${board.map((on,i)=>`<button class="game-cell ${on?"is-on":""}" data-light="${i}" aria-label="Light ${i+1}">${on?"✦":""}</button>`).join("")}</div>`);
      on(body,"click",e=>{const b=e.target.closest("[data-light]");if(!b)return;toggle(Number(b.dataset.light));moves++;body.querySelectorAll("[data-light]").forEach((x,i)=>{x.classList.toggle("is-on",board[i]);x.textContent=board[i]?"✦":"";});if(board.every(x=>!x)){result(`All lights out in ${moves} moves!`);body.querySelectorAll("[data-light]").forEach(x=>x.disabled=true);}else result(`${moves} moves · ${board.filter(Boolean).length} lights remain.`);});
    },
    mines() {
      const mineSet=new Set();while(mineSet.size<5)mineSet.add(random(25));let flags=false,over=false;
      frame("Reveal safe tiles. Switch Flag mode to mark the five hidden mines.",`${action("Flag mode: off","flag-mode")}<div class="game-board game-mines-grid">${Array.from({length:25},(_,i)=>`<button class="game-cell" data-mine="${i}"></button>`).join("")}</div>`);
      on(body,"click",e=>{if(e.target.closest("[data-action=flag-mode]")){flags=!flags;e.target.textContent=`Flag mode: ${flags?"on":"off"}`;return;}const b=e.target.closest("[data-mine]");if(!b||over||b.disabled)return;const i=Number(b.dataset.mine);if(flags){b.textContent=b.textContent==="⚑"?"":"⚑";return;}b.disabled=true;if(mineSet.has(i)){b.textContent="💥";b.classList.add("is-mine-hit");over=true;result("Mine! Restart for a new board.");body.querySelectorAll("[data-mine]").forEach((x,n)=>{if(mineSet.has(n))x.textContent="💣";x.disabled=true;});return;}const x=i%5,y=Math.floor(i/5);let count=0;for(let yy=Math.max(0,y-1);yy<=Math.min(4,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(4,x+1);xx++)if(mineSet.has(yy*5+xx))count++;b.textContent=count||"·";b.classList.add("is-open");if([...body.querySelectorAll("[data-mine]")].filter(x=>x.disabled).length===20){over=true;result("Board cleared! Nice work.");}else result(`${25-mineSet.size-[...body.querySelectorAll("[data-mine]")].filter(x=>x.disabled).length} safe tiles left.`);});
    },
    connect() {
      const board=Array(42).fill("");let turn="🔴",done=false;const wins=[];
      for(let r=0;r<6;r++)for(let c=0;c<7;c++){for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const line=[];for(let k=0;k<4;k++){const rr=r+dr*k,cc=c+dc*k;if(rr>=0&&rr<6&&cc>=0&&cc<7)line.push(rr*7+cc);}if(line.length===4)wins.push(line);}}
      frame("Two players · drop four counters in a row to win.",`<div class="game-board game-connect-grid">${board.map((_,i)=>`<button class="game-cell" data-connect="${i}" aria-label="Column ${i%7+1}"></button>`).join("")}</div>`);
      on(body,"click",e=>{const b=e.target.closest("[data-connect]");if(!b||done)return;const col=Number(b.dataset.connect)%7;let row=5;while(row>=0&&board[row*7+col])row--;if(row<0)return;const i=row*7+col;board[i]=turn;body.querySelector(`[data-connect="${i}"]`).textContent=turn;const line=wins.find(w=>w.every(n=>board[n]===turn));if(line){done=true;result(`${turn} wins!`);}else if(board.every(Boolean)){done=true;result("It's a draw!");}else{turn=turn==="🔴"?"🟡":"🔴";result(`${turn}'s turn.`);}});
    },
    dots() {
      const edges=Array(12).fill(false),owners=Array(4).fill(0);let turn=1,score=[0,0],done=false;
      const boxEdges=Array.from({length:4},(_,i)=>{const r=Math.floor(i/2),c=i%2;return[r*2+c,(r+1)*2+c,6+r*3+c,6+r*3+c+1];});
      const edgePositions=[[1,2,"h"],[1,4,"h"],[3,2,"h"],[3,4,"h"],[5,2,"h"],[5,4,"h"],[2,1,"v"],[4,1,"v"],[2,3,"v"],[4,3,"v"],[2,5,"v"],[4,5,"v"]];
      frame("Two players take turns drawing sides. Complete more boxes to win.",`<div class="game-dots-board">${Array.from({length:12},(_,i)=>`<button class="game-dot-edge edge-${edgePositions[i][2]}" style="grid-row:${edgePositions[i][0]};grid-column:${edgePositions[i][1]}" data-edge="${i}" aria-label="Draw line ${i+1}"></button>`).join("")}${Array.from({length:4},(_,i)=>`<span class="game-dots-box" style="grid-row:${2+Math.floor(i/2)*2};grid-column:${2+(i%2)*2}" data-box="${i}"></span>`).join("")}${[1,3,5].flatMap(r=>[1,3,5].map(c=>`<span class="game-dot" style="grid-row:${r};grid-column:${c}"></span>`)).join("")}</div>`);
      on(body,"click",e=>{const b=e.target.closest("[data-edge]");if(!b||done)return;const i=Number(b.dataset.edge);if(edges[i])return;edges[i]=true;b.classList.add("is-drawn");b.textContent=turn===1?"A":"B";let scored=false;boxEdges.forEach((list,n)=>{if(!owners[n]&&list.every(edge=>edges[edge])){owners[n]=turn;score[turn-1]++;el(`[data-box="${n}"]`).textContent=turn===1?"A":"B";el(`[data-box="${n}"]`).classList.add(turn===1?"player-a":"player-b");scored=true;}});if(edges.every(Boolean)){done=true;result(`Game over · Player A ${score[0]} — Player B ${score[1]} · ${score[0]===score[1]?"Draw!":score[0]>score[1]?"A wins!":"B wins!"}`);}else{if(!scored)turn=3-turn;result(`Player ${turn===1?"A":"B"} · Boxes A ${score[0]} / B ${score[1]}`);}});
    },
    fifteen() {
      const board=Array.from({length:15},(_,i)=>i+1).concat(0);for(let n=0;n<160;n++){const z=board.indexOf(0),moves=[z%4?z-1:-1,z%4<3?z+1:-1,z>3?z-4:-1,z<12?z+4:-1].filter(x=>x>=0),m=moves[random(moves.length)];[board[z],board[m]]=[board[m],board[z]];}let moves=0;
      frame("Slide tiles into order. Tap a tile beside the empty space.",`<div class="game-board game-fifteen-grid">${board.map((x,i)=>`<button class="game-cell" data-tile="${i}">${x||""}</button>`).join("")}</div>`);
      on(body,"click",e=>{const b=e.target.closest("[data-tile]");if(!b)return;const i=Number(b.dataset.tile),z=board.indexOf(0);if(Math.abs(i%4-z%4)+Math.abs(Math.floor(i/4)-Math.floor(z/4))!==1)return;[board[i],board[z]]=[board[z],board[i]];moves++;body.querySelectorAll("[data-tile]").forEach((x,n)=>x.textContent=board[n]||"");if(board.slice(0,15).every((x,n)=>x===n+1)){result(`Solved in ${moves} moves!`);body.querySelectorAll("[data-tile]").forEach(x=>x.disabled=true);}else result(`${moves} moves`);});
    },
    golf() {
      let strokes=0,distance=random(91)+10;
      frame(`The hole is ${distance} m away. Adjust shot power and land within 5 m.`,`${action("− Power","power-down")}<div class="game-big"><span data-power>50</span>%</div>${action("+ Power","power-up")}${action("Take shot","golf-shot")}`);
      let power=50;on(body,"click",e=>{const a=e.target.closest("[data-action]")?.dataset.action;if(a==="power-down")power=Math.max(10,power-10);if(a==="power-up")power=Math.min(100,power+10);if(a?.startsWith("power"))el("[data-power]").textContent=power;if(a==="golf-shot"){strokes++;const shot=Math.round(power*1.5)+random(20)-10;distance=Math.abs(distance-shot);if(distance<=5){result(`Hole in ${strokes} ${strokes===1?"stroke":"strokes"}!`);e.target.disabled=true;}else result(`Ball is ${distance} m from the hole. ${distance<shot?"You overshot!":"Keep going!"}`);}});
    },
    breakout() { arcadeCanvas("Clear the bricks. Move the paddle, then tap Launch.","breakout"); },
    pong() { arcadeCanvas("Move your paddle to keep the ball in play.","pong"); },
    dodger() {
      let lane=1,score=0,tick=0,obstacles=[random(3)];frame("Switch lanes to dodge the falling blocks.",`<div class="game-dodge-lanes" data-lanes>${[0,1,2].map(i=>`<button class="game-dodge-lane" data-lane="${i}"></button>`).join("")}</div><div class="game-options">${action("← Left","lane-left")}${action("Right →","lane-right")}</div>`);const draw=()=>body.querySelectorAll("[data-lane]").forEach((col,i)=>col.textContent=(i===lane?"🚀":"")+(i===obstacles[0]?"🟥":""));draw();on(body,"click",e=>{const a=e.target.closest("[data-action]")?.dataset.action,d=e.target.closest("[data-lane]")?.dataset.lane;if(d!==undefined)lane=Number(d);if(a==="lane-left")lane=Math.max(0,lane-1);if(a==="lane-right")lane=Math.min(2,lane+1);draw();});every(()=>{tick++;if(obstacles[0]===lane){stop();result(`Crash! Score: ${score}. Restart to fly again.`);return;}score++;obstacles=[random(3)];draw();result(`Score: ${score}`);},900);
    },
    clock() {
      let start=0,raf=0;const target=(3+random(5)).toFixed(1);frame(`Stop the timer at ${target} seconds (within 0.15 seconds wins).`,`${action("Start","clock-start")}<div class="game-big" data-clock>0.00</div>${action("Stop","clock-stop","disabled")}`);const display=el("[data-clock]");const tick=()=>{display.textContent=((performance.now()-start)/1000).toFixed(2);raf=requestAnimationFrame(tick);};on(body,"click",e=>{const a=e.target.closest("[data-action]")?.dataset.action;if(a==="clock-start"){start=performance.now();el("[data-action=clock-stop]").disabled=false;e.target.disabled=true;tick();}if(a==="clock-stop"){cancelAnimationFrame(raf);const diff=Math.abs(Number(display.textContent)-Number(target));result(diff<=.15?`Perfect stop! ${display.textContent}s`: `Off by ${diff.toFixed(2)}s. Target was ${target}s.`);e.target.disabled=true;el("[data-action=clock-start]").disabled=false;}});cleanup.push(()=>cancelAnimationFrame(raf));
    },
    recall() {
      const sequence=Array.from({length:7},()=>random(9)+1),shown=sequence.slice(0,3).join(" – ");frame("Remember the number sequence, then type it in order.",`<div class="game-big" data-sequence>${shown}</div>${action("Hide sequence","hide-sequence")}<input class="game-input" data-input inputmode="numeric" placeholder="Enter the sequence"><button class="game-action-btn" data-action="check-sequence">Check</button>`);on(el("[data-action=hide-sequence]"),"click",()=>el("[data-sequence]").textContent="? ? ?");on(el("[data-action=check-sequence]"),"click",()=>{const input=el("[data-input]").value.trim().replace(/\s+/g,"");const length=Math.min(7,3+Math.floor(input.length/4));result(input===sequence.slice(0,length).join("")?`Correct! ${length} digits remembered.`:"Not quite—restart for a new sequence.");});
    },
    runner() {
      let pos=0,steps=15,gem=0,traps=new Set([7,8,14]);const treasures=new Set([2,5,10,13]);frame("Move across the grid, collect four gems and avoid traps.",`<div class="game-runner-grid">${Array.from({length:16},(_,i)=>`<button class="game-cell" data-runner="${i}"></button>`).join("")}</div><div class="game-options">${["up","left","down","right"].map(d=>`<button class="game-action-btn" data-dir="${d}">${{up:"↑",down:"↓",left:"←",right:"→"}[d]}</button>`).join("")}</div>`);const draw=()=>body.querySelectorAll("[data-runner]").forEach((b,i)=>b.textContent=i===pos?"🧑":treasures.has(i)?"💎":traps.has(i)?"⚠️":"");draw();const move=d=>{const next=pos+({up:-4,down:4,left:-1,right:1}[d]);if(next<0||next>15||(d==="left"&&pos%4===0)||(d==="right"&&pos%4===3))return;pos=next;steps--;if(treasures.has(pos)){gem++;treasures.delete(pos);}if(traps.has(pos)){result("You hit a trap! Restart and find another route.");body.querySelectorAll("[data-dir]").forEach(b=>b.disabled=true);}else if(gem>=4){result(`All gems collected in ${15-steps} moves!`);}else if(steps===0){result(`Moves over · Gems found: ${gem}/4`);}else result(`${gem}/4 gems · ${steps} moves left`);draw();};on(body,"click",e=>{const d=e.target.closest("[data-dir]")?.dataset.dir;if(d)move(d);});
    },
    maze() {
      const walls=new Set([1,2,3,4,5,7,8,10,13,14,17,19,20,21,22,23,30,31,32,33,34]);let pos=0;frame("Find the exit at the bottom-right. Arrow buttons move one step.",`<div class="game-board game-maze-grid">${Array.from({length:36},(_,i)=>`<button class="game-cell" data-maze="${i}"></button>`).join("")}</div><div class="game-options">${["up","left","down","right"].map(d=>`<button class="game-action-btn" data-dir="${d}">${{up:"↑",down:"↓",left:"←",right:"→"}[d]}</button>`).join("")}</div>`);const draw=()=>body.querySelectorAll("[data-maze]").forEach((b,i)=>{b.textContent=i===pos?"🧍":i===35?"🏁":walls.has(i)?"■":"";b.classList.toggle("is-wall",walls.has(i));});draw();const move=d=>{const n=pos+({up:-6,down:6,left:-1,right:1}[d]);if(n<0||n>35||(d==="left"&&pos%6===0)||(d==="right"&&pos%6===5)||walls.has(n))return;pos=n;draw();result(pos===35?"You escaped the maze!":"Keep going to the exit.");};on(body,"click",e=>{const d=e.target.closest("[data-dir]")?.dataset.dir;if(d)move(d);});
    },
    typing() {
      const phrases=["save a little every day","small steps build big goals","plan spend and save","money grows with good habits"];const phrase=phrases[random(phrases.length)];let time=20;frame(`Type this phrase accurately before 20 seconds run out: “${phrase}”`,`<input class="game-input" data-type autocomplete="off" placeholder="Start typing…"><div class="game-big" data-typing>20</div>`);on(el("[data-type]"),"input",e=>{if(e.target.value===phrase){stop();result(`Perfect typing! ${phrase.length} characters.`);}else if(!phrase.startsWith(e.target.value))result("Check the phrase and try again.");});every(()=>{time--;el("[data-typing]").textContent=time;if(time<=0){stop();result("Time is up. Restart for a new phrase.");}},1000);
    },
    wordsearch() {
      const words=["SAVE","PLAY","GOAL","COIN"],letters=Array.from({length:25},()=>"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[random(26)]);words.forEach((word,row)=>{for(let c=0;c<word.length;c++)letters[row*5+c]=word[c];});frame(`Find these words in the first four rows: ${words.join(" · ")}.`, `<div class="game-board game-word-grid">${letters.map((x,i)=>`<button class="game-cell" data-letter="${i}">${x}</button>`).join("")}</div><input class="game-input" data-input autocomplete="off" placeholder="Type a word you found">${action("Check word","check-search")}`);on(el("[data-action=check-search]"),"click",()=>{const input=el("[data-input]").value.trim().toUpperCase();if(words.includes(input)){result(`${input} found! Find another.`);words.splice(words.indexOf(input),1);if(!words.length)result("All hidden words found!");}else result("That word is not in the list yet.");});
    },
    pattern() {
      const seq=Array.from({length:10},()=>random(9));let index=0,round=3,locked=false;frame("Repeat the glowing squares in the same order.",`<div class="game-board game-pattern-grid">${Array.from({length:9},(_,i)=>`<button class="game-cell" data-pattern="${i}"></button>`).join("")}</div>${action("Show pattern","show-pattern")}`);const flash=i=>{const b=el(`[data-pattern="${i}"]`);b.classList.add("is-open");later(()=>b.classList.remove("is-open"),260);};const show=()=>{locked=true;result("Watch closely…");for(let i=0;i<round;i++)later(()=>flash(seq[i]),450+i*450);later(()=>{locked=false;index=0;result("Your turn!");},500+round*450);};on(body,"click",e=>{if(e.target.closest("[data-action=show-pattern]")){show();return;}const b=e.target.closest("[data-pattern]");if(!b||locked)return;const i=Number(b.dataset.pattern);flash(i);if(i!==seq[index]){result("Pattern missed. Restart to play again.");locked=true;return;}index++;if(index===round){round=Math.min(round+1,10);result(`Perfect! Pattern length ${round}.`);locked=true;later(show,600);}});
    },
    odd() {
      let score=0;const rounds=Array.from({length:10},()=>{const icons=["🍒","🍋","🍇","🍎","🍊"];const odd=random(9);return{icons,odd};});let round=0;frame("Tap the one symbol that is different.",`<div class="game-board game-odd-grid" data-odd></div>`);const draw=()=>{const r=rounds[round];if(!r){result(`Game finished · ${score}/10 correct!`);return;}el("[data-odd]").innerHTML=Array.from({length:9},(_,i)=>`<button class="game-cell" data-odd-cell="${i}">${r.icons[i===r.odd?4:1+random(3)]}</button>`).join("");};draw();on(body,"click",e=>{const b=e.target.closest("[data-odd-cell]");if(!b)return;score+=Number(b.dataset.oddCell)===rounds[round].odd?1:0;round++;result(`${score} correct · ${10-round} rounds left`);draw();});
    },
    beat() {
      let taps=[],start=0;frame("Tap the button ten times with a steady one-second rhythm.",`<div class="game-big" data-beat>0 / 10</div>${action("Tap the beat","beat-tap")}`);on(el("[data-action=beat-tap]"),"click",()=>{const now=performance.now();if(start)taps.push(now-start);start=now;el("[data-beat]").textContent=`${taps.length} / 10`;if(taps.length>=10){const avg=taps.reduce((a,b)=>a+b,0)/taps.length;result(`Average beat: ${(avg/1000).toFixed(2)}s · ${Math.abs(avg-1000)<120?"Perfect rhythm!":"Try to stay near one second."}`);el("[data-action=beat-tap]").disabled=true;}});
    },
    colorreflex() {
      let rounds=0,score=0,target="";const colors=[["Rose","#ff014f"],["Leaf","#3eb75e"],["Sky","#1ba2db"],["Sun","#ff8f3c"]];frame("Tap the color name that matches the color shown.",`<div class="game-color-swatch" data-reflex></div><div class="game-options">${colors.map(([name])=>action(name,`reflex-${name}`)).join("")}</div>`);const next=()=>{target=colors[random(4)][0];el("[data-reflex]").style.background=colors.find(x=>x[0]===target)[1];};next();on(body,"click",e=>{const name=e.target.closest("[data-action^=reflex-]")?.dataset.action.slice(7);if(!name)return;rounds++;if(name===target)score++;if(rounds===10){result(`Final score: ${score}/10`);body.querySelectorAll("[data-action^=reflex-]").forEach(b=>b.disabled=true);}else{result(`${score} correct · ${10-rounds} left`);next();}});
    },
    mathsprint() {
      let score=0,seconds=30,a,b;const ask=()=>{a=random(20)+1;b=random(20)+1;el("[data-question]").textContent=`${a} + ${b} = ?`;el("[data-input]").value="";};frame("Solve as many sums as possible in 30 seconds.",`<div class="game-big" data-question></div><input class="game-input" data-input inputmode="numeric" type="number" placeholder="Answer"><button class="game-action-btn" data-action="answer">Submit</button>`);ask();on(el("[data-action=answer]"),"click",()=>{if(Number(el("[data-input]").value)===a+b)score++;el("[data-score]")?.remove();result(`Score: ${score}`);ask();});every(()=>{seconds--;if(seconds<=0){stop();body.querySelector("[data-action=answer]").disabled=true;result(`Time! Final score: ${score}`);}else if(seconds%10===0)result(`${seconds}s left · Score: ${score}`);},1000);
    },
    prime() {
      const primes=[2,3,5,7,11,13,17,19,23,29];let found=new Set(),wrong=0;frame("Tap every prime number from 1 to 30. Avoid the decoys.",`<div class="game-board game-prime-grid">${Array.from({length:30},(_,i)=>`<button class="game-cell" data-prime="${i+1}">${i+1}</button>`).join("")}</div>`);on(body,"click",e=>{const b=e.target.closest("[data-prime]");if(!b)return;const n=Number(b.dataset.prime);b.disabled=true;if(primes.includes(n)){found.add(n);b.classList.add("is-open");result(`${found.size}/10 primes found`);}else{wrong++;b.classList.add("is-wrong");result(`Composite number · ${wrong} miss${wrong===1?"":"es"}`);}if(found.size===10){result(`All primes found${wrong?` with ${wrong} misses`:" clean sweep"}!`);body.querySelectorAll("[data-prime]").forEach(x=>x.disabled=true);}});
    },
    anagram() {
      const words=["PUZZLE","ARCADE","POCKET","ORANGE","PLANET","BREEZE","GARDEN","MOBILE"];let score=0,seconds=30,answer="";const next=()=>{answer=words[random(words.length)];el("[data-scramble]").textContent=answer.split("").sort(()=>Math.random()-.5).join("");el("[data-input]").value="";};frame("Solve as many anagrams as you can in 30 seconds.",`<div class="game-big" data-scramble></div><input class="game-input" data-input autocomplete="off" placeholder="Unscrambled word">${action("Check","check-anagram")}`);next();on(el("[data-action=check-anagram]"),"click",()=>{if(el("[data-input]").value.trim().toUpperCase()===answer){score++;result(`Correct! Score: ${score}`);next();}else result("Try again!");});every(()=>{seconds--;if(seconds<=0){stop();result(`Time! Final score: ${score}`);body.querySelectorAll("button,input").forEach(x=>x.disabled=true);}else if(seconds%10===0)result(`${seconds}s left · Score: ${score}`);},1000);
    },
    mixer() {
      const target=[random(255),random(255),random(255)];frame("Adjust the red, green, and blue sliders to match the target shade.",`<div class="game-color-swatch" data-target-shade></div><label>Red <input type="range" min="0" max="255" value="128" data-r></label><label>Green <input type="range" min="0" max="255" value="128" data-g></label><label>Blue <input type="range" min="0" max="255" value="128" data-b></label><div class="game-color-swatch" data-mix></div>${action("Check match","check-mix")}`);el("[data-target-shade]").style.background=`rgb(${target.join(",")})`;const update=()=>{const rgb=["r","g","b"].map(c=>Number(el(`[data-${c}]`).value));el("[data-mix]").style.background=`rgb(${rgb.join(",")})`;};on(body,"input",update);update();on(el("[data-action=check-mix]"),"click",()=>{const rgb=["r","g","b"].map(c=>Number(el(`[data-${c}]`).value));const diff=rgb.reduce((n,v,i)=>n+Math.abs(v-target[i]),0);result(diff<90?"Excellent color match!":`Color difference ${diff} · keep adjusting.`);});
    },
    tower() {
      let width=180,position=0,direction=1,height=0;frame("Tap Drop when the moving block lines up. Stack as high as you can.",`<div class="game-tower" data-tower><div class="game-tower-block" data-block></div></div>${action("Drop block","drop-tower")}`);const block=el("[data-block]");every(()=>{position+=direction*5;if(position>180||position<0)direction*=-1;block.style.transform=`translateX(${position}px)`;},35);on(el("[data-action=drop-tower]"),"click",()=>{height++;width=Math.max(38,width-12);block.style.width=`${width}px`;block.style.transform="translateX(0)";position=0;if(width<=38){result(`Tower complete · ${height} blocks tall!`);el("[data-action=drop-tower]").disabled=true;}else result(`${height} blocks tall · platform ${width}px wide.`);});
    },
    balance() {
      let balance=50,seconds=15;frame("Keep your balance between 35 and 65 for 15 seconds.",`<div class="game-balance-track"><div data-balance></div></div><div class="game-options">${action("← Lean","balance-left")}${action("Lean →","balance-right")}</div>`);const draw=()=>{el("[data-balance]").style.left=`${balance}%`;};draw();on(body,"click",e=>{const a=e.target.closest("[data-action]")?.dataset.action;if(a==="balance-left")balance=Math.max(0,balance-7);if(a==="balance-right")balance=Math.min(100,balance+7);draw();});every(()=>{seconds--;balance+=random(11)-5;draw();if(balance<15||balance>85){stop();result("You lost your balance! Restart and try again.");return;}if(seconds<=0){stop();result("Balance held! You win!");return;}result(`${seconds}s left · ${balance<35||balance>65?"Careful!":"Steady!"}`);},1000);
    },
    meteor() { arcadeCanvas("Switch lanes and avoid the falling meteors.","meteor"); },
    fruit() { arcadeCanvas("Move your basket to catch fruit and dodge bombs.","fruit"); },
    treasure() {
      const prize=random(25);let guesses=0;frame("Tap a tile. Hotter means closer to the hidden treasure.",`<div class="game-board game-treasure-grid">${Array.from({length:25},(_,i)=>`<button class="game-cell" data-treasure="${i}">?</button>`).join("")}</div>`);on(body,"click",e=>{const b=e.target.closest("[data-treasure]");if(!b||b.disabled)return;const i=Number(b.dataset.treasure);guesses++;b.disabled=true;if(i===prize){b.textContent="💎";result(`Treasure found in ${guesses} guesses!`);body.querySelectorAll("[data-treasure]").forEach(x=>x.disabled=true);return;}const d=Math.abs(i%5-prize%5)+Math.abs(Math.floor(i/5)-Math.floor(prize/5));b.textContent=d<2?"🔥":d<4?"🌤️":"❄️";result(d<2?"Very hot! Right nearby.":d<4?"Warm—getting closer.":"Cold—search elsewhere.");});
    },
    daily() {
      const day=new Date().toISOString().slice(0,10),seed=Array.from(day).reduce((a,c)=>a+c.charCodeAt(0),0),code=String((seed*7919)%9000+1000);let tries=0;frame("Crack today's four-digit code. Digits may repeat. You have six guesses.",`<input class="game-input" data-input inputmode="numeric" maxlength="4" placeholder="4-digit code">${action("Guess code","guess-daily")}`);on(el("[data-action=guess-daily]"),"click",()=>{const guess=el("[data-input]").value.trim();if(!/^\d{4}$/.test(guess))return result("Enter exactly four digits.");tries++;let exact=0,close=0;for(let i=0;i<4;i++)if(guess[i]===code[i])exact++;else if(code.includes(guess[i]))close++;if(guess===code){result(`Code cracked in ${tries} ${tries===1?"try":"tries"}! Come back tomorrow.`);el("[data-action=guess-daily]").disabled=true;}else if(tries>=6){result(`Today's code was ${code}. New code tomorrow.`);el("[data-action=guess-daily]").disabled=true;}else result(`${exact} exact · ${close} right digit, wrong spot · ${6-tries} guesses left`);});
    }
  };

  function arcadeCanvas(prompt, mode) {
    frame(prompt, `<canvas class="game-canvas" data-arcade width="320" height="220" aria-label="${mode} game"></canvas><div class="game-options">${action("← Left","arcade-left")}${action("Start / Move","arcade-start")}${action("Right →","arcade-right")}</div>`);
    const canvas=el("[data-arcade]"),ctx=canvas.getContext("2d");let player=1,score=0,tick=0,items=[],active=false,ball={x:160,y:110,dx:2.5,dy:2.1},paddle=145,bricks=Array.from({length:24},(_,i)=>({x:8+(i%8)*38,y:12+Math.floor(i/8)*20,on:true}));
    const move=d=>{if(mode==="breakout")paddle=Math.max(0,Math.min(260,paddle+d*22));else if(mode==="pong")paddle=Math.max(0,Math.min(168,paddle+d*22));else player=Math.max(0,Math.min(2,player+d));};on(body,"click",e=>{const a=e.target.closest("[data-action]")?.dataset.action;if(a==="arcade-left")move(-1);if(a==="arcade-right")move(1);if(a==="arcade-start")active=true;});
    on(canvas,"pointermove",e=>{const rect=canvas.getBoundingClientRect();if(mode==="pong")paddle=(e.clientY-rect.top)/rect.height*220-26;else if(mode==="breakout")paddle=(e.clientX-rect.left)/rect.width*320-30;else player=Math.max(0,Math.min(2,Math.floor((e.clientX-rect.left)/rect.width*3)));});
    const draw=()=>{ctx.clearRect(0,0,320,220);ctx.fillStyle="#ff014f";if(mode==="breakout"){bricks.filter(b=>b.on).forEach((b,i)=>{ctx.fillStyle=["#ff014f","#3eb75e","#1ba2db"][Math.floor(i/8)];ctx.fillRect(b.x,b.y,32,12);});ctx.fillStyle="#1e2125";ctx.fillRect(paddle,204,60,8);ctx.beginPath();ctx.arc(ball.x,ball.y,6,0,Math.PI*2);ctx.fill();}else if(mode==="pong"){ctx.fillStyle="#1ba2db";ctx.fillRect(12,paddle,8,52);ctx.fillStyle="#ff014f";ctx.fillRect(290,ball.y-23,8,46);ctx.beginPath();ctx.arc(ball.x,ball.y,6,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle="#3eb75e";ctx.fillRect(player*100+32,184,42,22);items.forEach(o=>{ctx.fillStyle=o.bomb?"#ff014f":"#ff8f3c";ctx.beginPath();ctx.arc(o.x,o.y,10,0,Math.PI*2);ctx.fill();});}};
    every(()=>{if(!active){draw();return;}tick++;
      if(mode==="breakout"){ball.x+=ball.dx;ball.y+=ball.dy;if(ball.x<6||ball.x>314)ball.dx*=-1;if(ball.y<5)ball.dy*=-1;if(ball.y>196&&ball.x>paddle&&ball.x<paddle+60)ball.dy=-Math.abs(ball.dy);const hit=bricks.find(b=>b.on&&ball.x>b.x&&ball.x<b.x+32&&ball.y>b.y&&ball.y<b.y+12);if(hit){hit.on=false;ball.dy*=-1;score++;}if(ball.y>220){active=false;result(`Ball lost · ${score}/24 bricks · Restart to replay.`);}if(score===24){active=false;result("All bricks cleared! You win!");}}
      else if(mode==="pong"){ball.x+=ball.dx;ball.y+=ball.dy;if(ball.y<5||ball.y>215)ball.dy*=-1;if(ball.x<25){if(Math.abs(ball.y-paddle-26)<34){ball.dx=Math.abs(ball.dx);score++;result(`Paddles returned: ${score}`);}else{active=false;result(`Missed! Score: ${score} · Restart to play.`);}}if(ball.x>284)ball.dx=-Math.abs(ball.dx);paddle=Math.max(0,Math.min(168,paddle));}
      else{if(tick%15===0)items.push({x:player*100+45+random(50)-25,y:10,bomb:mode==="meteor"||random(5)===0});items.forEach(o=>o.y+=4);items=items.filter(o=>{if(o.y>177&&o.y<210&&Math.floor(o.x/106)===player){if(o.bomb){active=false;result(`${mode==="meteor"?"Meteor collision":"Bomb hit"}! Score: ${score}`);}else{score++;result(`Fruit caught: ${score}`);}return false;}return o.y<224;});}
      draw();
    },45);
    draw();
  }

  function timedTap(prompt, label, kind) {
    let count=0,seconds=10,started=false;
    frame(prompt, `<div class="game-big" data-score>0</div>${action(label, "timed-tap")}`);
    result("10 seconds");
    on(el("[data-action=timed-tap]"),"click",(event)=>{
      if(seconds<=0)return;
      if(!started){started=true;const button=event.currentTarget;const timer=every(()=>{seconds--;result(seconds>0?`${seconds} seconds left`: `Time! Your score: ${count}`);if(seconds<=0){window.clearInterval(timer);button.disabled=true;}},1000);}
      count++;el("[data-score]").textContent=count;
    });
  }

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-start]");
    if (button) { previousFocus = button; showGame(button.dataset.start); }
  });
  launcher?.addEventListener("click", () => showView("gameCornerView"));
  backToSettings?.addEventListener("click", () => showView("settingsView"));
  search?.addEventListener("input", filterGames);
  cornerView.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    categoryFilter = button.dataset.filter;
    cornerView.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    filterGames();
  }));
  restart?.addEventListener("click", () => { if (activeGame) showGame(activeGame); });
  close?.addEventListener("click", closeGame);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !stage.classList.contains("hidden")) closeGame();
  });
  stage.addEventListener("click", (event) => {
    if (event.target === stage) closeGame();
  });
  document.addEventListener("keydown", (event) => {
    if (stage.classList.contains("hidden") || event.key !== "Tab") return;
    const focusable = [...stage.querySelectorAll("button:not(:disabled),input:not(:disabled),[tabindex='0']")];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener("keydown", (event) => {
    if (stage.classList.contains("hidden") || !["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.key)) return;
    if (!["2048", "snake"].includes(activeGame) || event.target.matches("input,textarea,select")) return;
    const direction={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"}[event.key];
    if (activeGame === "2048") { event.preventDefault(); el(`[data-dir="${direction}"]`)?.click(); }
    else if (activeGame === "snake") { event.preventDefault(); body.querySelector(`[data-dir="${direction}"]`)?.click(); }
  });
})();
