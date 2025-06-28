// Check if PIXI is available
if (typeof PIXI === 'undefined') {
  console.error('PIXI.js library is not loaded!');
  document.body.innerHTML = '<div style="color: white; text-align: center; padding: 50px;">PIXI.js yüklenemedi. Sayfayı yenileyin.</div>';
} else {
  console.log('PIXI.js loaded successfully');
}

// Create the application helper and add its render target to the page
let app = new PIXI.Application({ 
  width: 800, 
  height: 600,
  backgroundColor: 0x87CEEB // Light Blue
});

// Add error handling
try {
  document.getElementById('game-container').appendChild(app.view);
} catch (error) {
  console.error('Error adding canvas to DOM:', error);
  document.body.appendChild(app.view);
}

// Game variables
let player;
let obstacles = [];
let collectibles = [];
let score = 0;
let gameSpeed = 2;
let spawnTimer = 0;
let collectibleTimer = 0;
let gameRunning = true;
let keys = {};

// Game UI
let scoreText;
let gameOverText;

// Initialize game
function initGame() {
  // Create player ball
  player = new PIXI.Graphics();
  player.beginFill(0x00ff88);
  player.drawCircle(0, 0, 15);
  player.endFill();
  player.x = 100;
  player.y = app.screen.height / 2;
  app.stage.addChild(player);

  // Create score text
  scoreText = new PIXI.Text('Score: 0', {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff,
    align: 'left'
  });
  scoreText.x = 10;
  scoreText.y = 10;
  app.stage.addChild(scoreText);

  // Create game over text (hidden initially)
  gameOverText = new PIXI.Text('GAME OVER\nPress R to Restart', {
    fontFamily: 'Arial',
    fontSize: 48,
    fill: 0xff4444,
    align: 'center'
  });
  gameOverText.anchor.set(0.5);
  gameOverText.x = app.screen.width / 2;
  gameOverText.y = app.screen.height / 2;
  gameOverText.visible = false;
  app.stage.addChild(gameOverText);
}

// Create obstacle
function createObstacle() {
  const obstacle = new PIXI.Graphics();
  const colors = [0xff4444, 0xff8844, 0xffff44, 0x8844ff, 0x4444ff];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  obstacle.beginFill(color);
  obstacle.drawRect(0, 0, 30, 60);
  obstacle.endFill();
  
  obstacle.x = app.screen.width;
  obstacle.y = Math.random() * (app.screen.height - 60);
  obstacle.speed = gameSpeed + Math.random() * 2;
  
  app.stage.addChild(obstacle);
  obstacles.push(obstacle);
}

// Create collectible star
function createCollectible() {
  const star = new PIXI.Graphics();
  const colors = [0xffff00, 0x00ffff, 0xff00ff, 0x00ff00];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  star.beginFill(color);
  // Draw star shape
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const x = Math.cos(angle) * 10;
    const y = Math.sin(angle) * 10;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
    
    const innerAngle = ((i + 0.5) * Math.PI * 2) / 5;
    const innerX = Math.cos(innerAngle) * 5;
    const innerY = Math.sin(innerAngle) * 5;
    star.lineTo(innerX, innerY);
  }
  star.endFill();
  
  star.x = app.screen.width;
  star.y = Math.random() * app.screen.height;
  star.speed = gameSpeed;
  star.rotation = 0;
  
  app.stage.addChild(star);
  collectibles.push(star);
}

// Check collision between two objects
function checkCollision(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < 25; // Collision threshold
}

// Update player position
function updatePlayer() {
  if (keys['ArrowUp'] || keys['KeyW']) {
    player.y = Math.max(15, player.y - 5);
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    player.y = Math.min(app.screen.height - 15, player.y + 5);
  }
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x = Math.max(15, player.x - 5);
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.x = Math.min(app.screen.width - 15, player.x + 5);
  }

  // Add pulsing effect to player
  const time = Date.now() * 0.01;
  player.scale.set(1 + Math.sin(time) * 0.1);
  const hue = (Date.now() * 0.01) % 360;
  player.tint = PIXI.utils.rgb2hex([
    0.5 + 0.5 * Math.sin((hue * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 120) * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 240) * Math.PI) / 180)
  ]);
}

// Update obstacles
function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.x -= obstacle.speed;
    
    // Add rotation effect
    obstacle.rotation += 0.02;
    
    // Remove if off screen
    if (obstacle.x < -50) {
      app.stage.removeChild(obstacle);
      obstacles.splice(i, 1);
      score += 10;
      continue;
    }
    
    // Check collision with player
    if (checkCollision(player, obstacle)) {
      gameOver();
      return;
    }
  }
}

// Update collectibles
function updateCollectibles() {
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const collectible = collectibles[i];
    collectible.x -= collectible.speed;
    collectible.rotation += 0.1;
    
    // Add floating effect
    const time = Date.now() * 0.005;
    collectible.y += Math.sin(time + i) * 0.5;
    
    // Remove if off screen
    if (collectible.x < -20) {
      app.stage.removeChild(collectible);
      collectibles.splice(i, 1);
      continue;
    }
    
    // Check collision with player
    if (checkCollision(player, collectible)) {
      app.stage.removeChild(collectible);
      collectibles.splice(i, 1);
      score += 50;
      
      // Visual effect for collection
      createParticleEffect(collectible.x, collectible.y);
    }
  }
}

// Create particle effect
function createParticleEffect(x, y) {
  for (let i = 0; i < 8; i++) {
    const particle = new PIXI.Graphics();
    particle.beginFill(0xffff00);
    particle.drawCircle(0, 0, 3);
    particle.endFill();
    
    particle.x = x;
    particle.y = y;
    
    const angle = (i / 8) * Math.PI * 2;
    particle.vx = Math.cos(angle) * 3;
    particle.vy = Math.sin(angle) * 3;
    particle.life = 30;
    
    app.stage.addChild(particle);
    
    // Animate particle
    const animateParticle = () => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.alpha -= 0.03;
      particle.life--;
      
      if (particle.life <= 0) {
        app.stage.removeChild(particle);
      } else {
        requestAnimationFrame(animateParticle);
      }
    };
    animateParticle();
  }
}

// Game over
function gameOver() {
  gameRunning = false;
  gameOverText.visible = true;
  
  // Screen shake effect
  let shakeIntensity = 10;
  const shake = () => {
    if (shakeIntensity > 0) {
      app.stage.x = (Math.random() - 0.5) * shakeIntensity;
      app.stage.y = (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.9;
      setTimeout(shake, 50);
    } else {
      app.stage.x = 0;
      app.stage.y = 0;
    }
  };
  shake();
}

// Restart game
function restartGame() {
  // Clear all objects
  obstacles.forEach(obstacle => app.stage.removeChild(obstacle));
  collectibles.forEach(collectible => app.stage.removeChild(collectible));
  obstacles = [];
  collectibles = [];
  
  // Reset game state
  score = 0;
  gameSpeed = 2;
  gameRunning = true;
  gameOverText.visible = false;
  
  // Reset player position
  player.x = 100;
  player.y = app.screen.height / 2;
}

// Keyboard event handlers
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  
  if (e.code === 'KeyR' && !gameRunning) {
    restartGame();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Touch controls for mobile
let touchStartY = 0;
let touchStartX = 0;

app.view.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
});

app.view.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!gameRunning) return;
  
  const touchY = e.touches[0].clientY;
  const touchX = e.touches[0].clientX;
  const deltaY = touchY - touchStartY;
  const deltaX = touchX - touchStartX;
  
  player.y = Math.max(15, Math.min(app.screen.height - 15, player.y + deltaY * 0.5));
  player.x = Math.max(15, Math.min(app.screen.width - 15, player.x + deltaX * 0.5));
  
  touchStartY = touchY;
  touchStartX = touchX;
});

// Game loop
app.ticker.add((delta) => {
  if (!gameRunning) return;
  
  updatePlayer();
  updateObstacles();
  updateCollectibles();
  
  // Spawn obstacles
  spawnTimer += delta;
  if (spawnTimer > 60 - gameSpeed * 5) {
    createObstacle();
    spawnTimer = 0;
  }
  
  // Spawn collectibles
  collectibleTimer += delta;
  if (collectibleTimer > 180) {
    createCollectible();
    collectibleTimer = 0;
  }
  
  // Increase difficulty over time
  gameSpeed += 0.001;
  
  // Update score display
  scoreText.text = `Score: ${score}`;
  
  // Change player color based on speed
  const hue = (Date.now() * 0.01) % 360;
  player.tint = PIXI.utils.rgb2hex([
    0.5 + 0.5 * Math.sin((hue * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 120) * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 240) * Math.PI) / 180)
  ]);
});

// Initialize the game
initGame();
