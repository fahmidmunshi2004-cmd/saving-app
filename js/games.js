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
    ["Target Score", "Roll points and try to hit the target exactly.", "fa-bullseye", "target", "Arcade"]
  ];

  const grid = document.getElementById("gameCornerGrid");
  const stage = document.getElementById("gameStage");
  const body = document.getElementById("gameStageBody");
  const title = document.getElementById("activeGameTitle");
  const restart = document.getElementById("restartGameBtn");
  const close = document.getElementById("closeGameBtn");
  if (!grid || !stage || !body || !title) return;

  let activeGame = null;
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
    body.replaceChildren();
  };

  grid.innerHTML = games.map(([name, desc, icon, id, category], index) => `
    <article class="game-card">
      <div class="game-card-top"><span class="game-card-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><span class="game-category">${category}</span></div>
      <h3>${String(index + 1).padStart(2, "0")}. ${name}</h3>
      <p>${desc}</p>
      <button class="game-play-btn" type="button" data-start="${id}">Play now <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
    </article>`).join("");

  const showGame = (id) => {
    stop();
    activeGame = id;
    const selected = games.find((game) => game[3] === id);
    if (!selected) return;
    title.textContent = selected[0];
    stage.classList.remove("hidden");
    stage.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    }
  };

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
    if (button) showGame(button.dataset.start);
  });
  restart?.addEventListener("click", () => { if (activeGame) showGame(activeGame); });
  close?.addEventListener("click", closeGame);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !stage.classList.contains("hidden")) closeGame();
  });
  document.addEventListener("keydown", (event) => {
    if (stage.classList.contains("hidden") || !["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.key)) return;
    if (!["2048", "snake"].includes(activeGame) || event.target.matches("input,textarea,select")) return;
    const direction={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"}[event.key];
    if (activeGame === "2048") { event.preventDefault(); el(`[data-dir="${direction}"]`)?.click(); }
    else if (activeGame === "snake") { event.preventDefault(); body.querySelector(`[data-dir="${direction}"]`)?.click(); }
  });
})();
