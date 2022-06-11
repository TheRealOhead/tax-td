let c = document.getElementById('game');
let ctx = c.getContext('2d');



// Disable context menu on the game canvas
c.oncontextmenu = () => {
	return false;
};

c.width = 800;
c.height = 400;

function isPointInBox(point,boxPos,boxSize) {
	if (boxPos.x < point.x && boxPos.y < point.y &&
		boxPos.x + boxSize.x > point.x && boxPos.y + boxSize.y > point.y) {
		return true;
	};
	return false;
};

class Vector2 {
	constructor(x,y) {
		this.x = x;
		this.y = y;
	}
}

class Sound {
	constructor(file) {
		this.audio = new Audio();
		this.audio.src = 'sounds/'+file;
	}
	play() {
		this.audio.cloneNode(true).play();
	}
}

class Img {
	constructor(file) {
		this.image = new Image();
		this.image.src = 'img/'+file;
		this.image.style.imageRendering = 'pixelated';
	}
}

let linesToDraw = [];

class Line {
	constructor(p1,p2,color) {
		this.p1 = p1;
		this.p2 = p2;
		this.color = color;

		linesToDraw.push(this);
	}

	render() {
		ctx.strokeStyle = this.color;

		ctx.beginPath();
		ctx.moveTo(this.p1.x,this.p1.y);
		ctx.lineTo(this.p2.x,this.p2.y);
		ctx.stroke();
	}
}

let sounds = {
	'pistolShot':new Sound('shot.wav'),
	'pistolReload':new Sound('reload.wav'),
	'explosion':new Sound('explosion.wav'),
	'minePlace':new Sound('minePlace.wav'),
	'deny':new Sound('deny.wav'),
	'aoe':new Sound('aoe.wav'),
	'bunkerReload':new Sound('bunkerReload.wav')
}


// Preloading images to avoid flicker and lag
let images = {
	'agent0':new Img('agent/walk0.png'),
	'agent1':new Img('agent/walk1.png'),
	
	'tank0':new Img('tank/walk0.png'),

	'bot0':new Img('microbot/walk0.png'),
	'bot1':new Img('microbot/walk1.png'),

	'mineOff':new Img('mine/off.png'),
	'mineOn':new Img('mine/on.png'),

	'explosion0':new Img('explosion/0.png'),
	'explosion1':new Img('explosion/1.png'),

	'aoe0':new Img('aoe/0.png'),

	'bunker0':new Img('bunker/0.png'),

	'camo0':new Img('camo/walk0.png'),
	'camo1':new Img('camo/walk1.png'),

	'camoTank0':new Img('camoTank/walk0.png'),
	
	'bg':new Img('bg.png'),
	'crosshair':new Img('crosshair.png'),

	'missing':new Img('missing.png'),

	getImage(imageName) {
		if (images.hasOwnProperty(imageName)) {
			return images[imageName];
		};
		console.warn(`Unknown image: "${imageName}"`);
		return images['missing'];
	}
}

  ////////////
 // TOWERS //
////////////
let towers = [];
class Tower {
	static renderSettings = {
		frames:['missing'],
		timer:0,
		frame:0,
		delay:10,
		healthBarHeight:6
	};

	static stats = {
		size:new Vector2(16,16),
		cost:0
	}

	constructor() {
		this.pos = new Vector2(player.cursorPos.x,player.cursorPos.y);

		// A tower marked for death is removed on the next update
		this.markedForDeath = false;

		this.renderSettings = structuredClone(this.constructor.renderSettings); // Copy render settings from static variable
		this.size = structuredClone(this.constructor.stats.size); // Copy size from static variable

		this.specialUpdates = [];

		towers.push(this);
	}

	// Moves the tower so that its center is where its technical position used to be, to make cursor placement mor seamless
	moveAccordingToSize() {
		this.pos = new Vector2(this.pos.x-this.size.x/2,this.pos.y-this.size.y/2)
	}

	// Returns the center of the tower for stuff like distance calculation
	getCenter() {
		return new Vector2(this.pos.x + this.size.x / 2,this.pos.y + this.size.y / 2);
	}

	render() {
		// Handle animations
		this.renderSettings.timer = (this.renderSettings.timer + 1) % this.renderSettings.delay;
		if (!this.renderSettings.timer)
			this.renderSettings.frame = (this.renderSettings.frame + 1) % this.renderSettings.frames.length;

		// Draw current frame
		ctx.drawImage(images.getImage(this.renderSettings.frames[this.renderSettings.frame]).image, this.pos.x, this.pos.y, this.size.x, this.size.y);
	}

	update() {
		this.specialUpdates.forEach(f=>{
			f();
		});
	}
}

class LandMine extends Tower {
	static renderSettings = {
		frames:['mineOff','mineOff','mineOff','mineOff','mineOff','mineOn','mineOff','mineOn'],
		timer:0,
		frame:0,
		delay:5
	}

	static stats = {
		size:new Vector2(8,8),
		cost:25
	}

	constructor() {
		super();

		this.moveAccordingToSize();

		sounds['minePlace'].play();


		// Explosion code
		this.specialUpdates.push(()=>{
			let explode = false;
			enemies.forEach(e=>{
				if (isPointInBox(this.getCenter(),e.pos,e.size)) {
					explode = true;
				};
			});
			if (explode) {
				new Explosion(this.pos);
				this.markedForDeath = true;
			};
		});

	}
}

class Explosion extends Tower {

	static renderSettings = {
		frames:['explosion0','explosion1'],
		timer:0,
		frame:0,
		delay:5
	};

	static stats = {
		size:new Vector2(64,64)
	}

	constructor(pos,power) {
		super();

		// Set position to custom position
		pos ? this.pos = pos : '';
		if (power != undefined) {
			this.power = power;
		} else {
			this.power = 40;
		};

		this.moveAccordingToSize();

		this.despawnTimer = 8;

		this.specialUpdates.push(()=>{
			this.despawnTimer--;
			if (this.despawnTimer <= 0) {
				this.markedForDeath = true;
			};
		});

		// Damage enemies
		enemies.forEach(e=>{
			let dist = Math.sqrt((e.getCenter().x-this.getCenter().x) ** 2 + (e.getCenter().y-this.getCenter().y) ** 2)
			if (dist < this.power) {
				e.damage(40,'explosive');
			}
		});

		sounds['explosion'].play();
	}
}

class AOE extends Tower {
	constructor() {
		super();
		this.moveAccordingToSize();


		this.specialUpdates.push(()=>{
			// Damage enemies
			let doTheSound = false;
			enemies.forEach(e=>{
				let dist = Math.sqrt((e.getCenter().x-this.getCenter().x) ** 2 + (e.getCenter().y-this.getCenter().y) ** 2);
				if (dist < 160) {
					doTheSound = true;
					new Line(new Vector2(this.pos.x + 8,this.pos.y + 6),e.getCenter(),'#00fffb'); // Draw line from orb to enemy
					e.damage(.05,'magic');
				};
			});
			if (doTheSound) sounds['aoe'].play();
		});
	}

	static renderSettings = {
		frames:['aoe0'],
		timer:0,
		frame:0,
		delay:99999 // No real point in putting effort into animating it
	};

	static stats = {
		size:new Vector2(16,32),
		cost:80
	}
}

class Bunker extends Tower {
	constructor() {
		super();
		this.moveAccordingToSize();

		this.cooldown = 0;

		this.specialUpdates.push(()=>{
			
			let closestEnemy = null;
			let closestEnemyDist = Infinity;

			enemies.forEach(e=>{
				let dist = Math.sqrt((e.getCenter().x-this.getCenter().x) ** 2 + (e.getCenter().y-this.getCenter().y) ** 2);
				if (dist < closestEnemyDist) {
					closestEnemy = e;
					closestEnemyDist = dist;
				};	
			});

			if (closestEnemyDist < 360 && this.cooldown > 40 && !closestEnemy.stats.untargetable) {
				sounds['pistolShot'].play();
				closestEnemy.damage(20,'physical');
				new Line(this.getCenter(),closestEnemy.getCenter(),'#b05f00');
				this.cooldown = 0;
			};
			
			if (this.cooldown == 5) sounds['bunkerReload'].play();
			
			this.cooldown++
		});
	}

	static renderSettings = {
		frames:['bunker0'],
		timer:0,
		frame:0,
		delay:99999 // No real point in putting effort into animating it
	};

	static stats = {
		size:new Vector2(32,32),
		cost:150
	}
}




  /////////////
 // ENEMIES //
/////////////
let enemies = [];
class Enemy {
	ondie() {

	}

	damage(amount, type) {
		if (Object.keys(this.stats.resistances).includes(type)) {
			amount *= this.stats.resistances[type];
			console.log('Resisted damage down to ' + this.stats.resistances[type] + '%!');
		} else {
			console.log('Didn\'t resist shit!');
		};
		this.stats.health -= amount;
	}

	constructor() {
		this.pos = new Vector2(0,Math.random() * c.height * .95);
		this.size = new Vector2(16,16);

		this.stats = {
			speed:1,
			maxHealth:9999,
			health:9999,
			money:-1,
			resistances:{}
		}
		

		this.renderSettings = {
			frames:['missing'],
			timer:0,
			frame:0,
			delay:10,
			healthBarHeight:6
		};

		this.specialUpdates = [];

		enemies.push(this);
	}

	getCenter() {
		return new Vector2(this.pos.x + this.size.x / 2,this.pos.y + this.size.y / 2);
	}

	render() {
		// Handle animations
		this.renderSettings.timer = (this.renderSettings.timer + 1) % this.renderSettings.delay;
		if (!this.renderSettings.timer)
			this.renderSettings.frame = (this.renderSettings.frame + 1) % this.renderSettings.frames.length;

		// Draw current frame
		ctx.drawImage(images[this.renderSettings.frames[this.renderSettings.frame]].image, this.pos.x, this.pos.y, this.size.x, this.size.y);

		// Draw health bar
		ctx.fillStyle = '#0f0';
		ctx.fillRect(this.pos.x,this.pos.y + this.size.y,Math.max(0,(this.stats.health / this.stats.maxHealth) * this.size.x),this.renderSettings.healthBarHeight);
	}

	update() {
		this.pos.x += this.stats.speed;


		// Keep self in bounds
		if (this.pos.y < 0) {
			this.pos.y = 0;
		};
		if (this.pos.y > c.height - this.size.y) {
			this.pos.y = c.height - this.size.y;
		};


		this.specialUpdates.forEach(f=>{
			f();
		});

		if (this.stats.health <= 0) {
			this.ondie();
		};
	}
}

class Agent extends Enemy {
	constructor() {
		super();
		Object.assign(this.stats,{
			speed:1,
			maxHealth:10,
			health:10,
			money:5
		})
		this.size = new Vector2(16,16);
		this.renderSettings.frames = [
			'agent0',
			'agent1'
		]
	}
}

class AgileAgent extends Agent {
	constructor() {
		super();
		this.stats.speed  = 1.4;
		this.specialUpdates.push(()=>{
			// Run from crosshair
			if (Math.sqrt((this.getCenter().x-player.cursorPos.x) ** 2 + (this.getCenter().y-player.cursorPos.y) ** 2) < 50) {
				if (this.getCenter().y > player.cursorPos.y) {
					this.pos.y += this.stats.speed * .5;
				} else {
					this.pos.y -= this.stats.speed * .5;
				};
			};
		});
	}
}

class Tank extends Enemy {
	ondie() {
		new Explosion(this.getCenter());
	}

	constructor() {
		super();
		Object.assign(this.stats,{
			speed:.33,
			maxHealth:100,
			health:100,
			money:40
		})
		this.stats.resistances['physical'] = .75;
		this.stats.resistances['explosive'] = .50;
		this.size = new Vector2(64,32);
		this.renderSettings.frames = [
			'tank0'
		]
	}
}

class Microbot extends Enemy {
	constructor() {
		super();
		Object.assign(this.stats,{
			speed:2,
			maxHealth:5,
			health:5,
			money:1
		});
		this.size = new Vector2(8,8);
		this.renderSettings.frames = [
			'bot0',
			'bot1'
		]
	}
}

class Camo extends Agent {
	constructor() {
		super();
		Object.assign(this.stats,{
			speed:1.5,
			maxHealth:18,
			health:18,
			money:10,
			untargetable:true
		});
		
		this.renderSettings.frames = ['camo0','camo1']
	}
}

class CamoTank extends Tank {
	constructor() {
		super();
		Object.assign(this.stats,{
			speed:.5,
			maxHealth:125,
			health:125,
			money:75,
			untargetable:true
		});
		this.renderSettings.frames = [
			'camoTank0'
		]
	}
}



  ///////////
 // WAVES //
///////////
class Wave {
	constructor(enemies,options) {
		this.list = [];

		// Fill list with enemy names
		Object.keys(enemies).forEach(type=>{
			for (let i = 0; i < enemies[type]; i++) {
				this.list.push(type);
			};
		});

		// Shuffle list
		for (let i = 0; i < this.list.length * 100; i++) {
			this.list.push(this.list.splice(Math.floor(Math.random() * this.list.length),1)[0]);
		};

		this.options = options;
	}
	nextEnemy() {
		return eval(`new ${this.list.pop()}()`);
	}
	enemiesLeft() {
		return this.list.length != 0;
	}
}

// Advance to next wave
document.addEventListener('keydown',e=>{
	if (e.key == ' ' && player.gamestate == 'betweenWaves') {
		player.gamestate = 'active';
		player.currentWave++;
	};
});

let waves = [
	new Wave({
		'Enemy':250
	},{
		interval:1
	}),

	new Wave({
		'Agent':2
	},
	{
		interval:20
	}),

	new Wave({
		'Agent':8,
		'AgileAgent':6
	},
	{
		interval:5
	}),

	new Wave({
		'Microbot':4,
		'Tank':1,
		'AgileAgent':2,
		'Agent':4
	},{
		interval:8
	}),

	new Wave({
		'Microbot':6,
		'Tank':3,
		'AgileAgent':3,
		'Agent':8
	},{
		interval:8
	}),

	new Wave({
		'Microbot':6,
		'Tank':3,
		'AgileAgent':5,
		'Agent':14
	},{
		interval:8
	}),

	new Wave({
		'Microbot':20,
		'Tank':4,
		'AgileAgent':10,
		'Agent':5
	},{
		interval:8
	}),

	new Wave({
		'Microbot':22,
		'Tank':3,
		'AgileAgent':6,
		'Agent':2,
		'Camo':10,
		'CamoTank':2
	},{
		interval:8
	}),

	new Wave({
		'Tank':20
	},{
		interval:15
	})
];




  /////////////////
 // PROJECTILES //
/////////////////

class Projectile extends Tower {
	constructor() {
		super();
	}
}

class Bomb extends Projectile {
	constructor() {
		super();



		this.moveAccordingToSize();
	}
}





  ////////////
 // PLAYER //
////////////
c.addEventListener('mousemove',e=>{
	player.cursorPos = new Vector2(e.offsetX,e.offsetY);
});
let player = {
	damage:5,
	maxBullets:8,
	bullets:8,
	shotTimer:0,
	shotCooldown:6,
	reloadTimer:0,
	reloadCooldown:18,
	cursorPos:new Vector2(0,0),
	currentWave:0,
	money:0,
	buyableTowers:[
		'LandMine',
		'AOE',
		'Bunker'
	],
	selectedTower:0,
	tooltip:{
		text:'Gamer',
		color:'#f00',
		timer:0,
		set(text,color,timer) {
			this.text = text;
			this.color = color;
			this.timer = timer;
		},
		draw() {
			if (this.timer > 0) {
				this.timer--;
				ctx.textBaseline = 'hanging';
				ctx.textAlign = 'left';
				ctx.fillStyle = this.color;
				ctx.fillText(this.text,player.cursorPos.x + 5,player.cursorPos.y + 5);
				ctx.textBaseline = 'alphabetic';
			};
		}
	},


	gamestate:'betweenWaves'
	/*
		betweenWaves
		active
		gameOver
	*/
}

// Switch selected tower
function changeTower(n) {
	n += player.buyableTowers.length;
	player.selectedTower = (player.selectedTower + n) % player.buyableTowers.length;
};
document.addEventListener('keydown',e=>{
	if (e.key == 'ArrowLeft') changeTower(1);
	if (e.key == 'ArrowRight') changeTower(-1);
});
document.addEventListener('wheel',e=>{
	if (e.deltaY > 0) changeTower(1);
	if (e.deltaY < 0) changeTower(-1);
})


// Mouse actions
c.addEventListener('mousedown',e=>{
	// Shoot
	if (e.button == 0) {
		if (player.shotTimer == 0 && player.reloadTimer == 0 && player.bullets > 0) {
			sounds['pistolShot'].play();
			player.shotTimer = player.shotCooldown;
			player.bullets--;

			// Damage enemies under the crosshair
			enemies.forEach(enemy=>{
				if (isPointInBox(player.cursorPos,enemy.pos,enemy.size)) {
					enemy.damage(player.damage,'physical');
				};

			});

			// Reload
			if (player.bullets == 0) {
				player.reloadTimer = player.reloadCooldown;
				sounds['pistolReload'].play();
			};
		};
	};


	// Place tower
	if (e.button == 2) {
		let towerClass = eval(player.buyableTowers[player.selectedTower]);

		if (towerClass.stats.cost <= player.money) { // Can afford
			player.money -= towerClass.stats.cost; // Charge player
			new towerClass(); // Make the tower as promised
		} else { // Can't afford
			sounds['deny'].play();
			player.tooltip.set('Too expensive!','#f55',50);
		};
	};
});





  ////////////
 // RENDER //
////////////
function render() {

	// Draw da ground
	ctx.drawImage(images['bg'].image,0,0,c.width,c.height);

	// Render all enemies
	enemies.forEach(e=>{
		e.render();
	});

	// Render all towers
	towers.forEach(e=>{
		e.render();
	});

	// Render lines
	while (linesToDraw.length > 0) {
		linesToDraw.pop().render();
	};





	// Draw bullet count
	ctx.fillStyle = '#000';
	ctx.font = '36px monospace';
	ctx.textAlign = 'right';
	ctx.fillText(player.bullets, c.width - 20, c.height - 20);


	// Draw money count
	ctx.fillStyle = '#0d0';
	ctx.font = '36px monospace';
	ctx.textAlign = 'left';
	ctx.fillText('$' + player.money, 20, c.height - 20);


	// Draw next wave text if needed
	if (player.gamestate == 'betweenWaves') {
		ctx.fillStyle = '#000';
		ctx.font = '16px monospace';
		ctx.textAlign = 'center';
		ctx.fillText(`Press SPACE to start Wave ${player.currentWave + 1}`, c.width / 2, c.height - 20);
	};



	// Draw selected tower in the corner
	let towerClass = eval(player.buyableTowers[player.selectedTower]);
	let bigImage = images.getImage(towerClass.renderSettings.frames[0]).image;
	bigImage.width = towerClass.stats.style * 2;
	bigImage.height = towerClass.stats.style * 2;
	ctx.webkitImageSmoothingEnabled = false;
	ctx.mozImageSmoothingEnabled = false;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(bigImage,c.width - towerClass.stats.size.x * 2 - 10,10,towerClass.stats.size.x * 2, towerClass.stats.size.y * 2);


	// Draw crosshair
	ctx.drawImage(images['crosshair'].image,player.cursorPos.x - images['crosshair'].image.width / 2,player.cursorPos.y - images['crosshair'].image.height / 2);
	
	// Draw tooltip
	player.tooltip.draw();



	requestAnimationFrame(render);
};
render();





  /////////////
 // UPDATES //
/////////////
let updateCounter = 0;
function update() {
	

	// Update all towers
	towers.forEach(e=>{
		e.update();
	});

	// Step gun cooldown timer
	if (player.shotTimer > 0)
		player.shotTimer--;

	// Step reload timer
	if (player.reloadTimer > 0) {
		player.reloadTimer--;
		if (!player.reloadTimer) {
			player.bullets = player.maxBullets;
		};
	}

	// Update all enemies
	enemies.forEach(e=>{
		e.update();
	});

	// Kill enemies that have health zero or lower
	// This is important to do BEFORE the enemy updates because if an enemy is about to die, it needs a chance to run its ondie function
	for (let i = enemies.length - 1; i >= 0; i--) {
		let e = enemies[i];
		if (enemies[i].stats.health <= 0) {
			player.money += e.stats.money;
			enemies.splice(i,1);
		};
	};


	// Get rid of towers marked for death
	for (let i = towers.length - 1; i >= 0; i--) {
		let e = towers[i];
		if (towers[i].markedForDeath) {
			towers.splice(i,1);
		};
	};

	// Spawn enemies from current wave
	let wave = waves[player.currentWave];
	if (player.gamestate == 'active' && updateCounter % wave.options.interval == 0) {
		if (wave.enemiesLeft()) {
			wave.nextEnemy();
		} else {
			if (enemies.length == 0) {
				player.gamestate = 'betweenWaves';
			};
		};
	};


	// Fill bullets automatically between waves
	if (player.gamestate == 'betweenWaves') {
		player.bullets = player.maxBullets;
	};


	updateCounter++;
};
setInterval(update,50);

























function I_Am_A_Dirty_Dirty_Cheater_And_I_Hack_In_All_The_Money() {
	player.money += 999999;
};