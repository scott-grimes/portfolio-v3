import Bullet from './actors/bullet';
import Food from './actors/food';
import Portal from './actors/portal';
import Worm from './actors/worm';
import Config from './config';
import EventBus from './lib/event-bus';
import Vector from './lib/vector';
import Direction from './lib/direction';
import Canvas from './lib/canvas';

function createNewGameState() {
	return {
		actors: {
			worm: new Worm(),
			food: new Food(),
			bullets: [],
			portal1: new Portal(new Vector(), Direction.RIGHT, Config.portal.color1),
			portal2: new Portal(new Vector(), Direction.LEFT, Config.portal.color2)
		},
		score: 0,
		shouldTween: false,
		lastUpdateTs: 0,
		isEnded: false
	};
}

function doCollisions(state) {
	const {worm, bullets, food, portal1, portal2} = state.actors;

	if (worm.isColliding(food)) {
		EventBus.emit('food_eaten');
	}

	if (worm.isColliding(portal1)) {
		worm.teleport(portal1, portal2);
	} else if (worm.isColliding(portal2)) {
		worm.teleport(portal2, portal1);
	}

	// remove offscreen bullets
	state.actors.bullets = bullets.reduce((acc, bullet) => {
		if (!bullet.shouldRemove) {
			acc.push(bullet);
		}
		return acc;
	}, []);
}

function update(state) {
	for (const actorKey in state.actors) {
		const actor = state.actors[actorKey];
		if (Array.isArray(actor)) {
			actor.forEach((e) => e.update());
		} else {
			actor.update();
		}
	}
	state.shouldTween = !state.shouldTween;
}

function render(state) {
	//console.log(state);
	const ctx = Canvas.context;
	ctx.fillStyle = Config.scene.color;
	ctx.fillRect(0, 0, Canvas.clientWidth, Canvas.clientHeight);

	for (const actorKey in state.actors) {
		const actor = state.actors[actorKey];
		if (Array.isArray(actor)) {
			actor.forEach((e) => e.draw());
		} else {
			actor.draw();
		}
	}

	// draw score
	ctx.fillStyle = Config.score.color;
	ctx.font = Config.score.font;
	ctx.textBaseline = 'hanging';
	ctx.fillText(state.score, 0, 0);
}

function doGameLoop(state, frameTs = 0) {
	if (frameTs - state.lastUpdateTs >= Config.scene.updateStep) {
		update(state);
		doCollisions(state);
		render(state);
		state.lastUpdateTs = frameTs;
	}

	if (!state.isEnded) {
		window.requestAnimationFrame((frameTs) => doGameLoop(state, frameTs));
	}
}

export default function Game(canvas) {
	Canvas.load(canvas);

	const handlePlayerInput = function(e) {
		const {bullets, worm} = this.state.actors;

		switch (e.keyCode) {
			case Config.controls.quit:
				this.quit();
				break;
			case Config.controls.left:
				worm.setDir(Direction.LEFT);
				break;
			case Config.controls.up:
				worm.setDir(Direction.UP);
				break;
			case Config.controls.right:
				worm.setDir(Direction.RIGHT);
				break;
			case Config.controls.down:
				worm.setDir(Direction.DOWN);
				break;
			case Config.controls.fire1:
				if (worm.canShoot) {
					bullets.push(
						new Bullet(worm.head.pos, worm.dir, Config.portal.color1)
					);
				}
				break;
			case Config.controls.fire2:
				if (worm.canShoot) {
					bullets.push(
						new Bullet(worm.head.pos, worm.dir, Config.portal.color2)
					);
				}
				break;
			default:
				break;
		}
	};

	return {
		state: {},

		start() {
			window.addEventListener('keydown', handlePlayerInput.bind(this));
			this.state = createNewGameState();
			EventBus.on('food_eaten', () => { this.state.score += 10; });
			doGameLoop(this.state);
		},

		end() {
			window.removeEventListener('keydown', handlePlayerInput.bind(this));
			EventBus.clear();
			this.state.isEnded = true;
		}
	};
}
