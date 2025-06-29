// Check if PIXI is available
if (typeof PIXI === 'undefined') {
  console.error('PIXI.js library is not loaded!');
  document.body.innerHTML = '<div style="color: white; text-align: center; padding: 50px;">PIXI.js yüklenemedi. Sayfayı yenileyin.</div>';
} else {
  console.log('PIXI.js loaded successfully');
}

// Audio system
let audioEnabled = true;
let musicEnabled = true;
let sfxEnabled = true;

// Sound effects
const sounds = {
  collect: new Howl({
    src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'],
    volume: 0.3
  }),
  collision: new Howl({
    src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'],
    volume: 0.5
  }),
  jump: new Howl({
    src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'],
    volume: 0.4
  }),
  gameOver: new Howl({
    src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'],
    volume: 0.6
  }),
  background: new Howl({
    src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'],
    volume: 0.2,
    loop: true
  })
};

// Audio functions
function playSound(soundName, x = null) {
  if (!sfxEnabled) return;
  
  const sound = sounds[soundName];
  if (sound && x !== null) {
    // 3D positional audio
    const pan = (x - app.screen.width / 2) / (app.screen.width / 2);
    sound.stereo(pan);
  }
  sound.play();
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    sounds.background.play();
    document.getElementById('toggle-music').textContent = '🔊 Music: ON';
  } else {
    sounds.background.stop();
    document.getElementById('toggle-music').textContent = '🔇 Music: OFF';
  }
}

function toggleSFX() {
  sfxEnabled = !sfxEnabled;
  document.getElementById('toggle-sfx').textContent = sfxEnabled ? '🔊 SFX: ON' : '🔇 SFX: OFF';
}

// Physics constants
const GRAVITY = 0.3;
const FRICTION = 0.98;
const BOUNCE_DAMPING = 0.7;
const MAX_VELOCITY = 8;

// Create the application helper and add its render target to the page
let app = new PIXI.Application({ 
  width: 800, 
  height: 600,
  backgroundColor: 0x87CEEB, // Light Blue
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  powerPreference: "high-performance"
});

// Enable interaction
app.stage.interactive = true;
app.stage.buttonMode = true;

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
let enemies = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameSpeed = 2;
let spawnTimer = 0;
let collectibleTimer = 0;
let enemySpawnTimer = 0;
let gameRunning = false;
let gameStarted = false;
let keys = {};

// Player stats
let playerHealth = 100;
let playerEnergy = 100;
let playerLevel = 1;

// Physics objects
let physicsObjects = [];

// Enemy AI states
const ENEMY_STATES = {
  IDLE: 'idle',
  CHASE: 'chase',
  ATTACK: 'attack',
  FLEE: 'flee'
};

// Enemy AI class
class EnemyAI extends PhysicsObject {
  constructor(x, y, radius, mass = 1) {
    super(x, y, radius, mass);
    this.state = ENEMY_STATES.IDLE;
    this.target = null;
    this.detectionRange = 150;
    this.attackRange = 30;
    this.fleeRange = 80;
    this.speed = 2;
    this.health = 100;
    this.lastAttackTime = 0;
    this.attackCooldown = 1000; // 1 second
    this.stateTimer = 0;
    this.maxStateTime = 3000; // 3 seconds
  }

  update() {
    super.update();
    
    // Update AI behavior
    this.updateAI();
    
    // Update state timer
    this.stateTimer += 16; // Assuming 60 FPS
    
    // Change state if timer expires
    if (this.stateTimer > this.maxStateTime) {
      this.changeState(ENEMY_STATES.IDLE);
    }
  }

  updateAI() {
    if (!this.target) return;
    
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    switch (this.state) {
      case ENEMY_STATES.IDLE:
        this.idleBehavior();
        if (distance < this.detectionRange) {
          this.changeState(ENEMY_STATES.CHASE);
        }
        break;
        
      case ENEMY_STATES.CHASE:
        this.chaseBehavior();
        if (distance < this.attackRange) {
          this.changeState(ENEMY_STATES.ATTACK);
        } else if (distance > this.detectionRange * 1.5) {
          this.changeState(ENEMY_STATES.IDLE);
        }
        break;
        
      case ENEMY_STATES.ATTACK:
        this.attackBehavior();
        if (distance > this.attackRange) {
          this.changeState(ENEMY_STATES.CHASE);
        }
        break;
        
      case ENEMY_STATES.FLEE:
        this.fleeBehavior();
        if (distance > this.fleeRange) {
          this.changeState(ENEMY_STATES.IDLE);
        }
        break;
    }
  }

  idleBehavior() {
    // Random movement
    if (Math.random() < 0.02) {
      this.applyForce((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
    }
  }

  chaseBehavior() {
    if (!this.target) return;
    
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const forceX = (dx / distance) * this.speed;
      const forceY = (dy / distance) * this.speed;
      this.applyForce(forceX, forceY);
    }
  }

  attackBehavior() {
    if (!this.target) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastAttackTime > this.attackCooldown) {
      // Attack logic
      this.lastAttackTime = currentTime;
      
      // Apply damage to player (if we had a health system)
      // For now, just play collision sound
      playSound('collision', this.x);
    }
  }

  fleeBehavior() {
    if (!this.target) return;
    
    const dx = this.x - this.target.x;
    const dy = this.y - this.target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const forceX = (dx / distance) * this.speed * 1.5;
      const forceY = (dy / distance) * this.speed * 1.5;
      this.applyForce(forceX, forceY);
    }
  }

  changeState(newState) {
    this.state = newState;
    this.stateTimer = 0;
  }

  takeDamage(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      return true; // Enemy should be destroyed
    }
    return false;
  }
}

// UI elements
let scoreText;
let highScoreText;
let healthBar;
let energyBar;
let levelText;
let gameOverText;
let pauseMenu;
let startMenu;

// Screen shake
let screenShake = { x: 0, y: 0, intensity: 0 };

// Physics object class
class PhysicsObject {
  constructor(x, y, radius, mass = 1) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.mass = mass;
    this.onGround = false;
    this.graphics = null;
  }

  update() {
    // Apply gravity
    this.vy += GRAVITY;
    
    // Apply friction when on ground
    if (this.onGround) {
      this.vx *= FRICTION;
    }
    
    // Limit velocity
    this.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.vx));
    this.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.vy));
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Ground collision
    if (this.y + this.radius > app.screen.height) {
      this.y = app.screen.height - this.radius;
      this.vy = -this.vy * BOUNCE_DAMPING;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    
    // Wall collisions
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = -this.vx * BOUNCE_DAMPING;
    }
    if (this.x + this.radius > app.screen.width) {
      this.x = app.screen.width - this.radius;
      this.vx = -this.vx * BOUNCE_DAMPING;
    }
    
    // Update graphics position
    if (this.graphics) {
      this.graphics.x = this.x;
      this.graphics.y = this.y;
    }
  }

  applyForce(fx, fy) {
    this.vx += fx / this.mass;
    this.vy += fy / this.mass;
  }

  checkCollision(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + other.radius;
  }

  resolveCollision(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const nx = dx / distance;
    const ny = dy / distance;
    
    const relativeVelocityX = other.vx - this.vx;
    const relativeVelocityY = other.vy - this.vy;
    
    const speed = relativeVelocityX * nx + relativeVelocityY * ny;
    
    if (speed > 0) return;
    
    const restitution = 0.8;
    const impulse = 2 * speed / (this.mass + other.mass);
    
    this.vx -= impulse * other.mass * nx;
    this.vy -= impulse * other.mass * ny;
    other.vx += impulse * this.mass * nx;
    other.vy += impulse * this.mass * ny;
  }
}

// Initialize game
function initGame() {
  // Initialize background
  initBackground();
  
  // Create player with physics
  player = new PhysicsObject(100, app.screen.height / 2, 15, 2);
  
  player.graphics = new PIXI.Graphics();
  player.graphics.beginFill(0x00ff88);
  player.graphics.drawCircle(0, 0, 15);
  player.graphics.endFill();
  
  // Add glow effect to player
  addGlowEffect(player.graphics, 0x00ff88, 0.3);
  
  player.graphics.x = player.x;
  player.graphics.y = player.y;
  app.stage.addChild(player.graphics);
  
  physicsObjects.push(player);

  // Initialize UI
  initUI();
  
  console.log('Game initialized successfully');
}

// Create obstacle with physics
function createObstacle() {
  const obstacle = new PhysicsObject(
    app.screen.width + 30, 
    Math.random() * (app.screen.height - 60) + 30, 
    15, 
    5
  );
  
  const colors = [0xff4444, 0xff8844, 0xffff44, 0x8844ff, 0x4444ff];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  obstacle.graphics = new PIXI.Graphics();
  obstacle.graphics.beginFill(color);
  obstacle.graphics.drawRect(-15, -15, 30, 30);
  obstacle.graphics.endFill();
  obstacle.graphics.x = obstacle.x;
  obstacle.graphics.y = obstacle.y;
  
  obstacle.vx = -(gameSpeed + Math.random() * 2);
  
  app.stage.addChild(obstacle.graphics);
  obstacles.push(obstacle);
  physicsObjects.push(obstacle);
}

// Create collectible star with physics
function createCollectible() {
  const star = new PhysicsObject(
    app.screen.width + 20, 
    Math.random() * app.screen.height, 
    10, 
    0.5
  );
  
  const colors = [0xffff00, 0x00ffff, 0xff00ff, 0x00ff00];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  star.graphics = new PIXI.Graphics();
  star.graphics.beginFill(color);
  // Draw star shape
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const x = Math.cos(angle) * 10;
    const y = Math.sin(angle) * 10;
    if (i === 0) star.graphics.moveTo(x, y);
    else star.graphics.lineTo(x, y);
    
    const innerAngle = ((i + 0.5) * Math.PI * 2) / 5;
    const innerX = Math.cos(innerAngle) * 5;
    const innerY = Math.sin(innerAngle) * 5;
    star.graphics.lineTo(innerX, innerY);
  }
  star.graphics.endFill();
  star.graphics.x = star.x;
  star.graphics.y = star.y;
  
  star.vx = -gameSpeed;
  
  app.stage.addChild(star.graphics);
  collectibles.push(star);
  physicsObjects.push(star);
}

// Create enemy with AI
function createEnemy() {
  const enemy = new EnemyAI(
    app.screen.width + 30,
    Math.random() * (app.screen.height - 60) + 30,
    12,
    3
  );
  
  enemy.target = player;
  
  // Create enemy graphics
  enemy.graphics = new PIXI.Graphics();
  enemy.graphics.beginFill(0xff0000);
  enemy.graphics.drawCircle(0, 0, 12);
  enemy.graphics.endFill();
  
  // Add enemy indicator
  const indicator = new PIXI.Graphics();
  indicator.beginFill(0xff6666);
  indicator.drawCircle(0, 0, 8);
  indicator.endFill();
  enemy.graphics.addChild(indicator);
  
  enemy.graphics.x = enemy.x;
  enemy.graphics.y = enemy.y;
  
  app.stage.addChild(enemy.graphics);
  enemies.push(enemy);
  physicsObjects.push(enemy);
}

// Check collision between two objects
function checkCollision(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < obj1.radius + obj2.radius;
}

// Update player position with physics
function updatePlayer() {
  if (!gameStarted) return;
  
  let jumped = false;
  
  // Apply forces based on input
  if (keys['ArrowUp'] || keys['KeyW']) {
    player.applyForce(0, -15);
    if (!player.onGround) {
      jumped = true;
    }
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    player.applyForce(0, 5);
  }
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.applyForce(-8, 0);
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.applyForce(8, 0);
  }

  // Play jump sound
  if (jumped) {
    playSound('jump', player.x);
  }

  // Create trail effect
  createTrailEffect(player.x, player.y);

  // Add pulsing effect to player
  const time = Date.now() * 0.01;
  player.graphics.scale.set(1 + Math.sin(time) * 0.1);
  const hue = (Date.now() * 0.01) % 360;
  player.graphics.tint = PIXI.utils.rgb2hex([
    0.5 + 0.5 * Math.sin((hue * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 120) * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 240) * Math.PI) / 180)
  ]);
}

// Update physics for all objects
function updatePhysics() {
  // Update all physics objects
  physicsObjects.forEach(obj => obj.update());
  
  // Check collisions between all objects
  for (let i = 0; i < physicsObjects.length; i++) {
    for (let j = i + 1; j < physicsObjects.length; j++) {
      if (physicsObjects[i].checkCollision(physicsObjects[j])) {
        physicsObjects[i].resolveCollision(physicsObjects[j]);
      }
    }
  }
}

// Update obstacles
function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    
    // Add rotation effect
    obstacle.graphics.rotation += 0.02;
    
    // Remove if off screen
    if (obstacle.x < -50) {
      app.stage.removeChild(obstacle.graphics);
      obstacles.splice(i, 1);
      physicsObjects.splice(physicsObjects.indexOf(obstacle), 1);
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
    collectible.graphics.rotation += 0.1;
    
    // Add floating effect
    const time = Date.now() * 0.005;
    collectible.y += Math.sin(time + i) * 0.5;
    
    // Remove if off screen
    if (collectible.x < -20) {
      app.stage.removeChild(collectible.graphics);
      collectibles.splice(i, 1);
      physicsObjects.splice(physicsObjects.indexOf(collectible), 1);
      continue;
    }
    
    // Check collision with player
    if (checkCollision(player, collectible)) {
      app.stage.removeChild(collectible.graphics);
      collectibles.splice(i, 1);
      physicsObjects.splice(physicsObjects.indexOf(collectible), 1);
      score += 50;
      
      // Play collect sound
      playSound('collect', collectible.x);
      
      // Visual effect for collection
      createParticleEffect(collectible.x, collectible.y);
    }
  }
}

// Update enemies
function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // Update enemy color based on state
    switch (enemy.state) {
      case ENEMY_STATES.IDLE:
        enemy.graphics.tint = 0xff6666;
        break;
      case ENEMY_STATES.CHASE:
        enemy.graphics.tint = 0xff4444;
        break;
      case ENEMY_STATES.ATTACK:
        enemy.graphics.tint = 0xff0000;
        break;
      case ENEMY_STATES.FLEE:
        enemy.graphics.tint = 0xff8888;
        break;
    }
    
    // Add pulsing effect when attacking
    if (enemy.state === ENEMY_STATES.ATTACK) {
      const time = Date.now() * 0.01;
      enemy.graphics.scale.set(1 + Math.sin(time * 5) * 0.2);
    } else {
      enemy.graphics.scale.set(1);
    }
    
    // Remove if off screen
    if (enemy.x < -50) {
      app.stage.removeChild(enemy.graphics);
      enemies.splice(i, 1);
      physicsObjects.splice(physicsObjects.indexOf(enemy), 1);
      continue;
    }
    
    // Check collision with player
    if (checkCollision(player, enemy)) {
      if (enemy.state === ENEMY_STATES.ATTACK) {
        gameOver();
        return;
      } else {
        // Push player away
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          player.applyForce((dx / distance) * 10, (dy / distance) * 10);
        }
        playSound('collision', enemy.x);
      }
    }
  }
}

// Particle system
let particles = [];

// Background layers for parallax
let backgroundLayers = [];

// Initialize background
function initBackground() {
  // Create multiple background layers for parallax effect
  for (let i = 0; i < 3; i++) {
    const layer = new PIXI.Graphics();
    const alpha = 0.3 - i * 0.1;
    const speed = 0.1 + i * 0.2;
    
    // Draw clouds
    for (let j = 0; j < 5; j++) {
      layer.beginFill(0xffffff, alpha);
      const x = Math.random() * app.screen.width * 2;
      const y = Math.random() * app.screen.height * 0.6;
      const size = 20 + Math.random() * 40;
      layer.drawCircle(x, y, size);
      layer.endFill();
    }
    
    layer.x = 0;
    layer.y = 0;
    layer.speed = speed;
    app.stage.addChildAt(layer, 0);
    backgroundLayers.push(layer);
  }
}

// Enhanced particle system
class Particle {
  constructor(x, y, color = 0xffff00, type = 'sparkle') {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = 60;
    this.maxLife = 60;
    this.color = color;
    this.type = type;
    this.size = Math.random() * 4 + 2;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    
    this.graphics = new PIXI.Graphics();
    this.drawParticle();
    app.stage.addChild(this.graphics);
  }
  
  drawParticle() {
    this.graphics.clear();
    
    switch (this.type) {
      case 'sparkle':
        this.graphics.beginFill(this.color);
        this.graphics.drawCircle(0, 0, this.size);
        this.graphics.endFill();
        break;
      case 'star':
        this.graphics.beginFill(this.color);
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const x = Math.cos(angle) * this.size;
          const y = Math.sin(angle) * this.size;
          if (i === 0) this.graphics.moveTo(x, y);
          else this.graphics.lineTo(x, y);
        }
        this.graphics.endFill();
        break;
      case 'trail':
        this.graphics.beginFill(this.color, 0.5);
        this.graphics.drawCircle(0, 0, this.size);
        this.graphics.endFill();
        break;
    }
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // Gravity
    this.life--;
    this.rotation += this.rotationSpeed;
    
    // Update graphics
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this.graphics.rotation = this.rotation;
    this.graphics.alpha = this.life / this.maxLife;
    this.graphics.scale.set(this.life / this.maxLife);
    
    return this.life > 0;
  }
  
  destroy() {
    app.stage.removeChild(this.graphics);
  }
}

// Create enhanced particle effect
function createParticleEffect(x, y, color = 0xffff00, count = 8) {
  for (let i = 0; i < count; i++) {
    const particle = new Particle(x, y, color, 'sparkle');
    particles.push(particle);
  }
}

// Create trail effect
function createTrailEffect(x, y) {
  if (Math.random() < 0.3) { // 30% chance
    const particle = new Particle(x, y, 0x00ff88, 'trail');
    particles.push(particle);
  }
}

// Update particles
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    if (!particle.update()) {
      particle.destroy();
      particles.splice(i, 1);
    }
  }
}

// Update background parallax
function updateBackground() {
  backgroundLayers.forEach((layer, index) => {
    layer.x -= layer.speed;
    if (layer.x < -app.screen.width) {
      layer.x = app.screen.width;
    }
  });
}

// Add glow effect to graphics
function addGlowEffect(graphics, color = 0x00ff88, intensity = 0.5) {
  const glow = new PIXI.Graphics();
  glow.beginFill(color, intensity);
  glow.drawCircle(0, 0, graphics.width || 20);
  glow.endFill();
  glow.blendMode = PIXI.BLEND_MODES.ADD;
  graphics.addChildAt(glow, 0);
}

// Game over
function gameOver() {
  gameRunning = false;
  gameOverText.visible = true;
  
  // Play game over sound
  playSound('gameOver');
  
  // Screen shake effect
  addScreenShake(15, 500);
}

// Restart game
function restartGame() {
  // Clear all objects
  obstacles.forEach(obstacle => app.stage.removeChild(obstacle.graphics));
  collectibles.forEach(collectible => app.stage.removeChild(collectible.graphics));
  enemies.forEach(enemy => app.stage.removeChild(enemy.graphics));
  particles.forEach(particle => particle.destroy());
  
  obstacles = [];
  collectibles = [];
  enemies = [];
  particles = [];
  physicsObjects = [];
  
  // Reset game state
  score = 0;
  gameSpeed = 2;
  gameRunning = true;
  gameStarted = true;
  gameOverText.visible = false;
  pauseMenu.visible = false;
  
  // Reset player stats
  playerHealth = 100;
  playerEnergy = 100;
  playerLevel = 1;
  
  // Reset player position
  player.x = 100;
  player.y = app.screen.height / 2;
  player.vx = 0;
  player.vy = 0;
  physicsObjects.push(player);
  
  // Reset screen shake
  screenShake.x = 0;
  screenShake.y = 0;
  screenShake.intensity = 0;
  
  // Show game UI elements
  scoreText.visible = true;
  highScoreText.visible = true;
  levelText.visible = true;
  healthBar.visible = true;
  energyBar.visible = true;
  
  // Show health and energy bar backgrounds and texts
  app.stage.children.forEach(child => {
    if (child instanceof PIXI.Graphics && child !== healthBar && child !== energyBar) {
      if (child.x === 10 && (child.y === 60 || child.y === 85)) {
        child.visible = true;
      }
    }
    if (child instanceof PIXI.Text && (child.text === 'Health' || child.text === 'Energy')) {
      child.visible = true;
    }
  });
  
  // Hide start button again
  const startButton = document.getElementById('start-game-btn');
  if (startButton) {
    startButton.style.display = 'none';
  }
}

// Pause/Resume game
function togglePause() {
  if (!gameRunning) return;
  
  if (pauseMenu.visible) {
    pauseMenu.visible = false;
    gameRunning = true;
  } else {
    pauseMenu.visible = true;
    gameRunning = false;
  }
}

// Keyboard event handlers
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  
  if (e.code === 'KeyR' && !gameRunning && gameStarted) {
    restartGame();
  }
  
  if (e.code === 'KeyM') {
    toggleMusic();
  }
  
  if (e.code === 'KeyP' && gameStarted) {
    togglePause();
  }
  
  // Space bar to start game from start menu
  if (e.code === 'Space' && !gameStarted) {
    startGame();
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
  if (!gameRunning || !gameStarted) return;
  
  const touchY = e.touches[0].clientY;
  const touchX = e.touches[0].clientX;
  const deltaY = touchY - touchStartY;
  const deltaX = touchX - touchStartX;
  
  player.x = Math.max(15, Math.min(app.screen.width - 15, player.x + deltaX * 0.5));
  player.y = Math.max(15, Math.min(app.screen.height - 15, player.y + deltaY * 0.5));
  
  touchStartY = touchY;
  touchStartX = touchX;
});

// Add touch support for start button
app.view.addEventListener('touchend', (e) => {
  if (!gameStarted) {
    // Check if touch was in the start button area
    const rect = app.view.getBoundingClientRect();
    const touchX = e.changedTouches[0].clientX - rect.left;
    const touchY = e.changedTouches[0].clientY - rect.top;
    
    // Convert touch coordinates to game coordinates
    const gameX = (touchX / rect.width) * app.screen.width;
    const gameY = (touchY / rect.height) * app.screen.height;
    
    // Check if touch was in start button area
    const buttonX = app.screen.width / 2 - 100;
    const buttonY = app.screen.height / 2;
    const buttonWidth = 200;
    const buttonHeight = 60;
    
    if (gameX >= buttonX && gameX <= buttonX + buttonWidth &&
        gameY >= buttonY && gameY <= buttonY + buttonHeight) {
      startGame();
    }
  }
});

// Game loop
app.ticker.add((delta) => {
  if (!gameRunning || !gameStarted) return;
  
  updateBackground();
  updatePlayer();
  updatePhysics();
  updateObstacles();
  updateCollectibles();
  updateEnemies();
  updateParticles();
  updateUI();
  updateScreenShake();
  
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
  
  // Spawn enemies
  enemySpawnTimer += delta;
  if (enemySpawnTimer > 300 - gameSpeed * 10) {
    createEnemy();
    enemySpawnTimer = 0;
  }
  
  // Increase difficulty over time
  gameSpeed += 0.001;
  
  // Regenerate energy over time
  playerEnergy = Math.min(100, playerEnergy + 0.1);
  
  // Change player color based on speed
  const hue = (Date.now() * 0.01) % 360;
  player.graphics.tint = PIXI.utils.rgb2hex([
    0.5 + 0.5 * Math.sin((hue * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 120) * Math.PI) / 180),
    0.5 + 0.5 * Math.sin(((hue + 240) * Math.PI) / 180)
  ]);
});

// Initialize the game
initGame();

// Start background music
if (musicEnabled) {
  sounds.background.play();
}

// Test if start button exists and add inline onclick as backup
setTimeout(() => {
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) {
    console.log('Start button found, adding inline onclick as backup');
    startBtn.onclick = function(e) {
      console.log('Inline onclick triggered!');
      e.preventDefault();
      e.stopPropagation();
      startGame();
    };
    
    // Also add direct onclick attribute
    startBtn.setAttribute('onclick', 'startGame(); return false;');
  } else {
    console.error('Start button still not found after timeout');
  }
}, 500);

// Function to setup all event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Start game button
  const startGameBtn = document.getElementById('start-game-btn');
  console.log('Start button found:', startGameBtn);
  
  if (startGameBtn) {
    // Remove existing listeners to avoid duplicates
    startGameBtn.removeEventListener('click', startGame);
    startGameBtn.removeEventListener('touchstart', handleStartTouch);
    
    // Add click listener
    startGameBtn.addEventListener('click', function(e) {
      console.log('Start button clicked!');
      e.preventDefault();
      e.stopPropagation();
      startGame();
    });
    
    // Add touch listener
    startGameBtn.addEventListener('touchstart', handleStartTouch);
    
    // Add hover effects
    startGameBtn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.5)';
    });
    
    startGameBtn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.3)';
    });
    
    console.log('Start button event listeners added');
  } else {
    console.error('Start button not found!');
  }
  
  // Music toggle button
  const musicButton = document.getElementById('toggle-music');
  if (musicButton) {
    musicButton.removeEventListener('click', toggleMusic);
    musicButton.addEventListener('click', toggleMusic);
    musicButton.addEventListener('touchstart', function(e) {
      e.preventDefault();
      toggleMusic();
    });
  }
  
  // SFX toggle button
  const sfxButton = document.getElementById('toggle-sfx');
  if (sfxButton) {
    sfxButton.removeEventListener('click', toggleSFX);
    sfxButton.addEventListener('click', toggleSFX);
    sfxButton.addEventListener('touchstart', function(e) {
      e.preventDefault();
      toggleSFX();
    });
  }
}

// Touch handler for start button
function handleStartTouch(e) {
  console.log('Start button touched!');
  e.preventDefault();
  startGame();
}

// Setup event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up event listeners...');
  setupEventListeners();
});

// Also try to setup immediately in case DOM is already loaded
console.log('Attempting to setup event listeners immediately...');
setupEventListeners();

// Retry after a short delay to ensure DOM is ready
setTimeout(() => {
  console.log('Retrying event listener setup...');
  setupEventListeners();
}, 100);

// Initialize UI
function initUI() {
  console.log('Initializing UI...');
  
  // Score text (hidden initially)
  scoreText = new PIXI.Text('Score: 0', {
    fontFamily: 'Arial',
    fontSize: 20,
    fill: 0xffffff,
    align: 'left',
    stroke: 0x000000,
    strokeThickness: 2
  });
  scoreText.x = 10;
  scoreText.y = 10;
  scoreText.visible = false;
  app.stage.addChild(scoreText);

  // High score text (hidden initially)
  highScoreText = new PIXI.Text(`High Score: ${highScore}`, {
    fontFamily: 'Arial',
    fontSize: 16,
    fill: 0xffff00,
    align: 'left',
    stroke: 0x000000,
    strokeThickness: 1
  });
  highScoreText.x = 10;
  highScoreText.y = 35;
  highScoreText.visible = false;
  app.stage.addChild(highScoreText);

  // Level text (hidden initially)
  levelText = new PIXI.Text('Level: 1', {
    fontFamily: 'Arial',
    fontSize: 18,
    fill: 0x00ffff,
    align: 'left',
    stroke: 0x000000,
    strokeThickness: 1
  });
  levelText.x = app.screen.width - 100;
  levelText.y = 10;
  levelText.visible = false;
  app.stage.addChild(levelText);

  // Health bar background (hidden initially)
  const healthBarBg = new PIXI.Graphics();
  healthBarBg.beginFill(0x333333);
  healthBarBg.drawRect(0, 0, 200, 15);
  healthBarBg.endFill();
  healthBarBg.x = 10;
  healthBarBg.y = 60;
  healthBarBg.visible = false;
  app.stage.addChild(healthBarBg);

  // Health bar (hidden initially)
  healthBar = new PIXI.Graphics();
  healthBar.beginFill(0xff0000);
  healthBar.drawRect(0, 0, 200, 15);
  healthBar.endFill();
  healthBar.x = 10;
  healthBar.y = 60;
  healthBar.visible = false;
  app.stage.addChild(healthBar);

  // Health bar text (hidden initially)
  const healthText = new PIXI.Text('Health', {
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 1
  });
  healthText.x = 10;
  healthText.y = 45;
  healthText.visible = false;
  app.stage.addChild(healthText);

  // Energy bar background (hidden initially)
  const energyBarBg = new PIXI.Graphics();
  energyBarBg.beginFill(0x333333);
  energyBarBg.drawRect(0, 0, 200, 15);
  energyBarBg.endFill();
  energyBarBg.x = 10;
  energyBarBg.y = 85;
  energyBarBg.visible = false;
  app.stage.addChild(energyBarBg);

  // Energy bar (hidden initially)
  energyBar = new PIXI.Graphics();
  energyBar.beginFill(0x00ff00);
  energyBar.drawRect(0, 0, 200, 15);
  energyBar.endFill();
  energyBar.x = 10;
  energyBar.y = 85;
  energyBar.visible = false;
  app.stage.addChild(energyBar);

  // Energy bar text (hidden initially)
  const energyText = new PIXI.Text('Energy', {
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xffffff,
    stroke: 0x000000,
    strokeThickness: 1
  });
  energyText.x = 10;
  energyText.y = 70;
  energyText.visible = false;
  app.stage.addChild(energyText);

  // Game over text
  gameOverText = new PIXI.Text('GAME OVER\nPress R to Restart', {
    fontFamily: 'Arial',
    fontSize: 48,
    fill: 0xff4444,
    align: 'center',
    stroke: 0x000000,
    strokeThickness: 3
  });
  gameOverText.anchor.set(0.5);
  gameOverText.x = app.screen.width / 2;
  gameOverText.y = app.screen.height / 2;
  gameOverText.visible = false;
  app.stage.addChild(gameOverText);

  // Pause menu
  pauseMenu = new PIXI.Container();
  pauseMenu.visible = false;
  
  const pauseBg = new PIXI.Graphics();
  pauseBg.beginFill(0x000000, 0.8);
  pauseBg.drawRect(0, 0, app.screen.width, app.screen.height);
  pauseBg.endFill();
  pauseMenu.addChild(pauseBg);
  
  const pauseText = new PIXI.Text('PAUSED\nPress P to Resume', {
    fontFamily: 'Arial',
    fontSize: 36,
    fill: 0xffffff,
    align: 'center'
  });
  pauseText.anchor.set(0.5);
  pauseText.x = app.screen.width / 2;
  pauseText.y = app.screen.height / 2;
  pauseMenu.addChild(pauseText);
  
  app.stage.addChild(pauseMenu);
  
  console.log('UI initialization complete');
}

// Start game function
function startGame() {
  console.log('=== STARTING GAME ===');
  console.log('Previous game state:', { gameStarted, gameRunning });
  
  gameStarted = true;
  gameRunning = true;
  
  console.log('New game state:', { gameStarted, gameRunning });
  
  // Hide HTML start button
  const startButton = document.getElementById('start-game-btn');
  if (startButton) {
    startButton.style.display = 'none';
    console.log('Start button hidden');
  } else {
    console.error('Start button not found for hiding');
  }
  
  // Show game UI elements
  if (scoreText) {
    scoreText.visible = true;
    console.log('Score text shown');
  }
  
  if (highScoreText) {
    highScoreText.visible = true;
    console.log('High score text shown');
  }
  
  if (levelText) {
    levelText.visible = true;
    console.log('Level text shown');
  }
  
  if (healthBar) {
    healthBar.visible = true;
    console.log('Health bar shown');
  }
  
  if (energyBar) {
    energyBar.visible = true;
    console.log('Energy bar shown');
  }
  
  // Show health and energy bar backgrounds and texts
  app.stage.children.forEach(child => {
    if (child instanceof PIXI.Graphics && child !== healthBar && child !== energyBar) {
      if (child.x === 10 && (child.y === 60 || child.y === 85)) {
        child.visible = true;
        console.log('Bar background shown:', child.x, child.y);
      }
    }
    if (child instanceof PIXI.Text && (child.text === 'Health' || child.text === 'Energy')) {
      child.visible = true;
      console.log('Bar text shown:', child.text);
    }
  });
  
  // Play start sound
  try {
    playSound('jump');
    console.log('Start sound played');
  } catch (error) {
    console.error('Error playing start sound:', error);
  }
  
  // Start background music
  if (musicEnabled) {
    try {
      sounds.background.play();
      console.log('Background music started');
    } catch (error) {
      console.error('Error starting background music:', error);
    }
  }
  
  // Add screen shake for dramatic effect
  addScreenShake(3, 200);
  console.log('Screen shake added');
  
  console.log('=== GAME STARTED SUCCESSFULLY ===');
}

// Update UI
function updateUI() {
  // Update score
  scoreText.text = `Score: ${score}`;
  
  // Update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    highScoreText.text = `High Score: ${highScore}`;
  }
  
  // Update level
  const newLevel = Math.floor(score / 1000) + 1;
  if (newLevel > playerLevel) {
    playerLevel = newLevel;
    createParticleEffect(app.screen.width / 2, app.screen.height / 2, 0x00ffff, 20);
  }
  levelText.text = `Level: ${playerLevel}`;
  
  // Update health bar
  healthBar.clear();
  healthBar.beginFill(0xff0000);
  healthBar.drawRect(0, 0, (playerHealth / 100) * 200, 15);
  healthBar.endFill();
  
  // Update energy bar
  energyBar.clear();
  energyBar.beginFill(0x00ff00);
  energyBar.drawRect(0, 0, (playerEnergy / 100) * 200, 15);
  energyBar.endFill();
}

// Screen shake effect
function addScreenShake(intensity = 5, duration = 200) {
  screenShake.intensity = intensity;
  screenShake.duration = duration;
  screenShake.startTime = Date.now();
}

function updateScreenShake() {
  if (screenShake.intensity > 0) {
    const elapsed = Date.now() - screenShake.startTime;
    if (elapsed < screenShake.duration) {
      const progress = elapsed / screenShake.duration;
      const currentIntensity = screenShake.intensity * (1 - progress);
      screenShake.x = (Math.random() - 0.5) * currentIntensity;
      screenShake.y = (Math.random() - 0.5) * currentIntensity;
    } else {
      screenShake.x = 0;
      screenShake.y = 0;
      screenShake.intensity = 0;
    }
  }
  
  app.stage.x = screenShake.x;
  app.stage.y = screenShake.y;
}
