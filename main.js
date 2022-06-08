let c = document.getElementById('game');
let ctx = c.getContext('2d');

c.width = 800;
c.height = 400;

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
	}
}

let sounds = {
	'pistolShot':new Sound('shot.wav'),
	'pistolReload':new Sound('reload.wav')
}

let images = {
	'agent0':new Img('agent/walk0.png'),
	'agent1':new Img('agent/walk1.png'),
	
	'tank0':new Img('tank/walk0.png'),

	'bot0':new Img('microbot/walk0.png'),
	'bot1':new Img('microbot/walk1.png'),
	
	'bg':new Img('bg.png'),
	'crosshair':new Img('crosshair.png'),

	'missing':new Img('missing.png')
}





  /////////////
 // ENEMIES //
/////////////
let enemies = [];
class Enemy {
	constructor() {
		this.pos = new Vector2(0,Math.random() * c.height * .95);
		this.size = new Vector2(16,16);


		this.stats = {
			speed:1,
			maxHealth:10,
			health:10,
			money:-1
		}
		

		this.renderSettings = {
			frames:['missing'],
			timer:0,
			frame:0,
			delay:10,
			healthBarHeight:6
		};

		enemies.push(this);
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
		ctx.fillRect(this.pos.x,this.pos.y + this.size.y,(this.stats.health / this.stats.maxHealth) * this.size.x,this.renderSettings.healthBarHeight);
	}

	update() {
		this.pos.x += this.stats.speed;
	}
}

class Agent extends Enemy {
	constructor() {
		super();
		this.stats = {
			speed:1,
			maxHealth:10,
			health:10,
			money:5
		}
		this.size = new Vector2(16,16);
		this.renderSettings.frames = [
			'agent0',
			'agent1'
		]
	}
}


class Tank extends Enemy {
	constructor() {
		super();
		this.stats = {
			speed:.15,
			maxHealth:100,
			health:100,
			money:40
		}
		this.size = new Vector2(64,32);
		this.renderSettings.frames = [
			'tank0'
		]
	}
}



class Microbot extends Enemy {
	constructor() {
		super();
		this.stats = {
			speed:2,
			maxHealth:5,
			health:5,
			money:1
		}
		this.size = new Vector2(8,8);
		this.renderSettings.frames = [
			'bot0',
			'bot1'
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
		'Enemy':99
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
		'Agent':8
	},
	{
		interval:40
	})
];





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
	money:100,


	gamestate:'betweenWaves'
	/*
		betweenWaves
		active
		gameOver
	*/
}
c.addEventListener('mousedown',e=>{
	// Shoot
	if (player.shotTimer == 0 && player.reloadTimer == 0 && player.bullets > 0) {
		sounds['pistolShot'].play();
		player.shotTimer = player.shotCooldown;
		player.bullets--;

		// Damage enemies under the crosshair
		enemies.forEach(enemy=>{
			if (enemy.pos.x < player.cursorPos.x && enemy.pos.y < player.cursorPos.y &&
				enemy.pos.x + enemy.size.x > player.cursorPos.x && enemy.pos.y + enemy.size.y > player.cursorPos.y) {
				enemy.stats.health -= player.damage;
			};
		});

		// Reload
		if (player.bullets == 0) {
			player.reloadTimer = player.reloadCooldown;
			sounds['pistolReload'].play();
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


	// Draw crosshair
	ctx.drawImage(images['crosshair'].image,player.cursorPos.x - images['crosshair'].image.width / 2,player.cursorPos.y - images['crosshair'].image.height / 2);



	requestAnimationFrame(render);
};
render();





  /////////////
 // UPDATES //
/////////////
let updateCounter = 0;
function update() {
	// Update all enemies
	enemies.forEach(e=>{
		e.update();
	});

	// Step cooldown timer
	if (player.shotTimer > 0)
		player.shotTimer--;

	// Step reload timer
	if (player.reloadTimer > 0) {
		player.reloadTimer--;
		if (!player.reloadTimer) {
			player.bullets = player.maxBullets;
		};
	}

	// Kill enemmies that have health zero or lower
	for (let i = enemies.length - 1; i >= 0; i--) {
		let e = enemies[i];
		if (enemies[i].stats.health <= 0) {
			player.money += e.stats.money;
			enemies.splice(i,1);
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





	updateCounter++;
};
setInterval(update,50);