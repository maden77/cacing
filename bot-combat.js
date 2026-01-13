// ==========================================
// BOT COMBAT SYSTEM (MODUL TERPISAH)
// ==========================================

// Hanya inisialisasi jika belum ada
if (typeof GameState !== 'undefined' && !GameState.projectiles) {
    GameState.projectiles = [];
}

// Hanya definisikan jika belum ada
if (typeof BotProjectile === 'undefined') {
    class BotProjectile {
        constructor(x, y, angle, icon) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.speed = 8;
            this.icon = icon;
            this.life = 1.0;
            this.radius = 12;
        }

        update() {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.life -= 0.01;
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
}

// Fungsi untuk integrasi dengan game loop
function updateBotCombatSystem() {
    if (!GameState.active || !GameState.player) return;

    // A. Logika Bot Menembak (hanya untuk bot yang belum ada logika tembak)
    GameState.bots.forEach(bot => {
        if (!bot.hasShootLogic) {
            if (!bot.shootTimer) bot.shootTimer = 0;
            bot.shootTimer++;

            if (bot.shootTimer > 200) {
                const dist = Math.hypot(bot.x - GameState.player.x, bot.y - GameState.player.y);
                if (dist < 600) {
                    const angle = Math.atan2(GameState.player.y - bot.y, GameState.player.x - bot.x);
                    const randomIcon = CONFIG.FOOD_ICONS[Math.floor(Math.random() * CONFIG.FOOD_ICONS.length)];
                    
                    if (typeof BotProjectile !== 'undefined') {
                        GameState.projectiles.push(new BotProjectile(bot.x, bot.y, angle, randomIcon));
                    }
                    bot.shootTimer = 0;
                }
            }
        }
    });

    // B. Logika Peluru Mengenai Player (backup)
    if (GameState.projectiles) {
        GameState.projectiles = GameState.projectiles.filter(proj => {
            const alive = proj.update();
            const dist = Math.hypot(proj.x - GameState.player.x, proj.y - GameState.player.y);
            
            if (dist < CONFIG.PLAYER_SIZE + proj.radius) {
                // EFEK TERKENA: Kurangi Skor
                GameState.player.score = Math.max(0, GameState.player.score - 10);
                
                // Panggil popup merah
                if (typeof Game !== 'undefined' && typeof Game.createScorePopup === 'function') {
                    Game.createScorePopup(GameState.player.x, GameState.player.y, "-10 TERKENA!", "#ff0000");
                }
                
                // Play sound
                if (typeof Audio !== 'undefined') {
                    Audio.play('collision');
                }
                return false;
            }
            return alive;
        });
    }
}

// Fungsi Render Peluru
function drawBotProjectiles(ctx) {
    if (GameState.projectiles) {
        GameState.projectiles.forEach(p => p.draw(ctx));
    }
}