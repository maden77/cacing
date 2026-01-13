// ==========================================
// BOT COMBAT & WORLD BOUNDARY SYSTEM
// ==========================================

class BotProjectile {
    constructor(x, y, angle, icon, ownerId) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 10;
        this.icon = icon;
        this.ownerId = ownerId;
        this.life = 1.0;
        this.radius = 15;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life -= 0.015; // Kecepatan peluru menghilang
        return this.life > 0;
    }

    draw(ctx) {
        const screenX = this.x - GameState.cam.x + ctx.canvas.width/2;
        const screenY = this.y - GameState.cam.y + ctx.canvas.height/2;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, screenX, screenY);
        ctx.restore();
    }
}

function updateBotCombatSystem() {
    if (!GameState.active || !GameState.player) return;

    const mapRadius = CONFIG.WORLD_SIZE / 2;

    // 1. BATASAN DINDING (Player & Bot tidak bisa keluar dari lingkaran map)
    [GameState.player, ...GameState.bots].forEach(entity => {
        const dist = Math.hypot(entity.x, entity.y);
        if (dist > mapRadius) {
            const angle = Math.atan2(entity.y, entity.x);
            entity.x = Math.cos(angle) * mapRadius;
            entity.y = Math.sin(angle) * mapRadius;
            if(entity.isBot) entity.targetAngle += Math.PI; // Bot berbalik arah jika nabrak dinding
        }
    });

    // 2. LOGIKA BOT MENEMBAK PLAYER
    GameState.bots.forEach(bot => {
        if (!bot.shootTimer) bot.shootTimer = 0;
        bot.shootTimer++;

        const distToPlayer = Math.hypot(bot.x - GameState.player.x, bot.y - GameState.player.y);
        // Bot menembak jika jarak dekat (600 unit)
        if (bot.shootTimer > 150 && distToPlayer < 600) {
            const angle = Math.atan2(GameState.player.y - bot.y, GameState.player.x - bot.x);
            const icon = CONFIG.FOOD_ICONS[Math.floor(Math.random() * CONFIG.FOOD_ICONS.length)];
            GameState.projectiles.push(new BotProjectile(bot.x, bot.y, angle, icon, bot.id));
            bot.shootTimer = 0;
        }
    });

    // 3. CEK TABRAKAN PELURU (SKOR BERKURANG)
    if (GameState.projectiles) {
        GameState.projectiles = GameState.projectiles.filter(proj => {
            const alive = proj.update();
            const distToPlayer = Math.hypot(proj.x - GameState.player.x, proj.y - GameState.player.y);
            
            // Jika Player kena peluru bot
            if (distToPlayer < CONFIG.PLAYER_SIZE + proj.radius) {
                GameState.player.score = Math.max(0, GameState.player.score - 10); // Skor berkurang 10
                
                // Panggil popup efek jika fungsi tersedia
                if (window.Game && Game.createScorePopup) {
                    Game.createScorePopup(GameState.player.x, GameState.player.y, "-10 TERKENA!", "#ff0000");
                }
                return false; 
            }
            return alive;
        });
    }
}

function drawBotProjectiles(ctx) {
    if (GameState.projectiles && GameState.projectiles.length > 0) {
        GameState.projectiles.forEach(p => p.draw(ctx));
    }
}
