// ==================== SKIN SYSTEM ====================
const SkinSystem = {
    // Data skin dan power-up
    skins: {
        // Skin kecepatan (Gons)
        speed_gons: {
            id: 'speed_gons',
            name: '⚡ Gons Speed',
            type: 'speed',
            icon: '⚡',
            color: '#60a5fa',
            price: 500,
            effect: {
                speedMultiplier: 1.5,
                duration: 10, // detik
                cooldown: 30
            },
            description: '+50% kecepatan untuk 10 detik'
        },
        
        speed_lightning: {
            id: 'speed_lightning',
            name: '⚡ Lightning',
            type: 'speed',
            icon: '⚡',
            color: '#fbbf24',
            price: 1000,
            effect: {
                speedMultiplier: 2.0,
                duration: 8,
                cooldown: 25
            },
            description: '+100% kecepatan untuk 8 detik'
        },
        
        speed_supersonic: {
            id: 'speed_supersonic',
            name: '⚡ Supersonic',
            type: 'speed',
            icon: '🚀',
            color: '#ef4444',
            price: 2000,
            effect: {
                speedMultiplier: 3.0,
                duration: 5,
                cooldown: 20
            },
            description: '+200% kecepatan untuk 5 detik'
        },
        
        // Skin magnet
        magnet_basic: {
            id: 'magnet_basic',
            name: '🧲 Magnet Basic',
            type: 'magnet',
            icon: '🧲',
            color: '#10b981',
            price: 300,
            effect: {
                radius: 200,
                strength: 1.0,
                duration: 15
            },
            description: 'Tarik makanan dalam radius 200px'
        },
        
        magnet_super: {
            id: 'magnet_super',
            name: '🧲 Super Magnet',
            type: 'magnet',
            icon: '🧲',
            color: '#8b5cf6',
            price: 800,
            effect: {
                radius: 350,
                strength: 1.5,
                duration: 20
            },
            description: 'Tarik makanan dalam radius 350px'
        },
        
        magnet_ultra: {
            id: 'magnet_ultra',
            name: '🧲 Ultra Magnet',
            type: 'magnet',
            icon: '🧲',
            color: '#ec4899',
            price: 1500,
            effect: {
                radius: 500,
                strength: 2.0,
                duration: 25
            },
            description: 'Tarik makanan dalam radius 500px'
        },
        
        // Skin kosmetik
        skin_default: {
            id: 'skin_default',
            name: '🐍 Default',
            type: 'cosmetic',
            icon: '🐍',
            color: '#a855f7',
            price: 0,
            description: 'Skin default'
        },
        
        skin_fire: {
            id: 'skin_fire',
            name: '🔥 Fire Snake',
            type: 'cosmetic',
            icon: '🔥',
            color: '#f97316',
            price: 400,
            description: 'Skin api yang keren'
        },
        
        skin_ice: {
            id: 'skin_ice',
            name: '❄️ Ice Snake',
            type: 'cosmetic',
            icon: '❄️',
            color: '#0ea5e9',
            price: 400,
            description: 'Skin es yang dingin'
        },
        
        skin_gold: {
            id: 'skin_gold',
            name: '💰 Golden Snake',
            type: 'cosmetic',
            icon: '💰',
            color: '#fbbf24',
            price: 1000,
            description: 'Skin emas mewah'
        },
        
        skin_rainbow: {
            id: 'skin_rainbow',
            name: '🌈 Rainbow Snake',
            type: 'cosmetic',
            icon: '🌈',
            color: 'linear-gradient(45deg, #ff0000, #ff9900, #ffff00, #00ff00, #00ffff, #0000ff, #9900ff)',
            price: 2000,
            description: 'Skin pelangi warna-warni'
        }
    },

    // Player inventory
    inventory: {
        owned: ['skin_default'], // Skin yang dimiliki
        equipped: {
            speed: null,
            magnet: null,
            cosmetic: 'skin_default'
        },
        activeEffects: {
            speed: { active: false, endTime: 0, cooldown: 0 },
            magnet: { active: false, endTime: 0 }
        }
    },

    // Initialize skin system
    init() {
        // Load from localStorage
        this.loadInventory();
        
        // Update shop display
        this.updateShop();
        
        console.log('Skin System initialized');
    },

    // Load inventory from localStorage
    loadInventory() {
        try {
            const saved = localStorage.getItem('cacing_arena_skins');
            if(saved) {
                const data = JSON.parse(saved);
                this.inventory.owned = data.owned || this.inventory.owned;
                this.inventory.equipped = data.equipped || this.inventory.equipped;
                
                // Ensure default skin is owned
                if(!this.inventory.owned.includes('skin_default')) {
                    this.inventory.owned.push('skin_default');
                }
            }
        } catch(e) {
            console.log('No saved skins found, using defaults');
        }
    },

    // Save inventory to localStorage
    saveInventory() {
        try {
            localStorage.setItem('cacing_arena_skins', JSON.stringify({
                owned: this.inventory.owned,
                equipped: this.inventory.equipped
            }));
        } catch(e) {
            console.error('Failed to save skins:', e);
        }
    },

    // Buy a skin
    buy(skinId) {
        const skin = this.skins[skinId];
        if(!skin) {
            return { success: false, message: 'Skin tidak ditemukan!' };
        }
        
        if(this.inventory.owned.includes(skinId)) {
            return { success: false, message: 'Skin sudah dimiliki!' };
        }
        
        if(GameState.coins < skin.price) {
            return { success: false, message: 'Koin tidak cukup!' };
        }
        
        // Deduct coins
        GameState.coins -= skin.price;
        this.inventory.owned.push(skinId);
        
        // Auto-equip if it's the first of its type
        if(skin.type === 'speed' && !this.inventory.equipped.speed) {
            this.equip(skinId);
        } else if(skin.type === 'magnet' && !this.inventory.equipped.magnet) {
            this.equip(skinId);
        } else if(skin.type === 'cosmetic' && skinId !== 'skin_default') {
            this.equip(skinId);
        }
        
        this.saveInventory();
        this.updateShop();
        
        // Play purchase sound
        Audio.play('powerup');
        
        return { 
            success: true, 
            message: `Berhasil membeli ${skin.name}!` 
        };
    },

    // Equip a skin
    equip(skinId) {
        const skin = this.skins[skinId];
        if(!skin || !this.inventory.owned.includes(skinId)) {
            return false;
        }
        
        switch(skin.type) {
            case 'speed':
                this.inventory.equipped.speed = skinId;
                break;
            case 'magnet':
                this.inventory.equipped.magnet = skinId;
                break;
            case 'cosmetic':
                this.inventory.equipped.cosmetic = skinId;
                break;
        }
        
        this.saveInventory();
        this.updateShop();
        
        return true;
    },

    // Get current equipped skin by type
    getEquipped(type) {
        const skinId = this.inventory.equipped[type];
        return skinId ? this.skins[skinId] : null;
    },

    // Check if effect is active
    isEffectActive(type) {
        const effect = this.inventory.activeEffects[type];
        if(!effect) return false;
        
        if(type === 'speed') {
            const now = Date.now();
            if(effect.active && now < effect.endTime) {
                return true;
            } else if(effect.active && now >= effect.endTime) {
                effect.active = false;
                return false;
            }
        } else if(type === 'magnet') {
            const now = Date.now();
            if(effect.active && now < effect.endTime) {
                return true;
            } else if(effect.active && now >= effect.endTime) {
                effect.active = false;
                return false;
            }
        }
        
        return false;
    },

    // Activate power-up
    activatePower(type) {
        const skin = this.getEquipped(type);
        if(!skin) return false;
        
        const effect = this.inventory.activeEffects[type];
        const now = Date.now();
        
        if(type === 'speed') {
            if(effect.cooldown > now) {
                return { 
                    success: false, 
                    message: `Cooldown ${Math.ceil((effect.cooldown - now)/1000)}s` 
                };
            }
            
            effect.active = true;
            effect.endTime = now + (skin.effect.duration * 1000);
            effect.cooldown = now + (skin.effect.cooldown * 1000);
            
            // Update player speed
            if(GameState.player) {
                GameState.player.applySkinEffects();
            }
            
            // Show visual effect
            document.getElementById('speed-effect').style.display = 'block';
            setTimeout(() => {
                document.getElementById('speed-effect').style.display = 'none';
            }, skin.effect.duration * 1000);
            
            Audio.play('powerup');
            
        } else if(type === 'magnet') {
            effect.active = true;
            effect.endTime = now + (skin.effect.duration * 1000);
            
            // Show visual effect
            document.getElementById('magnet-effect').style.display = 'block';
            setTimeout(() => {
                document.getElementById('magnet-effect').style.display = 'none';
            }, skin.effect.duration * 1000);
            
            Audio.play('powerup');
        }
        
        return { success: true };
    },

    // Get current speed multiplier
    getSpeedMultiplier() {
        if(!this.isEffectActive('speed')) return 1.0;
        
        const skin = this.getEquipped('speed');
        return skin ? skin.effect.speedMultiplier : 1.0;
    },

    // Get current magnet radius
    getMagnetRadius() {
        if(!this.isEffectActive('magnet')) return 0;
        
        const skin = this.getEquipped('magnet');
        return skin ? skin.effect.radius : 0;
    },

    // Get current magnet strength
    getMagnetStrength() {
        if(!this.isEffectActive('magnet')) return 0;
        
        const skin = this.getEquipped('magnet');
        return skin ? skin.effect.strength : 0;
    },

    // Get cosmetic color
    getCosmeticColor() {
        const skin = this.getEquipped('cosmetic');
        if(!skin) return '#a855f7';
        
        return skin.color;
    },

    // Update shop display
    updateShop() {
        const container = document.getElementById('shop-items');
        if(!container) return;
        
        container.innerHTML = '';
        
        // Group skins by type
        const grouped = {
            speed: [],
            magnet: [],
            cosmetic: []
        };
        
        Object.values(this.skins).forEach(skin => {
            grouped[skin.type].push(skin);
        });
        
        // Create sections
        for(const type in grouped) {
            const typeName = {
                speed: '⚡ SKIN KECEPATAN',
                magnet: '🧲 SKIN MAGNET',
                cosmetic: '🎨 SKIN KOSMETIK'
            }[type];
            
            // Section header
            const header = document.createElement('div');
            header.style.gridColumn = '1 / -1';
            header.style.textAlign = 'left';
            header.style.marginTop = '15px';
            header.style.marginBottom = '5px';
            header.style.paddingLeft = '10px';
            header.style.color = '#a855f7';
            header.style.fontWeight = 'bold';
            header.style.borderLeft = '4px solid #a855f7';
            header.textContent = typeName;
            container.appendChild(header);
            
            // Items
            grouped[type].forEach(skin => {
                const item = document.createElement('div');
                item.className = 'shop-item';
                
                const isOwned = this.inventory.owned.includes(skin.id);
                const isEquipped = 
                    (type === 'speed' && this.inventory.equipped.speed === skin.id) ||
                    (type === 'magnet' && this.inventory.equipped.magnet === skin.id) ||
                    (type === 'cosmetic' && this.inventory.equipped.cosmetic === skin.id);
                
                if(isEquipped) item.classList.add('equipped');
                if(isOwned) item.classList.add('owned');
                if(!isOwned && skin.price > GameState.coins) item.classList.add('locked');
                
                item.innerHTML = `
                    <div class="shop-icon">${skin.icon}</div>
                    <div style="font-weight:bold; margin-bottom:5px;">${skin.name}</div>
                    <div style="font-size:12px; color:#aaa; margin-bottom:10px; min-height:40px;">
                        ${skin.description}
                    </div>
                    ${!isOwned ? 
                        `<div class="shop-price">🪙 ${skin.price}</div>
                         <button onclick="SkinSystem.buySkin('${skin.id}')" 
                                 class="btn" 
                                 style="padding:8px; font-size:14px; background:${skin.price <= GameState.coins ? '#10b981' : '#6b7280'};">
                            BELI
                         </button>` :
                        `<div style="color:#10b981; font-weight:bold; margin-bottom:10px;">✅ DIMILIKI</div>
                         ${!isEquipped ? 
                            `<button onclick="SkinSystem.equipSkin('${skin.id}')" 
                                     class="btn" 
                                     style="padding:8px; font-size:14px; background:#3b82f6;">
                                PAKAI
                             </button>` :
                            `<div style="color:#f59e0b; font-weight:bold;">⭐ TERPAKAI</div>`
                         }`
                    }
                `;
                
                container.appendChild(item);
            });
        }
        
        // Update coin display
        const coinDisplay = document.getElementById('shop-coins');
        if(coinDisplay) {
            coinDisplay.textContent = GameState.coins;
        }
    },

    // Wrapper functions for HTML onclick
    buySkin(skinId) {
        const result = this.buy(skinId);
        if(result.message) {
            Shop.showMessage(result.message, result.success);
        }
    },

    equipSkin(skinId) {
        if(this.equip(skinId)) {
            Shop.showMessage('Skin berhasil dipasang!', true);
        }
    },

    // Update HUD with active effects
    updateHUD() {
        const speedBoost = document.getElementById('speed-boost');
        if(speedBoost) {
            if(this.isEffectActive('speed')) {
                const skin = this.getEquipped('speed');
                const multiplier = skin.effect.speedMultiplier;
                speedBoost.textContent = `${Math.round((multiplier - 1) * 100)}%`;
                speedBoost.style.color = '#10b981';
            } else {
                speedBoost.textContent = '0%';
                speedBoost.style.color = '';
            }
        }
    }
}; 

// Global functions for HTML
window.buySkin = (skinId) => SkinSystem.buySkin(skinId);
window.equipSkin = (skinId) => SkinSystem.equipSkin(skinId);