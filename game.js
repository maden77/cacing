// ==================== KONFIGURASI GAME ====================
const CONFIG = {
    WORLD_SIZE: 20000,
    FOOD_COUNT: 500,
    BOT_COUNT: 20,
    PLAYER_SIZE: 20,
    MAX_SEGMENTS: 80,
    COLLISION_DISTANCE: 38,
    FOOD_ICONS: ['🍎','🍕','🍔','🍟','🍩','🍗','🧀','🥓','🥩','🌭','🍣','🍜','🥪','🍦','🍰','🥑','🥨','🍪','🍉','🥝'],
    BOT_NAMES: ['Bot-Alpha','Bot-Beta','Bot-Gamma','Bot-Delta','Bot-Epsilon','Bot-Zeta','Bot-Eta','Bot-Theta']
};

// ==================== STATE GLOBAL ====================
const GameState = {
    active: false,
    mode: 'menu',
    player: null,
    foods: [],
    bots: [],
    players: new Map(),
    cam: { x: 0, y: 0, zoom: 1 },
    coins: 1000, // Start with some coins for testing
    peer: null,
    conn: null,
    roomId: null,
    isHost: false,
    lastUpdate: 0,
    particles: []
};

// ==================== INITIALIZATION ====================
window.onload = async function() {
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('ui-layer').style.display = 'flex';
        
        // Initialize systems
        SkinSystem.init();
        Audio.init();
        
        // Update coin display
        document.getElementById('menu-coin').textContent = GameState.coins;
        document.getElementById('coins').textContent = GameState.coins;
        
        // Setup canvas
        const canvas = document.getElementById('game');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Handle resize
        window.onresize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        
        // Setup audio upload handlers
        setupAudioUploads();
        
        console.log('Game initialized successfully!');
    }, 1500);
};

// ==================== SNAKE CLASS ====================
class Snake {
    constructor(x, y, name, color, id = null, isBot = false) {
        this.id = id || Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.name = name;
        this.baseColor = color;
        this.isBot = isBot;
        this.angle = Math.random() * Math.PI * 2;
        this.targetAngle = this.angle;
        this.baseSpeed = isBot ? 2 : 4;
        this.speed = this.baseSpeed;
        this.radius = CONFIG.PLAYER_SIZE;
        this.score = 0;
        this.segments = [];
        this.colorOffset = Math.random() * 100;
        this.lastChat = 0;
        
        // Initialize segments
        for(let i = 0; i < 30; i++) {
            this.segments.push({ x: this.x, y: this.y });
        }
        
        // Bot AI
        if(isBot) {
            this.aiState = 'wander';
            this.aiTarget = null;
            this.aiTimer = 0;
            this.fearLevel = 0;
        }
        
        // Apply skin effects
        this.applySkinEffects();
    }

    applySkinEffects() {
        // Apply speed multiplier from skin
        const speedMultiplier = SkinSystem.getSpeedMultiplier();
        this.speed = this.baseSpeed * speedMultiplier;
        
        // Get cosmetic color
        if(!this.isBot) {
            this.color = SkinSystem.getCosmeticColor();
        } else {
            this.color = this.baseColor;
        }
    }

    update() {
        // Apply skin effects
        this.applySkinEffects();
        
        // Smooth angle rotation
        let angleDiff = this.targetAngle - this.angle;
        while(angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while(angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.angle += angleDiff * 0.15;
        
        // Move snake
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // World boundaries (soft boundaries)
        const max = CONFIG.WORLD_SIZE / 2;
        if(Math.abs(this.x) > max - 500) {
            this.targetAngle += Math.PI * 0.5;
        }
        if(Math.abs(this.y) > max - 500) {
            this.targetAngle += Math.PI * 0.5;
        }
        
        // Update segments
        const head = this.segments[0];
        if(Math.hypot(this.x - head.x, this.y - head.y) > 5) {
            this.segments.unshift({ x: this.x, y: this.y });
            
            // Limit segments based on score
            const maxSegments = CONFIG.MAX_SEGMENTS + Math.floor(this.score / 20);
            if(this.segments.length > maxSegments) {
                this.segments.pop();
            }
        }

        // Bot AI
        if(this.isBot) {
            this.updateAI();
        }
    }

    updateAI() {
        this.aiTimer++;
        
        // Find closest food
        let closestFood = null;
        let foodDist = Infinity;
        
        GameState.foods.forEach(food => {
            const dist = Math.hypot(this.x - food.x, this.y - food.y);
            if(dist < foodDist && dist < 800) {
                foodDist = dist;
                closestFood = food;
            }
        });
        
        // Find closest player to fear
        let closestPlayer = null;
        let playerDist = Infinity;
        let shouldFear = false;
        
        GameState.players.forEach(player => {
            if(player === this || player.isBot) return;
            const dist = Math.hypot(this.x - player.x, this.y - player.y);
            if(dist < playerDist && dist < 400) {
                playerDist = dist;
                closestPlayer = player;
                
                // Fear if player is bigger
                if(player.score > this.score * 1.5) {
                    shouldFear = true;
                    this.fearLevel = 1 - (dist / 400);
                }
            }
        });
        
        // AI State Machine
        if(shouldFear && closestPlayer) {
            // Flee from player
            this.aiState = 'flee';
            const fleeAngle = Math.atan2(this.y - closestPlayer.y, this.x - closestPlayer.x);
            this.targetAngle = fleeAngle + (Math.random() - 0.5) * this.fearLevel;
        } else if(closestFood && foodDist < 600) {
            // Chase food
            this.aiState = 'chase_food';
            this.aiTarget = closestFood;
            this.targetAngle = Math.atan2(closestFood.y - this.y, closestFood.x - this.x);
        } else {
            // Wander
            this.aiState = 'wander';
            if(this.aiTimer % 90 === 0 || Math.random() < 0.01) {
                this.targetAngle += (Math.random() - 0.5) * Math.PI;
            }
        }
    }

    draw(ctx) {
        // Skip if off-screen
        const screenX = this.x - GameState.cam.x + ctx.canvas.width/2;
        const screenY = this.y - GameState.cam.y + ctx.canvas.height/2;
        
        if(screenX < -200 || screenX > ctx.canvas.width + 200 ||
           screenY < -200 || screenY > ctx.canvas.height + 200) {
            return;
        }
        // ==== TAMBAHKAN INI: Visual indicator untuk bot yang bisa dimakan ====
    if(this.isBot && GameState.player) {
        const distToPlayer = Math.hypot(this.x - GameState.player.x, this.y - GameState.player.y);
        const canEat = distToPlayer < CONFIG.COLLISION_DISTANCE * 2;
        
        if(canEat) {
            // Glow effect merah saat bot bisa dimakan
            ctx.shadowColor = 'rgba(239,68,68,0.7)';
            ctx.shadowBlur = 20;
            
            // Draw targeting circle
            ctx.strokeStyle = 'rgba(239,68,68,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, CONFIG.COLLISION_DISTANCE, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
        
        // Draw segments
        for(let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const segScreenX = seg.x - GameState.cam.x + ctx.canvas.width/2;
            const segScreenY = seg.y - GameState.cam.y + ctx.canvas.height/2;
            
            // Calculate color with gradient
            let segmentColor;
            if(typeof this.color === 'string' && this.color.includes('gradient')) {
                // Handle gradient colors
                segmentColor = this.color;
            } else {
                // Regular color with gradient effect
                const intensity = 0.7 + (i / this.segments.length) * 0.3;
                segmentColor = this.color;
            }
            
            // Draw segment
            ctx.fillStyle = segmentColor;
            ctx.beginPath();
            
            // Vary segment size
            const segmentSize = this.radius * (0.6 + (i / this.segments.length) * 0.8);
            ctx.arc(segScreenX, segScreenY, segmentSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Segment border
            ctx.strokeStyle = '#000';
            ctx.lineWidth = Math.max(2, segmentSize * 0.1);
            ctx.stroke();
            
            // Draw face on head
            if(i === 0) {
                this.drawFace(ctx, segScreenX, segScreenY);
                
                // Draw name (not for bots)
                if(!this.isBot) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.shadowColor = '#000';
                    ctx.shadowBlur = 3;
                    ctx.fillText(this.name, segScreenX, segScreenY - segmentSize - 5);
                    ctx.shadowBlur = 0;
                    
                    // Draw score
                    ctx.font = '12px Arial';
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillText(`Score: ${this.score}`, segScreenX, segScreenY - segmentSize - 20);
                }
            }
        }
    }

    drawFace(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.angle);
        
        // Face base
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(15, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(22, -8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(22, 8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(20, -9, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(20, 7, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(15, 0, 10, 0.2, Math.PI - 0.2);
        ctx.stroke();
        
        ctx.restore();
    }

    checkCollision(other) {
        if(other === this) return false;
        
        // Check collision with head
        const headDist = Math.hypot(this.x - other.x, this.y - other.y);
        if(headDist < CONFIG.COLLISION_DISTANCE * 1.5) {
            return true;
        }
        
        // Check collision with segments
        for(let i = 0; i < other.segments.length; i += 2) {
            const seg = other.segments[i];
            const dist = Math.hypot(this.x - seg.x, this.y - seg.y);
            if(dist < CONFIG.COLLISION_DISTANCE) {
                return true;
            }
        }
        
        return false;
    }
}

// ==================== PARTICLE SYSTEM ====================
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1;
        this.speed = Math.random() * 3 + 1;
        this.angle = Math.random() * Math.PI * 2;
        this.size = Math.random() * 5 + 2;
        
        switch(type) {
            case 'eat':
                this.color = `hsl(${Math.random() * 60 + 30}, 100%, 60%)`;
                break;
            case 'score':
                this.color = `hsl(${Math.random() * 30 + 40}, 100%, 60%)`;
                break;
            case 'speed':
                this.color = '#60a5fa';
                break;
            case 'magnet':
                this.color = '#fbbf24';
                break;
        }
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life -= 0.02;
        this.size *= 0.98;
        return this.life > 0;
    }
    
    draw(ctx) {
        const screenX = this.x - GameState.cam.x + ctx.canvas.width/2;
        const screenY = this.y - GameState.cam.y + ctx.canvas.height/2;
        
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ==================== GAME LOGIC ====================
const Game = {
    startSolo() {
        GameState.mode = 'solo';
        GameState.active = true;
        const nick = document.getElementById('nick').value.trim() || 'Player';
        
        // Initialize player
        GameState.player = new Snake(0, 0, nick, '#a855f7');
        GameState.players.set(GameState.player.id, GameState.player);
        
        // Generate bots
        for(let i = 0; i < CONFIG.BOT_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 1000 + Math.random() * 3000;
            const bot = new Snake(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist,
                CONFIG.BOT_NAMES[i % CONFIG.BOT_NAMES.length],
                `hsl(${Math.random() * 360}, 70%, 60%)`,
                null,
                true
            );
            bot.score = Math.floor(Math.random() * 200);
            GameState.bots.push(bot);
        }
        
        // Generate food
        this.generateFood();
        
        // Setup UI
        this.showGameUI();
        
        // Start game loop
        this.loop();
        
        // Start music
        Audio.playMusic();
    },

    startMultiplayer(nick, isHost) {
        GameState.mode = 'multi';
        GameState.active = true;
        
        // Initialize player
        GameState.player = new Snake(0, 0, nick, '#a855f7');
        GameState.players.set(GameState.player.id, GameState.player);
        
        // Host generates world
        if(isHost) {
            // Generate bots
            for(let i = 0; i < CONFIG.BOT_COUNT / 2; i++) {
                const bot = new Snake(
                    (Math.random() - 0.5) * 2000,
                    (Math.random() - 0.5) * 2000,
                    CONFIG.BOT_NAMES[i],
                    `hsl(${Math.random() * 360}, 70%, 60%)`,
                    null,
                    true
                );
                GameState.bots.push(bot);
            }
            
            // Generate food
            this.generateFood();
            
            // Broadcast game state periodically
            setInterval(() => {
                if(GameState.conn && GameState.isHost) {
                    this.broadcastGameState();
                }
            }, 100);
        }
        
        // Setup UI
        this.showGameUI();
        
        // Start game loop
        this.loop();
        
        // Start music
        Audio.playMusic();
    },

    showGameUI() {
        document.getElementById('ui-layer').style.display = 'none';
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('room-info').style.display = 'block';
        document.getElementById('player-list').style.display = 'block';
        document.getElementById('minimap').style.display = 'block';
        document.getElementById('joy-zone').style.display = 'block';
        document.getElementById('chat-toggle').style.display = 'flex';
        document.getElementById('audio-controls').style.display = 'flex';
        
        this.updatePlayerList();
    },

    generateFood() {
        GameState.foods = [];
        for(let i = 0; i < CONFIG.FOOD_COUNT; i++) {
            GameState.foods.push({
                id: i,
                x: (Math.random() - 0.5) * CONFIG.WORLD_SIZE,
                y: (Math.random() - 0.5) * CONFIG.WORLD_SIZE,
                icon: CONFIG.FOOD_ICONS[Math.floor(Math.random() * CONFIG.FOOD_ICONS.length)],
                value: 10 + Math.floor(Math.random() * 20)
            });
        }
    },

    loop() {
        if(!GameState.active) return;
        
        const canvas = document.getElementById('game');
        const ctx = canvas.getContext('2d');
        const now = Date.now();
        
        // Update canvas size if needed
        if(canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        // Clear canvas with gradient
        const gradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, 0,
            canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2
        );
        gradient.addColorStop(0, '#050510');
        gradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update camera
        GameState.cam.x += (GameState.player.x - GameState.cam.x) * 0.1;
        GameState.cam.y += (GameState.player.y - GameState.cam.y) * 0.1;
        
        // Update all entities
        this.updateEntities();
        
        // Draw grid
        this.drawGrid(ctx);
        
        // Draw food with magnet effect
        this.drawFood(ctx);
        
        // Draw particles
        this.drawParticles(ctx);
        
        // Draw bots
        GameState.bots.forEach(bot => bot.draw(ctx));
        
        // Draw other players
        GameState.players.forEach(player => {
            if(player.id !== GameState.player.id) {
                player.draw(ctx);
            }
        });
        
        // Draw player
        GameState.player.draw(ctx);
        
        // Draw magnet effect circle if active
        if(SkinSystem.isEffectActive('magnet')) {
            const radius = SkinSystem.getMagnetRadius();
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const centerX = GameState.player.x - GameState.cam.x + canvas.width/2;
            const centerY = GameState.player.y - GameState.cam.y + canvas.height/2;
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Update minimap
        this.updateMinimap();
        
        // Update HUD
        this.updateHUD();
        
        // Network sync for multiplayer
        if(GameState.mode === 'multi' && GameState.conn && now - GameState.lastUpdate > 50) {
            this.sendPlayerUpdate();
            GameState.lastUpdate = now;
        }
        
        // Update skin system HUD
        SkinSystem.updateHUD();
        
        requestAnimationFrame(() => this.loop());
    },

    updateEntities() {
        // Update player
        GameState.player.update();
        
        // Apply magnet effect
        if(SkinSystem.isEffectActive('magnet')) {
            this.applyMagnetEffect();
        }
        
        // Update bots
        GameState.bots.forEach((bot, index) => {
            bot.update();
            
            
        // HAPUS logika bot makan player, hanya player bisa makan bot
        if(bot.checkCollision(GameState.player)) {
            // Player selalu bisa makan bot (tidak perlu syarat score)
            this.eatBot(bot, index);
        }
            // Check collision with player
            if(bot.checkCollision(GameState.player)) {
                if(GameState.player.score > bot.score * 1.2) {
                    // Player eats bot
                    this.eatBot(bot, index);
               
                
            
            
            // Bot eats food
            GameState.foods.forEach((food, foodIndex) => {
                const dist = Math.hypot(bot.x - food.x, bot.y - food.y);
                if(dist < CONFIG.COLLISION_DISTANCE) {
                    bot.score += food.value;
                    
                    // Create particles
                    for(let i = 0; i < 3; i++) {
                        GameState.particles.push(new Particle(food.x, food.y, 'eat'));
                    }
                    
                    // Replace food
                    GameState.foods[foodIndex] = this.createFood();
                }
            });
        });
        
        // Player eats food
        GameState.foods.forEach((food, index) => {
            const dist = Math.hypot(GameState.player.x - food.x, GameState.player.y - food.y);
            if(dist < CONFIG.COLLISION_DISTANCE) {
                this.eatFood(food, index);
            }
        });
        
        // Update other players
        GameState.players.forEach(player => {
            if(player.id !== GameState.player.id) {
                player.update();
            }
        });
        
        // Update particles
        GameState.particles = GameState.particles.filter(p => p.update());
    },

    applyMagnetEffect() {
        if(!SkinSystem.isEffectActive('magnet')) return;
        
        const radius = SkinSystem.getMagnetRadius();
        const strength = SkinSystem.getMagnetStrength();
        
        GameState.foods.forEach(food => {
            const dist = Math.hypot(GameState.player.x - food.x, GameState.player.y - food.y);
            if(dist < radius) {
                // Move food toward player
                const angle = Math.atan2(GameState.player.y - food.y, GameState.player.x - food.x);
                const pullStrength = strength * (1 - dist/radius);
                
                food.x += Math.cos(angle) * pullStrength * 5;
                food.y += Math.sin(angle) * pullStrength * 5;
                
                // Create magnet particles occasionally
                if(Math.random() < 0.1) {
                    GameState.particles.push(new Particle(food.x, food.y, 'magnet'));
                }
            }
        });
    },

    eatFood(food, index) {
        // Add score and coins
        GameState.player.score += food.value;
        GameState.coins += Math.ceil(food.value / 10);
        
        // Play sound
        Audio.play('eat');
        
        // Create particles
        for(let i = 0; i < 5; i++) {
            GameState.particles.push(new Particle(food.x, food.y, 'eat'));
        }
        
        // Create score popup
        this.createScorePopup(food.x, food.y, `+${food.value}`);
        
        // Replace food
        GameState.foods[index] = this.createFood();
        
        // Broadcast in multiplayer
        if(GameState.mode === 'multi' && GameState.isHost) {
            this.broadcastFoodUpdate(index, GameState.foods[index]);
        }
    },

    eatBot(bot, index) {
        // Calculate bonus
        const bonus = bot.score * 3;
        GameState.player.score += bonus;
        GameState.coins += Math.ceil(bot.score);
        
        // Play sound
        Audio.play('collision');
        
        // Create lots of particles
        for(let i = 0; i < 25; i++) {
            GameState.particles.push(new Particle(bot.x, bot.y, 'score'));
        }
        
        // Create big score popup
        this.createScorePopup(bot.x, bot.y, `BONUS +${bonus}!`);
        
        // Respawn bot
        const angle = Math.random() * Math.PI * 2;
        const dist = 1000 + Math.random() * 3000;
        bot.x = Math.cos(angle) * dist;
        bot.y = Math.sin(angle) * dist;
        bot.score = Math.floor(Math.random() * 150);
        bot.segments = [];
        for(let i = 0; i < 30; i++) {
            bot.segments.push({ x: bot.x, y: bot.y });
        }
        
        // Send chat message
        if(GameState.mode === 'multi') {
            Chat.sendSystem(`${GameState.player.name} makan ${bot.name}!`);
        }
       // Achievement/effect khusus
    if(bot.score > 100) {
        // Jika bot yang dimakan besar, dapat bonus ekstra
        GameState.player.score += 500;
        GameState.coins += 100;
        this.createScorePopup(bot.x, bot.y, `BONUS RAKSASA +500!`);
        Chat.sendSystem(`🎉 ${GameState.player.name} makan bot raksasa!`);
    }
},

    createFood() {
        return {
            id: Date.now() + Math.random(),
            x: (Math.random() - 0.5) * CONFIG.WORLD_SIZE,
            y: (Math.random() - 0.5) * CONFIG.WORLD_SIZE,
            icon: CONFIG.FOOD_ICONS[Math.floor(Math.random() * CONFIG.FOOD_ICONS.length)],
            value: 10 + Math.floor(Math.random() * 20)
        };
    },

    createScorePopup(x, y, text) {
        // Create temporary score popup
        const popup = {
            x, y,
            text,
            life: 1,
            yOffset: 0
        };
        
        // Animate popup
        const animate = () => {
            if(popup.life <= 0) return;
            
            popup.life -= 0.02;
            popup.yOffset += 1;
            
            // Draw
            const canvas = document.getElementById('game');
            const ctx = canvas.getContext('2d');
            const screenX = popup.x - GameState.cam.x + canvas.width/2;
            const screenY = popup.y - GameState.cam.y + canvas.height/2 - popup.yOffset;
            
            ctx.save();
            ctx.globalAlpha = popup.life;
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3;
            ctx.fillText(popup.text, screenX, screenY);
            ctx.restore();
            
            requestAnimationFrame(animate);
        };
        
        animate();
    },

    drawGrid(ctx) {
        const gridSize = 200;
        const offsetX = (GameState.cam.x % gridSize) - gridSize;
        const offsetY = (GameState.cam.y % gridSize) - gridSize;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for(let x = offsetX; x < ctx.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ctx.canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for(let y = offsetY; y < ctx.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
            ctx.stroke();
        }
        
        // Center marker
        const centerX = ctx.canvas.width/2;
        const centerY = ctx.canvas.height/2;
        ctx.strokeStyle = 'rgba(168,85,247,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX - 20, centerY);
        ctx.lineTo(centerX + 20, centerY);
        ctx.moveTo(centerX, centerY - 20);
        ctx.lineTo(centerX, centerY + 20);
        ctx.stroke();
    },

    drawFood(ctx) {
        GameState.foods.forEach(food => {
            const screenX = food.x - GameState.cam.x + ctx.canvas.width/2;
            const screenY = food.y - GameState.cam.y + ctx.canvas.height/2;
            
            // Skip if off-screen
            if(screenX < -50 || screenX > ctx.canvas.width + 50 ||
               screenY < -50 || screenY > ctx.canvas.height + 50) return;
            
            // Draw glow for high-value food
            if(food.value > 20) {
                ctx.shadowColor = 'rgba(255,215,0,0.5)';
                ctx.shadowBlur = 15;
            } else {
                ctx.shadowColor = 'rgba(255,255,255,0.3)';
                ctx.shadowBlur = 10;
            }
            
            // Draw food icon
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(food.icon, screenX, screenY);
            ctx.shadowBlur = 0;
            
            // Draw value for high-value food
            if(food.value > 20) {
                ctx.font = '10px Arial';
                ctx.fillStyle = '#fbbf24';
                ctx.fillText(food.value, screenX, screenY + 20);
            }
        });
    },

    drawParticles(ctx) {
        GameState.particles.forEach(particle => particle.draw(ctx));
    },

    updateMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        const ctx = canvas.getContext('2d');
        const size = canvas.parentElement.clientWidth;
        
        canvas.width = size;
        canvas.height = size;
        
        // Clear
        ctx.fillStyle = 'rgba(20,20,40,0.9)';
        ctx.fillRect(0, 0, size, size);
        
        const scale = size / CONFIG.WORLD_SIZE;
        const centerX = size/2;
        const centerY = size/2;
        
        // Draw world boundary
        ctx.strokeStyle = 'rgba(59,130,246,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size/2 - 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw food (as small dots)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        GameState.foods.forEach(food => {
            const x = centerX + (food.x * scale);
            const y = centerY + (food.y * scale);
            if(x >= 0 && x <= size && y >= 0 && y <= size) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Draw bots (red)
        ctx.fillStyle = 'rgba(239,68,68,0.8)';
        GameState.bots.forEach(bot => {
            const x = centerX + (bot.x * scale);
            const y = centerY + (bot.y * scale);
            if(x >= 0 && x <= size && y >= 0 && y <= size) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Draw other players (blue)
        ctx.fillStyle = 'rgba(59,130,246,0.8)';
        GameState.players.forEach(player => {
            if(player.id === GameState.player.id) return;
            const x = centerX + (player.x * scale);
            const y = centerY + (player.y * scale);
            if(x >= 0 && x <= size && y >= 0 && y <= size) {
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Draw player (purple with border)
        const playerX = centerX + (GameState.player.x * scale);
        const playerY = centerY + (GameState.player.y * scale);
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(playerX, playerY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(playerX, playerY, 6, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw viewport rectangle
        const viewWidth = (ctx.canvas.width / GameState.cam.zoom) * scale;
        const viewHeight = (ctx.canvas.height / GameState.cam.zoom) * scale;
        ctx.strokeStyle = 'rgba(168,85,247,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            playerX - viewWidth/2,
            playerY - viewHeight/2,
            viewWidth,
            viewHeight
        );
    },

    updateHUD() {
        document.getElementById('score').textContent = GameState.player.score;
        document.getElementById('coins').textContent = GameState.coins;
        document.getElementById('player-count').textContent = GameState.players.size;
        document.getElementById('menu-coin').textContent = GameState.coins;
    },

    updatePlayerList() {
        const container = document.getElementById('players-container');
        if(!container) return;
        
        container.innerHTML = '';
        
        // Add player
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="player-color" style="background:${GameState.player.color}"></div>
            <div class="player-name">${GameState.player.name} (Anda)</div>
            <div class="player-score">${GameState.player.score}</div>
        `;
        container.appendChild(playerItem);
        
        // Add other players
        GameState.players.forEach(player => {
            if(player.id === GameState.player.id) return;
            
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
                <div class="player-color" style="background:${player.color}"></div>
                <div class="player-name">${player.name}</div>
                <div class="player-score">${player.score}</div>
            `;
            container.appendChild(item);
        });
        
        // Add bots
        GameState.bots.forEach((bot, index) => {
            if(index < 3) { // Show only first 3 bots
                const item = document.createElement('div');
                item.className = 'player-item';
                item.innerHTML = `
                    <div class="player-color" style="background:${bot.color}"></div>
                    <div class="player-name">${bot.name}</div>
                    <div class="player-score">${bot.score}</div>
                `;
                container.appendChild(item);
            }
        });
        
        if(GameState.bots.length > 3) {
            const moreItem = document.createElement('div');
            moreItem.className = 'player-item';
            moreItem.innerHTML = `
                <div class="player-color" style="background:#6b7280"></div>
                <div class="player-name">... ${GameState.bots.length - 3} bot lain</div>
                <div class="player-score"></div>
            `;
            container.appendChild(moreItem);
        }
    },

    gameOver(reason) {
        GameState.active = false;
        
        alert(`GAME OVER!\n${reason}\n\nScore Akhir: ${GameState.player.score}\nKoin: ${GameState.coins}`);
        
        // Return to menu
        location.reload();
    },

    // ==================== NETWORK FUNCTIONS ====================
    sendPlayerUpdate() {
        if(!GameState.conn) return;
        
        const data = {
            type: 'player_update',
            id: GameState.player.id,
            x: GameState.player.x,
            y: GameState.player.y,
            angle: GameState.player.angle,
            score: GameState.player.score,
            name: GameState.player.name,
            color: GameState.player.color
        };
        
        try {
            GameState.conn.send(data);
        } catch(e) {
            console.error('Failed to send update:', e);
        }
    },

    broadcastGameState() {
        if(!GameState.isHost || !GameState.conn) return;
        
        const data = {
            type: 'game_state',
            foods: GameState.foods,
            bots: GameState.bots.map(bot => ({
                x: bot.x, y: bot.y, score: bot.score, name: bot.name
            })),
            players: Array.from(GameState.players.values()).map(p => ({
                id: p.id, name: p.name, color: p.color,
                x: p.x, y: p.y, score: p.score
            }))
        };
        
        try {
            GameState.conn.send(data);
        } catch(e) {
            console.error('Failed to broadcast state:', e);
        }
    },

    broadcastFoodUpdate(index, food) {
        if(!GameState.isHost || !GameState.conn) return;
        
        const data = {
            type: 'food_update',
            index: index,
            food: food
        };
        
        GameState.conn.send(data);
    },

    handleNetworkData(data) {
        try {
            switch(data.type) {
                case 'player_update':
                    if(data.id === GameState.player.id) return;
                    
                    let player = GameState.players.get(data.id);
                    if(!player) {
                        player = new Snake(data.x, data.y, data.name, data.color, data.id);
                        GameState.players.set(data.id, player);
                    }
                    player.x = data.x;
                    player.y = data.y;
                    player.angle = data.angle;
                    player.score = data.score;
                    player.name = data.name;
                    Game.updatePlayerList();
                    break;
                    
                case 'game_state':
                    // Only clients process this
                    if(GameState.isHost) break;
                    
                    // Update foods
                    data.foods.forEach((food, index) => {
                        if(GameState.foods[index]) {
                            GameState.foods[index] = food;
                        }
                    });
                    
                    // Update bots
                    data.bots.forEach((botData, index) => {
                        if(GameState.bots[index]) {
                            GameState.bots[index].x = botData.x;
                            GameState.bots[index].y = botData.y;
                            GameState.bots[index].score = botData.score;
                            GameState.bots[index].name = botData.name;
                        }
                    });
                    
                    // Update players
                    data.players.forEach(playerData => {
                        if(playerData.id === GameState.player.id) return;
                        
                        let player = GameState.players.get(playerData.id);
                        if(!player) {
                            player = new Snake(
                                playerData.x,
                                playerData.y,
                                playerData.name,
                                playerData.color,
                                playerData.id
                            );
                            GameState.players.set(playerData.id, player);
                        }
                        player.x = playerData.x;
                        player.y = playerData.y;
                        player.score = playerData.score;
                        player.name = playerData.name;
                    });
                    Game.updatePlayerList();
                    break;
                    
                case 'food_update':
                    if(!GameState.isHost) {
                        GameState.foods[data.index] = data.food;
                    }
                    break;
                    
                case 'chat_message':
                    Chat.receive(data);
                    break;
                    
                case 'system_message':
                    Chat.receiveSystem(data.message);
                    break;
            }
        } catch(e) {
            console.error('Error processing network data:', e);
        }
    }
};

// ==================== ROOM SYSTEM ====================
const Room = {
    show() {
        document.getElementById('room-layer').style.display = 'flex';
        document.getElementById('room-id').value = '';
        document.getElementById('room-status').textContent = '';
        document.getElementById('room-status').className = 'info';
    },

    hide() {
        document.getElementById('room-layer').style.display = 'none';
    },

    generateRoomId() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },

    async create() {
        const nick = document.getElementById('nick').value.trim() || 'Player';
        const roomId = Room.generateRoomId();
        
        document.getElementById('room-status').textContent = `Membuat room ${roomId}...`;
        document.getElementById('room-status').className = 'success';

        // Initialize PeerJS as host
        try {
            GameState.peer = new Peer(`host_${roomId}`, {
                debug: 2
            });
            
            GameState.peer.on('open', (id) => {
                GameState.roomId = roomId;
                GameState.isHost = true;
                
                document.getElementById('room-code').textContent = roomId;
                Room.hide();
                
                // Start game as host
                Game.startMultiplayer(nick, true);
                
                // Setup connection handler
                GameState.peer.on('connection', (conn) => {
                    this.handleConnection(conn);
                });
                
                console.log('Room created:', roomId);
            });

            GameState.peer.on('error', (err) => {
                document.getElementById('room-status').textContent = 'Error: ' + err.message;
                document.getElementById('room-status').className = 'error';
                console.error('PeerJS error:', err);
            });
        } catch(err) {
            document.getElementById('room-status').textContent = 'Gagal membuat room!';
            document.getElementById('room-status').className = 'error';
        }
    },

    async join() {
        const nick = document.getElementById('nick').value.trim() || 'Player';
        const roomId = document.getElementById('room-id').value.trim();
        
        if(roomId.length !== 4 || !/^\d+$/.test(roomId)) {
            document.getElementById('room-status').textContent = 'Kode room harus 4 digit angka!';
            document.getElementById('room-status').className = 'error';
            return;
        }

        document.getElementById('room-status').textContent = 'Menghubungkan ke room ' + roomId + '...';
        document.getElementById('room-status').className = 'success';

        // Initialize PeerJS as client
        try {
            GameState.peer = new Peer(`client_${roomId}_${Date.now()}`, {
                debug: 2
            });
            
            GameState.peer.on('open', async (id) => {
                try {
                    // Connect to host
                    const conn = GameState.peer.connect(`host_${roomId}`);
                    
                    conn.on('open', () => {
                        GameState.conn = conn;
                        GameState.roomId = roomId;
                        GameState.isHost = false;
                        
                        document.getElementById('room-code').textContent = roomId;
                        Room.hide();
                        
                        // Start game as client
                        Game.startMultiplayer(nick, false);
                        
                        // Setup message handler
                        conn.on('data', (data) => {
                            Game.handleNetworkData(data);
                        });
                        
                        // Send join message
                        conn.send({
                            type: 'chat_message',
                            sender: nick,
                            message: 'telah bergabung!',
                            isSystem: true
                        });
                        
                        console.log('Joined room:', roomId);
                    });
                    
                    conn.on('error', (err) => {
                        document.getElementById('room-status').textContent = 'Gagal menghubungkan ke room';
                        document.getElementById('room-status').className = 'error';
                    });
                    
                    conn.on('close', () => {
                        Chat.receiveSystem('Koneksi ke host terputus!');
                    });
                } catch(err) {
                    document.getElementById('room-status').textContent = 'Room tidak ditemukan!';
                    document.getElementById('room-status').className = 'error';
                }
            });

            GameState.peer.on('error', (err) => {
                document.getElementById('room-status').textContent = 'Error koneksi: ' + err.message;
                document.getElementById('room-status').className = 'error';
            });
        } catch(err) {
            document.getElementById('room-status').textContent = 'Gagal bergabung!';
            document.getElementById('room-status').className = 'error';
        }
    },

    handleConnection(conn) {
        conn.on('open', () => {
            GameState.conn = conn;
            conn.on('data', (data) => {
                Game.handleNetworkData(data);
                
                // Relay to other clients if host
                if(GameState.isHost && data.type === 'chat_message') {
                    // Broadcast to all connections
                    conn.send(data);
                }
            });
            
            // Send current game state to new client
            if(GameState.isHost) {
                const gameState = {
                    type: 'game_state',
                    foods: GameState.foods,
                    bots: GameState.bots.map(bot => ({
                        x: bot.x, y: bot.y, score: bot.score, name: bot.name
                    })),
                    players: Array.from(GameState.players.values()).map(p => ({
                        id: p.id, name: p.name, color: p.color,
                        x: p.x, y: p.y, score: p.score
                    }))
                };
                conn.send(gameState);
                
                // Broadcast join message
                Chat.sendSystem('Player baru bergabung!');
            }
        });
        
        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
        
        conn.on('close', () => {
            Chat.receiveSystem('Seorang player keluar.');
        });
    }
};

// ==================== CHAT SYSTEM ====================
const Chat = {
    visible: false,
    messages: [],
    
    toggle() {
        this.visible = !this.visible;
        const container = document.getElementById('chat-container');
        const toggleBtn = document.getElementById('chat-toggle');
        
        if(this.visible) {
            container.style.display = 'block';
            toggleBtn.textContent = '✖️';
            document.getElementById('chat-input').focus();
        } else {
            container.style.display = 'none';
            toggleBtn.textContent = '💬';
        }
    },
    
    send() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if(!message) return;
        
        // Add to local chat
        this.addMessage(GameState.player.name, message, true);
        
        // Send to network if multiplayer
        if(GameState.mode === 'multi' && GameState.conn) {
            const data = {
                type: 'chat_message',
                sender: GameState.player.name,
                message: message,
                isSystem: false,
                timestamp: Date.now()
            };
            
            try {
                GameState.conn.send(data);
            } catch(e) {
                console.error('Failed to send chat:', e);
            }
        }
        
        // Clear input
        input.value = '';
        
        // Play sound
        Audio.play('chat');
    },
    
    sendSystem(message) {
        this.addMessage('SYSTEM', message, false, true);
        
        // Broadcast in multiplayer
        if(GameState.mode === 'multi' && GameState.conn && GameState.isHost) {
            const data = {
                type: 'system_message',
                message: message
            };
            
            try {
                GameState.conn.send(data);
            } catch(e) {
                console.error('Failed to send system message:', e);
            }
        }
    },
    
    receive(data) {
        if(data.type === 'chat_message') {
            this.addMessage(data.sender, data.message, data.sender === GameState.player.name, data.isSystem);
        } else if(data.type === 'system_message') {
            this.addMessage('SYSTEM', data.message, false, true);
        }
    },
    
    receiveSystem(message) {
        this.addMessage('SYSTEM', message, false, true);
    },
    
    addMessage(sender, message, isOwn = false, isSystem = false) {
        const messagesDiv = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        
        messageDiv.className = `chat-message ${isOwn ? 'own' : ''}`;
        
        if(isSystem) {
            messageDiv.style.fontStyle = 'italic';
            messageDiv.style.color = '#f59e0b';
            messageDiv.textContent = `⚡ ${message}`;
        } else {
            messageDiv.innerHTML = `<strong style="color:${isOwn ? '#a855f7' : '#3b82f6'}">${sender}:</strong> ${message}`;
        }
        
        messagesDiv.appendChild(messageDiv);
        
        // Limit messages
        while(messagesDiv.children.length > 50) {
            messagesDiv.removeChild(messagesDiv.firstChild);
        }
        
        // Auto-scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Play sound for non-own messages
        if(!isOwn && !isSystem) {
            Audio.play('chat');
        }
    }
};

// ==================== SHOP SYSTEM ====================
const Shop = {
    show() {
        document.getElementById('shop-layer').style.display = 'flex';
        SkinSystem.updateShop();
    },
    
    hide() {
        document.getElementById('shop-layer').style.display = 'none';
    },
    
    showMessage(message, isSuccess = true) {
        const alertDiv = document.createElement('div');
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.left = '50%';
        alertDiv.style.transform = 'translateX(-50%)';
        alertDiv.style.padding = '15px 25px';
        alertDiv.style.borderRadius = '10px';
        alertDiv.style.color = 'white';
        alertDiv.style.fontWeight = 'bold';
        alertDiv.style.zIndex = '1000';
        alertDiv.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        alertDiv.style.backdropFilter = 'blur(10px)';
        alertDiv.style.border = '2px solid';
        alertDiv.textContent = message;
        
        if(isSuccess) {
            alertDiv.style.background = 'rgba(16,185,129,0.9)';
            alertDiv.style.borderColor = '#10b981';
        } else {
            alertDiv.style.background = 'rgba(239,68,68,0.9)';
            alertDiv.style.borderColor = '#ef4444';
        }
        
        document.body.appendChild(alertDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            alertDiv.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if(alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 500);
        }, 3000);
    }
};

// ==================== AUDIO SYSTEM ====================
const Audio = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    
    init() {
        // Load settings from localStorage
        const saved = localStorage.getItem('cacing_audio_settings');
        if(saved) {
            const settings = JSON.parse(saved);
            this.musicEnabled = settings.musicEnabled !== false;
            this.sfxEnabled = settings.sfxEnabled !== false;
            this.musicVolume = settings.musicVolume || 0.5;
            this.sfxVolume = settings.sfxVolume || 0.7;
        }
        
        this.updateButtons();
        
        // Setup music loop
        const music = document.getElementById('bg-music');
        music.volume = this.musicVolume;
        
        // Handle music end
        music.onended = () => {
            music.currentTime = 0;
            if(this.musicEnabled) {
                music.play().catch(e => console.log('Autoplay prevented'));
            }
        };
    },
    
    saveSettings() {
        localStorage.setItem('cacing_audio_settings', JSON.stringify({
            musicEnabled: this.musicEnabled,
            sfxEnabled: this.sfxEnabled,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume
        }));
    },
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.updateButtons();
        
        if(this.musicEnabled) {
            this.playMusic();
        } else {
            this.pauseMusic();
        }
        
        this.saveSettings();
    },
    
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        this.updateButtons();
        this.saveSettings();
    },
    
    updateButtons() {
        const musicBtn = document.getElementById('music-btn');
        const sfxBtn = document.getElementById('sfx-btn');
        
        if(musicBtn) {
            musicBtn.textContent = this.musicEnabled ? '🎵' : '🔇';
            musicBtn.style.borderColor = this.musicEnabled ? '#10b981' : '#ef4444';
        }
        
        if(sfxBtn) {
            sfxBtn.textContent = this.sfxEnabled ? '🔊' : '🔇';
            sfxBtn.style.borderColor = this.sfxEnabled ? '#10b981' : '#ef4444';
        }
    },
    
    playMusic() {
        if(!this.musicEnabled) return;
        
        const music = document.getElementById('bg-music');
        if(music.src) {
            music.volume = this.musicVolume;
            music.play().catch(e => {
                console.log('Music autoplay prevented, will play on user interaction');
            });
        }
    },
    
    pauseMusic() {
        const music = document.getElementById('bg-music');
        music.pause();
    },
    
    play(soundName) {
        if(!this.sfxEnabled) return;
        
        const sound = document.getElementById(soundName + '-sound');
        if(sound && sound.src) {
            sound.volume = this.sfxVolume;
            sound.currentTime = 0;
            sound.play().catch(e => console.log('SFX play failed:', e));
        }
    }
};

// ==================== AUDIO UPLOAD ====================
function setupAudioUploads() {
    // Create hidden file inputs
    const audioTypes = ['bg-music', 'eat', 'collision', 'powerup', 'chat'];
    
    audioTypes.forEach(type => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.style.display = 'none';
        input.id = `upload-${type}`;
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if(file) {
                const url = URL.createObjectURL(file);
                const audio = document.getElementById(`${type}-sound`);
                audio.src = url;
                
                // Save to localStorage
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        localStorage.setItem(`cacing_audio_${type}`, e.target.result);
                        alert(`Suara ${type} berhasil diupload!`);
                    } catch(err) {
                        console.error('Failed to save audio:', err);
                        alert('File terlalu besar untuk disimpan!');
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        
        document.body.appendChild(input);
    });
    
    // Load saved audio
    audioTypes.forEach(type => {
        try {
            const saved = localStorage.getItem(`cacing_audio_${type}`);
            if(saved) {
                const audio = document.getElementById(`${type}-sound`);
                audio.src = saved;
            }
        } catch(e) {
            console.log(`No saved audio for ${type}`);
        }
    });
}

// ==================== JOYSTICK CONTROLS ====================
(function setupJoystick() {
    const joy = document.getElementById('joy-zone');
    const stick = document.getElementById('stick');
    let isDragging = false;
    let touchId = null;
    
    joy.ontouchstart = (e) => {
        if(isDragging) return;
        
        e.preventDefault();
        isDragging = true;
        touchId = e.touches[0].identifier;
        
        const rect = joy.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        
        updateStick(e.touches[0].clientX, e.touches[0].clientY, centerX, centerY);
    };
    
    joy.ontouchmove = (e) => {
        if(!isDragging) return;
        
        e.preventDefault();
        
        // Find our touch
        let touch = null;
        for(let i = 0; i < e.touches.length; i++) {
            if(e.touches[i].identifier === touchId) {
                touch = e.touches[i];
                break;
            }
        }
        
        if(!touch) return;
        
        const rect = joy.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        
        updateStick(touch.clientX, touch.clientY, centerX, centerY);
    };
    
    joy.ontouchend = joy.ontouchcancel = (e) => {
        isDragging = false;
        touchId = null;
        
        // Reset stick
        stick.style.transform = 'translate(0, 0)';
        
        if(GameState.player) {
            // Slow down gradually
            GameState.player.targetAngle = GameState.player.angle;
        }
    };
    
    function updateStick(touchX, touchY, centerX, centerY) {
        const dx = touchX - centerX;
        const dy = touchY - centerY;
        
        // Limit stick to joy-zone
        const maxDist = joy.offsetWidth/2 - stick.offsetWidth/2;
        const dist = Math.min(Math.hypot(dx, dy), maxDist);
        const angle = Math.atan2(dy, dx);
        
        // Update stick position
        stick.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
        
        // Update player angle
        if(GameState.player) {
            GameState.player.targetAngle = angle;
        }
    }
    
    // Keyboard controls for desktop
    const keys = {};
    
    document.onkeydown = (e) => {
        if(!GameState.player) return;
        
        keys[e.key.toLowerCase()] = true;
        updateKeyboardMovement();
    };
    
    document.onkeydown = (e) => {
        if(!GameState.player) return;
        
        keys[e.key.toLowerCase()] = true;
        updateKeyboardMovement();
    };
    
    document.onkeyup = (e) => {
        keys[e.key.toLowerCase()] = false;
        updateKeyboardMovement();
    };
    
    function updateKeyboardMovement() {
        if(!GameState.player) return;
        
        let angle = GameState.player.targetAngle;
        
        if(keys['arrowup'] || keys['w']) {
            angle = -Math.PI/2;
        }
        if(keys['arrowdown'] || keys['s']) {
            angle = Math.PI/2;
        }
        if(keys['arrowleft'] || keys['a']) {
            angle = Math.PI;
        }
        if(keys['arrowright'] || keys['d']) {
            angle = 0;
        }
        
        // Diagonal movement
        if((keys['arrowup'] || keys['w']) && (keys['arrowright'] || keys['d'])) {
            angle = -Math.PI/4;
        }
        if((keys['arrowup'] || keys['w']) && (keys['arrowleft'] || keys['a'])) {
            angle = -3*Math.PI/4;
        }
        if((keys['arrowdown'] || keys['s']) && (keys['arrowright'] || keys['d'])) {
            angle = Math.PI/4;
        }
        if((keys['arrowdown'] || keys['s']) && (keys['arrowleft'] || keys['a'])) {
            angle = 3*Math.PI/4;
        }
        
        GameState.player.targetAngle = angle;
    }
    
    // Power-up activation buttons
    document.addEventListener('keydown', (e) => {
        if(!GameState.player) return;
        
        if(e.key === '1' || e.key === 'q') {
            // Activate speed boost
            const result = SkinSystem.activatePower('speed');
            if(!result.success && result.message) {
                Chat.sendSystem(result.message);
            }
        }
        
        if(e.key === '2' || e.key === 'e') {
            // Activate magnet
            const result = SkinSystem.activatePower('magnet');
            if(!result.success && result.message) {
                Chat.sendSystem(result.message);
            }
        }
    });
})();

// Global functions
window.Game = Game;
window.Room = Room;
window.Shop = Shop;
window.Chat = Chat;
window.Audio = Audio;